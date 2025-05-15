import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  Alert,
  ActivityIndicator,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { AppContext } from '../App';
import LearningCard from '../components/LearningCard';
import { useFocusEffect } from '@react-navigation/native';
import { getLocationCards, saveLocationCard, deleteLocationCard } from '../assets/database';
import LocationCardModal from '../components/LocationCardModal';

export default function LocationFlashcardScreen({ navigation }) {
  const { user } = useContext(AppContext);
  const [loading, setLoading] = useState(true);
  const [locationCards, setLocationCards] = useState([]);
  const [currentLocation, setCurrentLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState('unknown');
  const [modalVisible, setModalVisible] = useState(false);
  const [locationError, setLocationError] = useState(null);

  // Request location permissions and get current location
  useEffect(() => {
    (async () => {
      try {
        setLocationError(null);
        
        // Request permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        setLocationPermission(status);
        
        if (status === 'granted') {
          // Get location - use low accuracy for faster response in Snack
          const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Low
          });
          
          setCurrentLocation(location.coords);
          console.log("Location obtained:", location.coords);
        } else {
          setLocationError("Location permission was denied");
        }
      } catch (error) {
        console.error('Error getting location:', error);
        setLocationError(error.message || "Error accessing location services");
        
        // Provide a mock location for testing in Snack when location fails
        if (Platform.OS === 'web') {
          console.log("Using mock location for web testing");
          setCurrentLocation({
            latitude: 37.7749,
            longitude: -122.4194
          });
        }
      }
    })();
  }, []);

  // Load location cards when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      
      const loadLocationCards = async () => {
        if (user) {
          try {
            // In a real app, this would fetch from the database
            // For Snack demo, we'll use mock data if needed
            let cards;
            try {
              cards = await getLocationCards(user.uid);
            } catch (dbError) {
              console.log("Database error, using mock data:", dbError);
              // Mock data for demo purposes
              cards = [
                {
                  id: '1',
                  title: 'Local Coffee Shop',
                  question: 'Whats the signature drink here?',
                  answer: 'Caramel macchiato with house-made syrup',
                  latitude: 37.7749,
                  longitude: -122.4194,
                  createdAt: new Date().toISOString()
                },
                {
                  id: '2',
                  title: 'City Library',
                  question: 'When was this library founded?',
                  answer: '1852 during the gold rush era',
                  latitude: 37.7739,
                  longitude: -122.4312,
                  createdAt: new Date().toISOString()
                }
              ];
            }
            
            setLocationCards(cards);
          } catch (error) {
            console.error('Error loading location cards:', error);
            Alert.alert('Error', 'Failed to load location cards');
          } finally {
            setLoading(false);
          }
        }
      };
      
      loadLocationCards();
      return () => {};
    }, [user])
  );

  // Handle creating a new location card
  const handleAddLocationCard = () => {
    if (!currentLocation && locationPermission === 'granted') {
      Alert.alert(
        'Location Unavailable',
        'We couldn\'t detect your current location. Please try again.'
      );
      return;
    }
    
    if (locationPermission !== 'granted') {
      Alert.alert(
        'Location Required',
        'We need your location permission to create location-based flash cards. Please enable location services in your settings.'
      );
      return;
    }
    
    setModalVisible(true);
  };

  // Save new location card
  const handleSaveCard = async (cardData) => {
    try {
      setLoading(true);
      const newCard = {
        ...cardData,
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        userId: user.uid,
        createdAt: new Date().toISOString()
      };
      
      let savedCard;
      try {
        savedCard = await saveLocationCard(newCard);
      } catch (dbError) {
        console.log("Database save error, using mock save:", dbError);
        savedCard = {
          id: generateTempId(),
          ...newCard
        };
      }
      
      setLocationCards(prevCards => [...prevCards, savedCard]);
      setModalVisible(false);
    } catch (error) {
      console.error('Error saving location card:', error);
      Alert.alert('Error', 'Failed to save location card');
    } finally {
      setLoading(false);
    }
  };

  // Generate a temporary ID for demo purposes
  const generateTempId = () => {
    return Math.random().toString(36).substring(2, 15);
  };

  // Handle card press to view details
  const handleCardPress = (card) => {
    navigation.navigate('LocationCardDetail', { card });
  };

  // Handle delete card
  const handleDeleteCard = (cardId) => {
    Alert.alert(
      'Delete Card',
      'Are you sure you want to delete this location card?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              
              try {
                await deleteLocationCard(cardId);
              } catch (dbError) {
                console.log("Database delete error, using mock delete:", dbError);
                // In Snack, we'll just remove from state without DB interaction
              }
              
              setLocationCards(prevCards => 
                prevCards.filter(card => card.id !== cardId)
              );
            } catch (error) {
              console.error('Error deleting card:', error);
              Alert.alert('Error', 'Failed to delete card');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  // Format distance for display
  const formatDistance = (cardLocation) => {
    if (!currentLocation || !cardLocation.latitude || !cardLocation.longitude) {
      return 'Distance unknown';
    }
    
    // Calculate distance using Haversine formula
    const R = 6371; // Earth radius in km
    const dLat = (cardLocation.latitude - currentLocation.latitude) * Math.PI / 180;
    const dLon = (cardLocation.longitude - currentLocation.longitude) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(currentLocation.latitude * Math.PI / 180) * Math.cos(cardLocation.latitude * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;
    
    // Format based on distance
    if (distance < 1) {
      return `${Math.round(distance * 1000)} m away`;
    } else {
      return `${distance.toFixed(1)} km away`;
    }
  };

  return (
    <LinearGradient
      colors={['#3399ff', '#0066cc', '#004c99']}
      style={styles.container}>
      
      {/* Header Section */}
      <View style={styles.headerSection}>
        <Text style={styles.headerText}>Location Cards</Text>
        <Text style={styles.subHeaderText}>
          Flashcards linked to your locations
        </Text>
      </View>

      {/* Current Location Indicator */}
      <View style={styles.locationIndicator}>
        <Ionicons 
          name={currentLocation ? "location" : "location-outline"} 
          size={20} 
          color="white" 
        />
        <Text style={styles.locationText}>
          {locationError ? 
            `Location error: ${locationError.includes('denied') ? 'Permission denied' : 'Could not get location'}` :
            currentLocation ? 
              'Current location detected' : 
              'Waiting for location...'
          }
        </Text>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <>
          {/* Location Cards List */}
          {locationCards.length > 0 ? (
            <FlatList
              data={locationCards}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCardPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.cardContainer}>
                    <LearningCard 
                      title={item.title}
                      subtitle={formatDistance(item)}
                      progress={1}
                    />
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteCard(item.id)}
                    >
                      <Ionicons name="trash-outline" size={20} color="white" />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          ) : (
            // Empty state
            <View style={styles.emptyContainer}>
              <Ionicons name="location-outline" size={60} color="#ffffff80" />
              <Text style={styles.emptyText}>No location cards yet</Text>
              <Text style={styles.emptySubText}>
                Tap the + button to create a flashcard linked to your current location
              </Text>
            </View>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={[
          styles.fab,
          (!currentLocation && locationPermission === 'granted') ? styles.fabDisabled : null
        ]}
        onPress={handleAddLocationCard}
        activeOpacity={currentLocation ? 0.8 : 1}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>

      {/* Modal for creating new location card */}
      <LocationCardModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSaveCard}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  headerSection: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  headerText: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold',
    color: 'white',
  },
  subHeaderText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: 'white',
    opacity: 0.9,
  },
  locationIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  locationText: {
    fontFamily: 'Montserrat-Medium',
    color: 'white',
    marginLeft: 8,
  },
  list: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: 'white',
    marginTop: 20,
  },
  emptySubText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 10,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    backgroundColor: '#FF8000',
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  fabDisabled: {
    backgroundColor: 'rgba(255, 128, 0, 0.6)',
  },
  cardContainer: {
    position: 'relative',
    marginBottom: 15,
  },
  deleteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(255, 0, 0, 0.7)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  }
});
