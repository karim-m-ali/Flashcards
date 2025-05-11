import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Alert,
  Image,
  Modal,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppContext } from '../App';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import * as FileSystem from 'expo-file-system';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

// Function to perform histogram equalization on image
const histogramEqualization = async (imageUri) => {
  try {
    // Step 1: Read the image file as base64
    const base64 = await FileSystem.readAsStringAsync(imageUri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    
    // Step 2: Create a temporary HTML file to process the image
    const htmlContent = `
      <html>
        <head>
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <canvas id="canvas" style="display:none;"></canvas>
          <script>
            function processImage() {
              return new Promise((resolve, reject) => {
                try {
                  const img = new Image();
                  img.onload = function() {
                    const canvas = document.getElementById('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Set canvas dimensions
                    canvas.width = img.width;
                    canvas.height = img.height;
                    
                    // Draw the image on canvas
                    ctx.drawImage(img, 0, 0);
                    
                    // Get image data
                    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                    const data = imageData.data;
                    const width = canvas.width;
                    const height = canvas.height;
                    
                    // Extract RGB channels
                    const red = new Array(width * height);
                    const green = new Array(width * height);
                    const blue = new Array(width * height);
                    
                    for (let i = 0; i < width * height; i++) {
                      red[i] = data[i * 4];
                      green[i] = data[i * 4 + 1];
                      blue[i] = data[i * 4 + 2];
                    }
                    
                    // Calculate histogram for each channel
                    const calculateHistogram = (channel) => {
                      const histogram = new Array(256).fill(0);
                      for (let i = 0; i < channel.length; i++) {
                        histogram[channel[i]]++;
                      }
                      return histogram;
                    };
                    
                    const redHistogram = calculateHistogram(red);
                    const greenHistogram = calculateHistogram(green);
                    const blueHistogram = calculateHistogram(blue);
                    
                    // Calculate cumulative distribution function (CDF)
                    const calculateCDF = (histogram) => {
                      const cdf = new Array(256).fill(0);
                      cdf[0] = histogram[0];
                      
                      for (let i = 1; i < 256; i++) {
                        cdf[i] = cdf[i - 1] + histogram[i];
                      }
                      
                      // Normalize CDF to range 0-255
                      const factor = 255 / (width * height);
                      for (let i = 0; i < 256; i++) {
                        cdf[i] = Math.round(cdf[i] * factor);
                      }
                      
                      return cdf;
                    };
                    
                    const redCDF = calculateCDF(redHistogram);
                    const greenCDF = calculateCDF(greenHistogram);
                    const blueCDF = calculateCDF(blueHistogram);
                    
                    // Apply equalization mapping to each pixel
                    for (let i = 0; i < width * height; i++) {
                      data[i * 4] = redCDF[red[i]];
                      data[i * 4 + 1] = greenCDF[green[i]];
                      data[i * 4 + 2] = blueCDF[blue[i]];
                      // Alpha channel remains unchanged
                    }
                    
                    // Put the enhanced data back
                    ctx.putImageData(imageData, 0, 0);
                    
                    // Return the enhanced image as base64
                    resolve(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
                  };
                  
                  img.onerror = function(e) {
                    reject('Image loading error: ' + e);
                  };
                  
                  // Load the image
                  img.src = 'data:image/jpeg;base64,${base64}';
                } catch (error) {
                  reject('Processing error: ' + error.message);
                }
              });
            }
            
            // Execute and send back result
            processImage()
              .then(result => {
                window.ReactNativeWebView.postMessage(result);
              })
              .catch(error => {
                window.ReactNativeWebView.postMessage('ERROR:' + error);
              });
          </script>
        </body>
      </html>
    `;
    
    // Step 3: Save HTML to a temp file
    const tempHtmlPath = `${FileSystem.cacheDirectory}temp_process.html`;
    await FileSystem.writeAsStringAsync(tempHtmlPath, htmlContent);
    
    // Step 4: Use WebView to process the image (note: this would be in the component)
    // The result is returned via postMessage to the WebView component
    
    // Step 5: Convert base64 result back to file (implemented in the component)
    
    // This function returns the temporary HTML file path that needs to be processed via WebView
    return tempHtmlPath;
  } catch (error) {
    console.error("Histogram equalization error:", error);
    throw error;
  }
};

export default function NewCardScreen({ route, navigation }) {
  // Get deckId from route params
  const deckId = route.params?.deckId;
  const { addCard, decks } = useContext(AppContext);

  // Find the current deck to show info
  const currentDeck = decks.find(deck => deck.id === deckId);

  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [questionImage, setQuestionImage] = useState(null);
  const [answerImage, setAnswerImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [activeImageType, setActiveImageType] = useState('');
  const [processingImage, setProcessingImage] = useState(false);
  const [enhanceModalVisible, setEnhanceModalVisible] = useState(false);
  const [webViewPath, setWebViewPath] = useState(null);
  
  // For WebView reference
  const [webViewRef, setWebViewRef] = useState(null);

  // Validate that we have a deckId
  useEffect(() => {
    if (!deckId) {
      Alert.alert(
        "Error",
        "No deck selected. Please try again.",
        [{ text: "Go Back", onPress: () => navigation.goBack() }]
      );
    }

    // Request permissions for camera and media library
    (async () => {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
        Alert.alert(
          "Permissions Required",
          "Please allow camera and photo library access to add images to your flashcards."
        );
      }
    })();
  }, [deckId]);

  const handleAddCard = async () => {
    if (front.trim() && back.trim() && deckId) {
      // Add the card to the deck using context function
      addCard(deckId, {
        front: front.trim(),
        back: back.trim(),
        questionImage: questionImage,
        answerImage: answerImage
      });

      // Show notification
      await scheduleNotification("New Card Added", `Added "${front}" to ${currentDeck.title}`);

      // Navigate back to deck screen
      navigation.navigate('DeckNavigator', {
        screen: 'DeckDetails',
        params: { deckId: deckId }
      });
    }
  };

  const scheduleNotification = async (title, body) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: title,
        body: body,
      },
      trigger: null, // Show immediately
    });
  };

  const openImagePickerModal = (type) => {
    setActiveImageType(type);
    setModalVisible(true);
  };

  const takePhoto = async () => {
    setModalVisible(false);
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (activeImageType === 'question') {
          setQuestionImage(result.assets[0].uri);
        } else {
          setAnswerImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to take photo");
    }
  };

  const pickImage = async () => {
    setModalVisible(false);
    
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        if (activeImageType === 'question') {
          setQuestionImage(result.assets[0].uri);
        } else {
          setAnswerImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = () => {
    setModalVisible(false);
    
    if (activeImageType === 'question') {
      setQuestionImage(null);
    } else {
      setAnswerImage(null);
    }
  };

  // Handler for showing the enhance image modal
  const openEnhanceModal = async () => {
    setModalVisible(false);
    
    // Get the current active image URI
    const imageUri = activeImageType === 'question' ? questionImage : answerImage;
    
    if (!imageUri) return;
    
    try {
      setProcessingImage(true);
      const htmlPath = await histogramEqualization(imageUri);
      setWebViewPath(htmlPath);
      setEnhanceModalVisible(true);
    } catch (error) {
      Alert.alert("Error", "Failed to prepare image for enhancement");
    } finally {
      setProcessingImage(false);
    }
  };
  
  // Handler for WebView message
  const handleWebViewMessage = async (event) => {
    try {
      const { data } = event.nativeEvent;
      
      if (data.startsWith('ERROR:')) {
        throw new Error(data.substring(6));
      }
      
      // Convert base64 to file
      const processedImagePath = `${FileSystem.cacheDirectory}enhanced_image_${Date.now()}.jpg`;
      await FileSystem.writeAsStringAsync(processedImagePath, data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Update the image state
      if (activeImageType === 'question') {
        setQuestionImage(processedImagePath);
      } else {
        setAnswerImage(processedImagePath);
      }
      
      // Close the enhancement modal
      setEnhanceModalVisible(false);
      
      // Clean up temp file
      if (webViewPath) {
        await FileSystem.deleteAsync(webViewPath, { idempotent: true });
      }
    } catch (error) {
      Alert.alert("Enhancement Failed", "Unable to process the image");
    }
  };

  return (
    <LinearGradient colors={['#0066CC', '#004C99']} style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerTitle}>
          <Text style={styles.headerText}>New Card</Text>
          {currentDeck && (
            <Text style={styles.deckName}>Deck: {currentDeck.title}</Text>
          )}
        </View>
        <TouchableOpacity
          style={[
            styles.addButton,
            !(front.trim() && back.trim()) && styles.disabledButton
          ]}
          onPress={handleAddCard}
          disabled={!(front.trim() && back.trim())}
        >
          <Text style={styles.addButtonText}>Add</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.label}>Front</Text>
        <TextInput
          style={styles.inputBox}
          multiline
          value={front}
          onChangeText={setFront}
          placeholder="Enter question here"
          placeholderTextColor="#cce6ff"
        />
        
        {/* Question Image Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity 
            style={styles.addImageButton} 
            onPress={() => openImagePickerModal('question')}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.addImageText}>
              {questionImage ? 'Change Image' : 'Add Image to Question'}
            </Text>
          </TouchableOpacity>
          
          {questionImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: questionImage }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setQuestionImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>

        <Text style={styles.label}>Back</Text>
        <TextInput
          style={styles.inputBox}
          multiline
          value={back}
          onChangeText={setBack}
          placeholder="Enter answer here"
          placeholderTextColor="#cce6ff"
          textAlignVertical="top"
        />
        
        {/* Answer Image Section */}
        <View style={styles.imageSection}>
          <TouchableOpacity 
            style={styles.addImageButton} 
            onPress={() => openImagePickerModal('answer')}
          >
            <Ionicons name="camera" size={20} color="#fff" />
            <Text style={styles.addImageText}>
              {answerImage ? 'Change Image' : 'Add Image to Answer'}
            </Text>
          </TouchableOpacity>
          
          {answerImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: answerImage }} style={styles.imagePreview} />
              <TouchableOpacity 
                style={styles.removeImageButton}
                onPress={() => setAnswerImage(null)}
              >
                <Ionicons name="close-circle" size={24} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </ScrollView>

      {/* Image Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Image</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#0066CC" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <Ionicons name="image" size={24} color="#0066CC" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            {((activeImageType === 'question' && questionImage) || 
              (activeImageType === 'answer' && answerImage)) && (
              <>
                <TouchableOpacity style={styles.modalOption} onPress={openEnhanceModal}>
                  <Ionicons name="contrast" size={24} color="#33CC33" />
                  <Text style={[styles.modalOptionText, { color: '#33CC33' }]}>Enhance Image</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.modalOption} onPress={removeImage}>
                  <Ionicons name="trash" size={24} color="#FF3B30" />
                  <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Remove Image</Text>
                </TouchableOpacity>
              </>
            )}
            
            <TouchableOpacity 
              style={styles.cancelButton}
              onPress={() => setModalVisible(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      
      {/* Processing Overlay */}
      {processingImage && (
        <View style={styles.processingOverlay}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.processingText}>Enhancing image...</Text>
        </View>
      )}
      
      {/* WebView Modal for Processing */}
      <Modal
        visible={enhanceModalVisible}
        transparent={true}
        onRequestClose={() => setEnhanceModalVisible(false)}
      >
        <View style={styles.webViewModalContainer}>
          <View style={styles.webViewWrapper}>
            <Text style={styles.webViewModalTitle}>Enhancing Image...</Text>
            <ActivityIndicator size="large" color="#0066CC" />
            
            {webViewPath && (
              <WebView
                ref={ref => setWebViewRef(ref)}
                source={{ uri: `file://${webViewPath}` }}
                style={styles.webView}
                onMessage={handleWebViewMessage}
                onError={(error) => {
                  console.error('WebView error:', error);
                  setEnhanceModalVisible(false);
                  Alert.alert('Error', 'Failed to enhance image');
                }}
              />
            )}
            
            <TouchableOpacity 
              style={styles.webViewCancelButton}
              onPress={() => setEnhanceModalVisible(false)}
            >
              <Text style={styles.webViewCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 50 : 30,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 16,
    justifyContent: 'space-between',
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  headerText: {
    color: '#fff',
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
  },
  deckName: {
    color: '#fff',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    opacity: 0.8,
    marginTop: 4,
  },
  backButton: {
    padding: 8,
  },
  addButton: {
    backgroundColor: '#FF8000',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  addButtonText: {
    color: '#fff',
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
  },
  content: {
    padding: 16,
    backgroundColor: 'transparent',
    paddingBottom: 50,
  },
  label: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 8,
    marginTop: 16,
    fontFamily: 'Montserrat-Regular',
  },
  inputBox: {
    backgroundColor: '#3399FF',
    borderRadius: 12,
    padding: 12,
    color: '#fff',
    fontSize: 16,
    minHeight: 100,
    textAlignVertical: 'top',
    fontFamily: 'Montserrat-Regular',
  },
  imageSection: {
    marginTop: 12,
    marginBottom: 20,
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  addImageText: {
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'Montserrat-Regular',
  },
  imagePreviewContainer: {
    marginTop: 12,
    position: 'relative',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 15,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 20,
    color: '#333',
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalOptionText: {
    marginLeft: 15,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#333',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  cancelButtonText: {
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    fontSize: 16,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  processingText: {
    color: '#fff',
    marginTop: 10,
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
  },
  webViewModalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    padding: 20,
  },
  webViewWrapper: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
    alignItems: 'center',
  },
  webViewModalTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    marginBottom: 20,
    color: '#333',
  },
  webView: {
    width: 1,
    height: 1,
    opacity: 0, // Hidden webview
  },
  webViewCancelButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#f0f0f0',
    borderRadius: 10,
  },
  webViewCancelText: {
    fontFamily: 'Montserrat-Bold',
    color: '#333',
    fontSize: 16,
  },
});
