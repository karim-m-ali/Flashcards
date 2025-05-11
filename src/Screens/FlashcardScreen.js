import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  StatusBar,
  Platform,
  Image,
  Animated,
  PanResponder,
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppContext } from '../App';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_THRESHOLD = SCREEN_WIDTH * 0.25;
const SWIPE_OUT_DURATION = 250;

export default function FlashcardScreen({ route, navigation }) {
  const { deckId } = route.params;
  const { decks } = useContext(AppContext);

  // Find the selected deck
  const selectedDeck = decks.find(deck => deck.id === deckId);
  
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);
  const position = useRef(new Animated.ValueXY()).current;
  const [isSwipingDisabled, setIsSwipingDisabled] = useState(false);
  
  const { incrementCardCountForDeck } = useContext(AppContext);
  const [cardCounted, setCardCounted] = useState(false);

  // Debugging
  useEffect(() => {
    if (selectedDeck && selectedDeck.cards.length > 0) {
      console.log("Current card:", selectedDeck.cards[currentCardIndex]);
    }
  }, [currentCardIndex, selectedDeck]);
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isSwipingDisabled,
      onPanResponderMove: (event, gesture) => {
        position.setValue({ x: gesture.dx, y: 0 });
      },
      onPanResponderRelease: (event, gesture) => {
        if (gesture.dx > SWIPE_THRESHOLD) {
          // Swipe right - go to previous card
          forceSwipe('right');
        } else if (gesture.dx < -SWIPE_THRESHOLD) {
          // Swipe left - go to next card
          forceSwipe('left');
        } else {
          resetPosition();
        }
      }
    })
  ).current;

  useEffect(() => {
    // Reset position when card index changes
    position.setValue({ x: 0, y: 0 });
  }, [currentCardIndex, position]);

  const forceSwipe = (direction) => {
    // Temporarily disable swiping during animation
    setIsSwipingDisabled(true);
    
    const x = direction === 'right' ? SCREEN_WIDTH : -SCREEN_WIDTH;
    Animated.timing(position, {
      toValue: { x, y: 0 },
      duration: SWIPE_OUT_DURATION,
      useNativeDriver: false
    }).start(() => {
      onSwipeComplete(direction);
      // Re-enable swiping after animation completes
      setIsSwipingDisabled(false);
    });
  };

  const onSwipeComplete = (direction) => {
    const cards = selectedDeck.cards;
    let nextIndex;
    
    // Calculate next index based on swipe direction
    if (direction === 'right') {
      // Go to previous card (if not at beginning)
      nextIndex = currentCardIndex > 0 ? currentCardIndex - 1 : 0;
    } else {
      // Go to next card (if not at end)
      nextIndex = currentCardIndex < cards.length - 1 ? currentCardIndex + 1 : currentCardIndex;
    }
    
    // Only update if index changed
    if (nextIndex !== currentCardIndex) {
      setCurrentCardIndex(nextIndex);
      setCardFlipped(false);
    }
    
    // Reset position
    position.setValue({ x: 0, y: 0 });
  };

  const resetPosition = () => {
    Animated.spring(position, {
      toValue: { x: 0, y: 0 },
      friction: 5,
      useNativeDriver: false
    }).start();
  };

  const handleCardPress = async () => {
  // Only count the card once per session when it's flipped to the answer side
  if (!cardFlipped && !cardCounted) {
    try {
      await incrementCardCountForDeck(deckId);
      setCardCounted(true);
    } catch (error) {
      console.error("Error tracking card view:", error);
    }
  }
  setCardFlipped(!cardFlipped);
};

