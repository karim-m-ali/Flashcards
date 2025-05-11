import React, { useState, useEffect } from 'react';
import * as Font from 'expo-font';
import AppLoading from 'expo-app-loading';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { View, Text } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  initDB,
  getDecksForUser,
  addDeck as dbAddDeck,
  addCard as dbAddCard,
  deleteDeck as dbDeleteDeck,
  deleteCard as dbDeleteCard,
  deleteUser as dbDeleteUser,
  updateEmail,
  updatePassword,
  updateUsername,
  incrementCardCountToday
} from './assets/database';

// Import screens
import HomeScreen from './Screens/HomeScreen';
import DeckScreen from './Screens/DeckScreen';
import FlashcardScreen from './Screens/FlashcardScreen';
import NewCardScreen from './Screens/NewCardScreen';
import NewDeckScreen from './Screens/NewDeckScreen';
import SignInScreen from './Screens/SignInScreen';
import SignUpScreen from './Screens/SignUpScreen';
import SettingsScreen from './Screens/SettingsScreen';
import LocationFlashcardScreen from './Screens/LocationFlashcardScreen';
import LocationCardDetailScreen from './Screens/LocationCardDetailScreen';
import LoadingScreen from './components/LoadingScreen';

// Configure notifications
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// Create navigators
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();
const DeckStack = createStackNavigator();
const CreateStack = createStackNavigator();
const AuthStack = createStackNavigator();
const LocationStack = createStackNavigator();

// Create context for global state management
export const AppContext = React.createContext();

// Auth Navigator - Handles authentication screens
function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="SignIn" component={SignInScreen} />
      <AuthStack.Screen name="SignUp" component={SignUpScreen} />
    </AuthStack.Navigator>
  );
}

// Deck Navigator - Manages all deck-related screens
function DeckNavigator() {
  return (
    <DeckStack.Navigator screenOptions={{ headerShown: false }}>
      <DeckStack.Screen name="DeckDetails" component={DeckScreen} />
      <DeckStack.Screen name="FlashcardScreen" component={FlashcardScreen} />
    </DeckStack.Navigator>
  );
}

// Create Navigator - Manages all creation screens
function CreateNavigator() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="NewDeckScreen" component={NewDeckScreen} />
      <CreateStack.Screen name="NewCardScreen" component={NewCardScreen} />
    </CreateStack.Navigator>
  );
}

// Create a Location Navigator
function LocationNavigator() {
  return (
    <LocationStack.Navigator screenOptions={{ headerShown: false }}>
      <LocationStack.Screen name="LocationCards" component={LocationFlashcardScreen} />
      <LocationStack.Screen name="LocationCardDetail" component={LocationCardDetailScreen} />
    </LocationStack.Navigator>
  );
}

// Main Navigator using Stack.Group for logical organization
function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Group screenOptions={{ animation: 'slide_from_left' }}>
        <MainStack.Screen name="HomeMain" component={HomeScreen} />
      </MainStack.Group>
      <MainStack.Group screenOptions={{ animation: 'slide_from_right' }}>
        <MainStack.Screen name="DeckNavigator" component={DeckNavigator} />
      </MainStack.Group>
      <MainStack.Group
        screenOptions={{
          animation: 'slide_from_bottom',
          presentation: 'modal',
          cardOverlayEnabled: true,
        }}>
        <MainStack.Screen name="CreateNavigator" component={CreateNavigator} />
      </MainStack.Group>
    </MainStack.Navigator>
  );
}

// Placeholder for Stats and Settings screens
function PlaceholderScreen() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#0066CC',
      }}>
      <Text
        style={{ color: 'white', fontSize: 18, fontFamily: 'Montserrat-Bold' }}>
        Coming Soon!
      </Text>
    </View>
  );
}

