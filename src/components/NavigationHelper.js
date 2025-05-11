// components/NavigationHelper.js
import { useNavigation, CommonActions } from '@react-navigation/native';

// Helper functions for navigating through nested navigators
export const useAppNavigation = () => {
  const navigation = useNavigation();

  return {
    // Navigate to a deck screen
    goToDeck: (deckId) => {
      navigation.navigate('DeckNavigator', {
        screen: 'DeckDetails',
        params: { deckId },
      });
    },
    
    // Navigate to flashcard practice
    goToFlashcards: (deckId) => {
      navigation.navigate('DeckNavigator', {
        screen: 'FlashcardScreen',
        params: { deckId },
      });
    },
    
    // Navigate to new deck creation
    goToNewDeck: () => {
      navigation.navigate('CreateNavigator', {
        screen: 'NewDeckScreen',
      });
    },
    
    // Navigate to new card creation
    goToNewCard: (deckId) => {
      navigation.navigate('CreateNavigator', {
        screen: 'NewCardScreen',
        params: { deckId },
      });
    },
    
    // Return to home screen
    goToHome: () => {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: 'HomeMain' }],
        })
      );
    },
  };
};