// Also, reset cardCounted when moving to a new card:
useEffect(() => {
  setCardCounted(false);
}, [currentCardIndex]);

  const handleDifficultyRating = (difficulty) => {
    // Move to next card
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      // Animate card exit to the left when moving to next card
      forceSwipe('left');
    } else {
      // End of deck
      navigation.goBack();
    }
  };

  const handleProgressPress = (index) => {
    setCurrentCardIndex(index);
    setCardFlipped(false);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  // Manual navigation buttons
  const goToNextCard = () => {
    if (currentCardIndex < selectedDeck.cards.length - 1) {
      forceSwipe('left');
    }
  };

  const goToPrevCard = () => {
    if (currentCardIndex > 0) {
      forceSwipe('right');
    }
  };

  if (!selectedDeck || selectedDeck.cards.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleClose}
          >
            <Ionicons name="close" color="#FFFFFF" size={24} />
          </TouchableOpacity>
        </View>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No cards in this deck</Text>
        </View>
      </SafeAreaView>
    );
  }

  const renderCard = () => {
    const currentCard = selectedDeck.cards[currentCardIndex];
    const rotate = position.x.interpolate({
      inputRange: [-SCREEN_WIDTH * 1.5, 0, SCREEN_WIDTH * 1.5],
      outputRange: ['30deg', '0deg', '-30deg']
    });

    const cardStyle = {
      ...styles.card,
      transform: [{ translateX: position.x }, { rotate }]
    };

    // Check for card content using multiple possible property names
    const frontContent = currentCard.front || currentCard.question || "";
    const backContent = currentCard.back || currentCard.answer || "";
    const frontImage = currentCard.questionImage;
    const backImage = currentCard.answerImage;

    return (
      <Animated.View 
        style={cardStyle}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.cardContent}
          onPress={handleCardPress}
          activeOpacity={0.9}
        >
          {/* Front side (question) */}
          {!cardFlipped && (
            <View style={styles.cardSide}>
              {frontImage && (
                <Image 
                  source={{ uri: frontImage }} 
                  style={styles.cardImage} 
                  resizeMode="contain"
                />
              )}
              <Text style={styles.cardText}>{frontContent}</Text>
              <Text style={styles.cardHint}>Touch the card to flip</Text>
            </View>
          )}
          
          {/* Back side (answer) */}
          {cardFlipped && (
            <View style={styles.cardSide}>
              {backImage && (
                <Image 
                  source={{ uri: backImage }} 
                  style={styles.cardImage} 
                  resizeMode="contain"
                />
              )}
              <Text style={styles.cardText}>{backContent}</Text>
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0066CC" />
      
      {/* Header with X on right side */}
      <View style={styles.headerContainer}>
        <View style={{width: 20}} />
        <View style={styles.titleWrapper}>
          <Text style={styles.headerTitle}>{selectedDeck.title}</Text>
          <Text style={styles.cardCounter}>
            Card {currentCardIndex + 1} of {selectedDeck.cards.length}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={handleClose}
          hitSlop={{top: 10, bottom: 10, left: 10, right: 10}}
        >
          <Ionicons name="close" color="#FFFFFF" size={24} />
        </TouchableOpacity>
      </View>
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        {selectedDeck.cards.map((_, index) => (
          <TouchableOpacity
            key={index}
            onPress={() => handleProgressPress(index)}
            style={styles.progressTouchable}
          >
            <View
              style={[
                styles.progressIndicator,
                { backgroundColor: index <= currentCardIndex ? '#FFFFFF' : 'rgba(255,255,255,0.5)' }
              ]}
            />
          </TouchableOpacity>
        ))}
      </View>
      
      {/* Navigation Buttons */}
      <View style={styles.navigationContainer}>
        <TouchableOpacity 
          style={[styles.navButton, currentCardIndex === 0 ? styles.disabledNavButton : {}]} 
          onPress={goToPrevCard}
          disabled={currentCardIndex === 0}
        >
          <Ionicons name="chevron-back" size={24} color={currentCardIndex === 0 ? "rgba(255,255,255,0.3)" : "white"} />
        </TouchableOpacity>
        
        {/* Card Area */}
        <View style={styles.cardContainer}>
          {renderCard()}
        </View>
        
        <TouchableOpacity 
          style={[styles.navButton, currentCardIndex === selectedDeck.cards.length - 1 ? styles.disabledNavButton : {}]}
          onPress={goToNextCard}
          disabled={currentCardIndex === selectedDeck.cards.length - 1}
        >
          <Ionicons name="chevron-forward" size={24} color={currentCardIndex === selectedDeck.cards.length - 1 ? "rgba(255,255,255,0.3)" : "white"} />
        </TouchableOpacity>
      </View>
      
      {/* Swipe Hint */}
      <View style={styles.swipeHintContainer}>
        <Ionicons name="arrow-back" size={16} color="rgba(255,255,255,0.6)" />
        <Text style={styles.swipeHintText}>Swipe to navigate between cards</Text>
        <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.6)" />
      </View>
      
      {/* Difficulty Rating Buttons */}
      <View style={styles.footerContainer}>
        <View style={styles.ratingButtons}>
          <TouchableOpacity
            style={styles.ratingButton}
            onPress={() => handleDifficultyRating('hard')}
          >
            <Text style={styles.ratingEmoji}>😣</Text>
            <Text style={styles.ratingText}>Hard</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.ratingButton}
            onPress={() => handleDifficultyRating('good')}
          >
            <Text style={styles.ratingEmoji}>☺️</Text>
            <Text style={styles.ratingText}>Good</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.ratingButton}
            onPress={() => handleDifficultyRating('easy')}
          >
            <Text style={styles.ratingEmoji}>😁</Text>
            <Text style={styles.ratingText}>Easy</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.footerLabel}>Select the difficulty of the question</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066CC',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 16 : 12,
    paddingBottom: 8,
    paddingHorizontal: 16,
    marginTop: Platform.OS === 'android' ? 36 : 0,
    height: Platform.OS === 'android' ? 70 : 50,
  },
  titleWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  cardCounter: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 12,
    fontFamily: 'Montserrat-Regular',
    marginTop: 4,
  },
  closeButton: {
    padding: 8,
  },
  progressContainer: {
    flexDirection: 'row',
    height: 4,
    marginHorizontal: 20,
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  progressTouchable: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 2,
  },
  progressIndicator: {
    height: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  navigationContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  disabledNavButton: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 16,
  },
  card: {
    width: '100%',
    minHeight: 280,
    backgroundColor: '#F0F0F0',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  cardContent: {
    padding: 24,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 16,
  },
  cardSide: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: 150,
    marginBottom: 15,
    borderRadius: 8,
  },
  cardText: {
    fontSize: 22,
    textAlign: 'center',
    color: '#333333',
    lineHeight: 32,
    fontFamily: 'Montserrat-Regular',
  },
  cardHint: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
    position: 'absolute',
    bottom: 20,
    fontFamily: 'Montserrat-Regular',
  },
  swipeHintContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  swipeHintText: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 14,
    marginHorizontal: 10,
    fontFamily: 'Montserrat-Regular',
  },
  footerContainer: {
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
    paddingTop: 10,
  },
  footerLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 10,
    marginBottom: 10,
    fontFamily: 'Montserrat-Regular',
  },
  ratingButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ratingButton: {
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    alignItems: 'center',
    width: '30%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  ratingEmoji: {
    fontSize: 24,
    marginBottom: 2,
  },
  ratingText: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '500',
    fontFamily: 'Montserrat-Medium',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Montserrat-Regular',
    textAlign: 'center',
  }
});