// App Component
export default function App() {
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [decks, setDecks] = useState([]);
  const [dbInitialized, setDbInitialized] = useState(false);

  // User authentication state
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const isAuthenticated = !!user;

  // Initialize database and check for logged in user
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize the database
        await initDB();
        setDbInitialized(true);

        // Check for logged in user in AsyncStorage
        const userData = await AsyncStorage.getItem('user');
        if (userData) {
          const parsedUser = JSON.parse(userData);
          setUser(parsedUser);

          // Load user's decks
          const userDecks = await getDecksForUser(parsedUser.uid);
          setDecks(userDecks);
        }
      } catch (error) {
        console.error('Error initializing app:', error);
      } finally {
        setAuthLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Request notification permissions
  useEffect(() => {
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.log('Notification permissions not granted');
      }
    })();
  }, []);

  const fetchFonts = () => {
    return Font.loadAsync({
      'Montserrat-Regular': require('./assets/Montserrat-Regular.ttf'),
      'Montserrat-Bold': require('./assets/Montserrat-Bold.ttf'),
      'Montserrat-Medium': require('./assets/Montserrat-Medium.ttf'),
    });
  };

  // Add new deck function
  const addDeck = async (newDeck) => {
    try {
      let iconToUse = newDeck.icon;

      // If no icon provided, use default
      if (!iconToUse) {
        iconToUse = require('./assets/snack-icon.png');
      }

      const deckWithIcon = {
        ...newDeck,
        icon: iconToUse,
        subtitle: `today: 0/${newDeck.cardsPerDay} cards`,
      };

      const addedDeck = await dbAddDeck(deckWithIcon, user.uid);

      setDecks((currentDecks) => [...currentDecks, addedDeck]);

      return addedDeck.id;
    } catch (error) {
      console.error('Error adding deck:', error);
      return null;
    }
  };

  // Add new card function
  const addCard = async (deckId, newCard) => {
    if (!deckId) {
      console.error('No deckId provided to addCard function');
      return;
    }

    try {
      const addedCard = await dbAddCard(newCard, deckId);

      setDecks((currentDecks) => {
        return currentDecks.map((deck) => {
          if (deck.id === deckId) {
            return {
              ...deck,
              cards: [...deck.cards, addedCard],
            };
          }
          return deck;
        });
      });
    } catch (error) {
      console.error('Error adding card:', error);
    }
  };

  // Auth functions
  const logout = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
      setDecks([]);
      return { success: true };
    } catch (error) {
      console.error('Logout error:', error);
      return { error };
    }
  };

  // Handle successful login
  const handleLoginSuccess = async (userData) => {
    try {
      await AsyncStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);

      // Load user's decks
      const userDecks = await getDecksForUser(userData.uid);
      setDecks(userDecks);
    } catch (error) {
      console.error('Error handling login success:', error);
    }
  };

  // Handle app loading with fonts
  if (!fontsLoaded) {
    return (
      <AppLoading
        startAsync={fetchFonts}
        onFinish={() => setFontsLoaded(true)}
        onError={console.warn}
      />
    );
  }

  // Show loading screen while checking authentication state
  if (authLoading || !dbInitialized) {
    return <LoadingScreen />;
  }

  // Delete deck function
  const deleteDeck = async (deckId) => {
    try {
      await dbDeleteDeck(deckId);
      setDecks((currentDecks) =>
        currentDecks.filter((deck) => deck.id !== deckId)
      );
      return { success: true };
    } catch (error) {
      console.error('Error deleting deck:', error);
      return { error };
    }
  };

  // Delete card function
  const deleteCard = async (deckId, cardId) => {
    try {
      await dbDeleteCard(cardId);

      // Update the state to reflect the deletion
      setDecks((currentDecks) => {
        return currentDecks.map((deck) => {
          if (deck.id === deckId) {
            return {
              ...deck,
              cards: deck.cards.filter((card) => card.id !== cardId),
            };
          }
          return deck;
        });
      });

      return { success: true };
    } catch (error) {
      console.error('Error deleting card:', error);
      return { error };
    }
  };

  // Delete user account
  // const deleteUser = async () => {
  //   try {
  //     if (!user) return { error: "No user logged in" };

  //     await dbDeleteUser(user.uid);
  //     await AsyncStorage.removeItem('user');
  //     setUser(null);
  //     setDecks([]);
  //     return { success: true };
  //   } catch (error) {
  //     console.error("Error deleting user:", error);
  //     return { error };
  //   }
  // };

  // Main app with context provider
  // Update the AppContext.Provider in App.js
  return (
    <AppContext.Provider
      value={{
        decks,
        addDeck,
        addCard,
        user,
        setUser, // Add this to allow updating user state
        isAuthenticated,
        logout,
        handleLoginSuccess,
        deleteDeck,
        deleteCard,
        deleteUser: async () => {
          try {
            if (!user) return { error: 'No user logged in' };

            // Delete the user from the database
            await dbDeleteUser(user.uid);

            // Clear user data from AsyncStorage
            await AsyncStorage.removeItem('user');

            // Reset state
            setUser(null);
            setDecks([]);

            return { success: true };
          } catch (error) {
            console.error('Error deleting user:', error);
            return { error };
          }
        },
        // Add these context functions to update user info
        updateUserInfo: async (field, value, currentPassword = null) => {
          try {
            let result;

            switch (field) {
              case 'username':
                result = await updateUsername(user.uid, value);
                if (result.success) {
                  const updatedUser = { ...user, displayName: value };
                  await AsyncStorage.setItem(
                    'user',
                    JSON.stringify(updatedUser)
                  );
                  setUser(updatedUser);
                }
                return result;

              case 'email':
                result = await updateEmail(user.uid, value);
                if (result.success) {
                  const updatedUser = { ...user, email: value };
                  await AsyncStorage.setItem(
                    'user',
                    JSON.stringify(updatedUser)
                  );
                  setUser(updatedUser);
                }
                return result;

              case 'password':
                if (!currentPassword)
                  throw new Error('Current password is required');
                result = await updatePassword(user.uid, currentPassword, value);
                return result;

              default:
                throw new Error('Invalid field to update');
            }
          } catch (error) {
            console.error(`Error updating ${field}:`, error);
            return { error };
          }
        },
 incrementCardCountForDeck: async (deckId) => {
  try {
    const result = await incrementCardCountToday(deckId);
    if (result.success) {
      // Update the decks state to reflect the new count
      setDecks((currentDecks) => {
        return currentDecks.map((deck) => {
          if (deck.id === deckId) {
            // Get the total number of cards for this deck
            const totalCards = deck.cards.length;
            
            return {
              ...deck,
              card_count_today: result.newCount,
              progress: result.progress,
              subtitle: `today: ${result.newCount}/${totalCards} cards`
            };
          }
          return deck;
        });
      });
    }
    return result;
  } catch (error) {
    console.error('Error incrementing card count:', error);
    return { error };
  }
}

  }
  }>
      <NavigationContainer>
        <StatusBar style="light" />
        {isAuthenticated ? (
          // Tab Navigation for authenticated users
          <Tab.Navigator
            screenOptions={({ route }) => ({
              headerShown: false,
              tabBarActiveTintColor: 'orange',
              tabBarInactiveTintColor: 'white',
              tabBarStyle: {
                backgroundColor: '#004c99',
                borderTopWidth: 0,
                elevation: 0,
                shadowOpacity: 0,
              },
              tabBarLabelStyle: {
                fontFamily: 'Montserrat-Bold',
                fontSize: 12,
              },
              tabBarIcon: ({ focused, color, size }) => {
                let iconName;
                if (route.name === 'Home') {
                  iconName = focused ? 'home' : 'home-outline';
                } else if (route.name === 'Settings') {
                  iconName = focused ? 'settings' : 'settings-outline';
                }else if (route.name === 'Location') {
                 iconName = focused ? 'location' : 'location-outline';
                }
                return <Ionicons name={iconName} size={size} color={color} />;
              },
            })}>
            <Tab.Screen name="Home" component={MainNavigator} />
            <Tab.Screen name="Location" component={LocationNavigator}/>
            <Tab.Screen name="Settings" component={SettingsScreen} />
          </Tab.Navigator>
        ) : (
          // Authentication Navigator for unauthenticated users
          <AuthNavigator />
        )}
      </NavigationContainer>
    </AppContext.Provider>
  );
}
// <Tab.Screen name="Stats" component={PlaceholderScreen} />
