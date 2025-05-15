import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import LearningCard from '../components/LearningCard';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppContext } from '../App';
import { useFocusEffect } from '@react-navigation/native';

export default function HomeScreen({ navigation }) {
  const { decks, user, logout, deleteDeck } = useContext(AppContext);
  const [loading, setLoading] = useState(true);

  // Simulate loading user data when screen is focused
  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      // Simulate data loading
      const timer = setTimeout(() => {
        setLoading(false);
      }, 300);
      return () => clearTimeout(timer);
    }, [])
  );

  const handleCardPress = (deck) => {
    // Navigate to the nested DeckNavigator with the correct deck
    navigation.navigate('DeckNavigator', {
      screen: 'DeckDetails',
      params: { deckId: deck.id }
    });
  };

  const handleAddDeck = () => {
    // Navigate to the nested CreateNavigator for adding a new deck
    navigation.navigate('CreateNavigator', {
      screen: 'NewDeckScreen'
    });
  };

  // Handle deck deletion with confirmation
  const handleDeleteDeck = (deck) => {
    Alert.alert(
      "Delete Deck",
      `Are you sure you want to delete "${deck.title}"? This will permanently delete all cards in this deck.`,
      [
        { 
          text: "Cancel",
          style: "cancel"
        },
        { 
          text: "Delete", 
          onPress: async () => {
            try {
              setLoading(true);
              const result = await deleteDeck(deck.id);
              if (result.error) {
                Alert.alert("Error", "Failed to delete deck. Please try again.");
              }
            } catch (error) {
              console.error("Error in handleDeleteDeck:", error);
              Alert.alert("Error", "An unexpected error occurred.");
            } finally {
              setLoading(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Long press handler for deck cards
  const handleLongPress = (deck) => {
    Alert.alert(
      "Deck Options",
      `What would you like to do with "${deck.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => handleDeleteDeck(deck),
          style: "destructive"
        }
      ]
    );
  };

  // Extract username from email if no display name is available
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <LinearGradient
      colors={['#3399ff', '#0066cc', '#004c99']}
      style={styles.container}>
      {/* Welcome Section */}
      <View style={styles.welcomeSection}>
        <View style={styles.welcomeHeader}>
          <View>
            <Text style={styles.headerText}>Hi, {displayName}!</Text>
            <Text style={styles.subHeaderText}>Ready for learning?</Text>
          </View>
         { /* <TouchableOpacity onPress={() => logout()} style={styles.logoutButton}>
             <Ionicons name="log-out-outline" size={24} color="white" />
          </TouchableOpacity>
          */}
        </View>
      </View>

      {/* Loading State */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <>
          {/* Deck List */}
          {decks.length > 0 ? (
            <FlatList
              data={decks}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => handleCardPress(item)}
                  onLongPress={() => handleLongPress(item)}
                  activeOpacity={0.7}
                  delayLongPress={500}
                >
                  <View style={styles.cardContainer}>
                    <LearningCard {...item} />
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => handleDeleteDeck(item)}
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
              <Ionicons name="book-outline" size={60} color="#ffffff80" />
              <Text style={styles.emptyText}>No decks yet</Text>
              <Text style={styles.emptySubText}>Tap the + button to create your first deck</Text>
            </View>
          )}
        </>
      )}

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddDeck}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="white" />
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  welcomeSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  welcomeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
  logoutButton: {
    padding: 8,
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
