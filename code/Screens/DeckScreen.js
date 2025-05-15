import React, { useContext, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, StyleSheet, Platform, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../App';

export default function DeckScreen({ route, navigation }) {
  const { deckId } = route.params;
  const { decks, deleteCard } = useContext(AppContext);
  const [loading, setLoading] = useState(false);

  // Find the selected deck
  const selectedDeck = decks.find(deck => deck.id === deckId);

  const handleBackPress = () => {
    navigation.navigate('HomeMain');
  };

  const handlePracticePress = () => {
    navigation.navigate('FlashcardScreen', { deckId });
  };

  const handleAddPress = () => {
    // Navigate to the nested CreateNavigator with the correct params
    navigation.navigate('CreateNavigator', {
      screen: 'NewCardScreen',
      params: { deckId: deckId }
    });
  };

  // Function to get the card content, handling different property names
  const getCardContent = (card) => {
    return card.front || card.question || "Untitled Card";
  };

  // Handle card deletion with confirmation
  const handleDeleteCard = (card) => {
    Alert.alert(
      "Delete Card",
      `Are you sure you want to delete this card?`,
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
              const result = await deleteCard(deckId, card.id);
              if (result.error) {
                Alert.alert("Error", "Failed to delete card. Please try again.");
              }
            } catch (error) {
              console.error("Error in handleDeleteCard:", error);
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

  // Handle long press on a card
  const handleCardLongPress = (card) => {
    Alert.alert(
      "Card Options",
      "What would you like to do with this card?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => handleDeleteCard(card),
          style: "destructive"
        }
      ]
    );
  };

  if (!selectedDeck) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>Deck not found</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBackPress}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{selectedDeck.title}</Text>
        <Text style={styles.cardCount}>
          {selectedDeck.cards.length} {selectedDeck.cards.length === 1 ? 'card' : 'cards'}
        </Text>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FFF" />
        </View>
      ) : (
        <ScrollView style={styles.content}>
          <View style={styles.questionGrid}>
            {selectedDeck.cards.length > 0 ? (
              selectedDeck.cards.map((card) => (
                <View key={card.id} style={styles.cardWrapper}>
                  <TouchableOpacity
                    style={styles.questionCard}
                    onLongPress={() => handleCardLongPress(card)}
                    delayLongPress={500}
                  >
                    <Text style={styles.questionText} numberOfLines={4}>
                      {getCardContent(card)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteCardButton}
                    onPress={() => handleDeleteCard(card)}
                  >
                    <Ionicons name="close-circle" size={22} color="#FF3B30" />
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyCardsContainer}>
                <Text style={styles.emptyCardsText}>No cards in this deck yet</Text>
                <Text style={styles.emptyCardsSubText}>Tap the + button to add your first card</Text>
              </View>
            )}
          </View>
        </ScrollView>
      )}
      
      <View style={styles.footer}>
        <TouchableOpacity
          style={[
            styles.practiceButton,
            selectedDeck.cards.length === 0 && styles.disabledButton
          ]}
          onPress={handlePracticePress}
          disabled={selectedDeck.cards.length === 0}
        >
          <Text style={styles.practiceButtonText}>Practice</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.addButton} onPress={handleAddPress}>
          <Ionicons name="add" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

// Define colors
const COLORS = {
  primary: '#0066CC',
  primaryDark: '#004c99',
  addButton: '#FF8000',
  white: '#FFFFFF',
  text: '#333333',
  lightGray: '#f8f9fa',
  danger: '#FF3B30',
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 50 : 40,
    backgroundColor: COLORS.primaryDark,
  },
  backButton: {
    marginRight: 16,
  },
  headerTitle: {
    color: COLORS.white,
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
  },
  cardCount: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    marginTop: 4,
    paddingLeft:15
  },
  content: {
    flex: 1,
    padding: 16,
  },
  questionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingBottom: 80, // Add padding to avoid footer overlap
  },
  cardWrapper: {
    position: 'relative',
    width: '48%',
    marginBottom: 16,
  },
  questionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    height: 120,
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  questionText: {
    fontSize: 16,
    color: COLORS.text,
    textAlign: 'center',
    fontFamily: 'Montserrat-Medium',
  },
  deleteCardButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: COLORS.white,
    borderRadius: 15,
    width: 26,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'ios' ? 32 : 24,
    backgroundColor: COLORS.primaryDark,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  practiceButton: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    paddingVertical: 12,
    paddingHorizontal: 35,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
    opacity: 0.7,
  },
  practiceButtonText: {
    color: COLORS.text,
    fontWeight: 'bold',
    fontFamily: 'Montserrat-Bold',
    justifyContent: 'center'
  },
  addButton: {
    backgroundColor: COLORS.addButton,
    borderRadius: 24,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: COLORS.white,
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
    marginTop: 100,
  },
  emptyCardsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    minHeight: 300,
  },
  emptyCardsText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: 'white',
    textAlign: 'center',
  },
  emptyCardsSubText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    textAlign: 'center',
    marginTop: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  }
});
