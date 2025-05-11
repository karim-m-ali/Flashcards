import React, { useState, useContext } from 'react';
import { 
  StyleSheet, 
  TextInput, 
  Pressable, 
  SafeAreaView, 
  View, 
  Text, 
  Platform,
  Image,
  Modal,
  TouchableOpacity,
  Alert
} from 'react-native';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { AppContext } from '../App';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';

export default function NewDeckScreen({ navigation }) {
  const [deckTitle, setDeckTitle] = useState('');
  const [deckIcon, setDeckIcon] = useState('');
  const [iconImage, setIconImage] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  
  const { addDeck } = useContext(AppContext);

  const handleCreate = async () => {
    if (deckTitle.trim()) {
      // Determine which icon to use
      let finalIcon;
      if (iconImage) {
        finalIcon = iconImage;
      } else if (deckIcon && deckIcon.trim() !== '') {
        finalIcon = deckIcon.trim();
      } else {
        finalIcon = null; // Will use default in addDeck
      }
      
      // Add the new deck using context function with default cardsPerDay value
      const newDeckId = await addDeck({
        title: deckTitle.trim(),
        icon: finalIcon,
        cardsPerDay: 15 // Default value, no longer user-configurable
      });

      // Show notification
      await scheduleNotification(
        "New Deck Created", 
        `"${deckTitle}" has been created successfully!`
      );

      // Navigate back to home screen
      navigation.navigate('HomeMain');
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

  const takePhoto = async () => {
    setModalVisible(false);
    
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setIconImage(result.assets[0].uri);
        setDeckIcon(''); // Clear text emoji if image is selected
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
        aspect: [1, 1],
        quality: 0.8,
      });
      
      if (!result.canceled) {
        setIconImage(result.assets[0].uri);
        setDeckIcon(''); // Clear text emoji if image is selected
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image");
    }
  };

  const removeImage = () => {
    setModalVisible(false);
    setIconImage(null);
  };

  return (
    <LinearGradient
      colors={['#0066CC', '#004C99']}
      style={styles.container}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backButton}>
            <Feather name="chevron-left" size={24} color="#fff" />
          </Pressable>
          <View style={styles.headerTitle}>
            <Text style={styles.titleText}>New Deck</Text>
          </View>
          <Pressable
            onPress={handleCreate}
            style={[
              styles.createButton,
              !deckTitle.trim() && styles.disabledButton
            ]}
            disabled={!deckTitle.trim()}
          >
            <Text style={styles.createText}>Create</Text>
          </Pressable>
        </View>

        <View style={styles.form}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={deckTitle}
              onChangeText={setDeckTitle}
              placeholder="My new deck"
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              fontFamily="Montserrat-Regular"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Icon</Text>
            
            {iconImage ? (
              <View style={styles.iconPreviewContainer}>
                <Image source={{ uri: iconImage }} style={styles.iconPreview} />
                <TouchableOpacity 
                  style={styles.changeIconButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Text style={styles.changeIconText}>Change</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.imagePickerButton}
                  onPress={() => setModalVisible(true)}
                >
                  <Ionicons name="image" size={20} color="#fff" />
                  <Text style={styles.imagePickerText}>Choose Image</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </SafeAreaView>

      {/* Image Picker Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose Deck Icon</Text>
            
            <TouchableOpacity style={styles.modalOption} onPress={takePhoto}>
              <Ionicons name="camera" size={24} color="#0066CC" />
              <Text style={styles.modalOptionText}>Take Photo</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.modalOption} onPress={pickImage}>
              <Ionicons name="image" size={24} color="#0066CC" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>
            
            {iconImage && (
              <TouchableOpacity style={styles.modalOption} onPress={removeImage}>
                <Ionicons name="trash" size={24} color="#FF3B30" />
                <Text style={[styles.modalOptionText, { color: '#FF3B30' }]}>Remove Image</Text>
              </TouchableOpacity>
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 20,
    marginBottom: 30,
  },
  headerTitle: {
    flex: 1,
    alignItems: 'center',
  },
  titleText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Montserrat-Regular',
  },
  backButton: {
    padding: 8,
    marginLeft: -8,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  createButton: {
    backgroundColor: '#FF8000',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  createText: {
    color: '#fff',
    fontSize: 15,
    fontFamily: 'Montserrat-Bold',
  },
  form: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    marginBottom: 8,
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
    padding: 16,
    fontSize: 16,
    color: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    fontFamily: 'Montserrat-Regular',
  },
  imagePickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  imagePickerText: {
    color: '#fff',
    marginLeft: 8,
    fontFamily: 'Montserrat-Regular',
  },
  iconPreviewContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconPreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },
  changeIconButton: {
    marginLeft: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  changeIconText: {
    color: '#fff',
    fontFamily: 'Montserrat-Regular',
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
});
