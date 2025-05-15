import * as SQLite from 'expo-sqlite';
import * as Crypto from 'expo-crypto';

// Open database - correct syntax for expo-sqlite
const db = SQLite.openDatabase('flashcards.db');

// Initialize database tables
const initDB = () => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // Create users table
      tx.executeSql(
        'CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE, name TEXT, password_hash TEXT, created_at TEXT)',
        [],
        () => {
          // Create decks table with card_count_today field
          tx.executeSql(
            'CREATE TABLE IF NOT EXISTS decks (id TEXT PRIMARY KEY, title TEXT, subtitle TEXT, progress REAL, icon TEXT, cards_per_day INTEGER, user_id TEXT, card_count_today INTEGER DEFAULT 0, last_updated TEXT, FOREIGN KEY (user_id) REFERENCES users (id))',
            [],
            () => {
              // Create cards table
              tx.executeSql(
                'CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, front TEXT, back TEXT, notes TEXT, deck_id TEXT, FOREIGN KEY (deck_id) REFERENCES decks (id))',
                [],
                () => {
                  // Create location_cards table
                  tx.executeSql(
                    'CREATE TABLE IF NOT EXISTS location_cards (id TEXT PRIMARY KEY, title TEXT, question TEXT, answer TEXT, notes TEXT, latitude REAL, longitude REAL, user_id TEXT, created_at TEXT, FOREIGN KEY (user_id) REFERENCES users (id))',
                    [],
                    () => {
                      resolve();
                    },
                    (_, error) => {
                      reject(error);
                      return true;
                    }
                  );
                },
                (_, error) => {
                  reject(error);
                  return true;
                }
              );
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Hash password for security
const hashPassword = async (password) => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password
  );
  return digest;
};

// Register user
const registerUser = async (email, password, name) => {
  try {
    const passwordHash = await hashPassword(password);
    const userId = generateUUID();
    const createdAt = new Date().toISOString();

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'INSERT INTO users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)',
          [userId, email, name, passwordHash, createdAt],
          (_, result) => {
            resolve({ user: { uid: userId, email, displayName: name } });
          },
          (_, error) => {
            // Check for duplicate email
            if (error.message.includes('UNIQUE constraint failed')) {
              reject({
                code: 'auth/email-already-in-use',
                message: 'Email already in use',
              });
            } else {
              reject({ code: 'auth/unknown', message: error.message });
            }
            return true; // Prevent default error handling
          }
        );
      });
    });
  } catch (error) {
    return { error };
  }
};

// Login user
const loginUser = async (email, password) => {
  try {
    const passwordHash = await hashPassword(password);

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM users WHERE email = ?',
          [email],
          (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              if (user.password_hash === passwordHash) {
                resolve({
                  user: {
                    uid: user.id,
                    email: user.email,
                    displayName: user.name,
                  },
                });
              } else {
                reject({
                  code: 'auth/wrong-password',
                  message: 'Incorrect password',
                });
              }
            } else {
              reject({
                code: 'auth/user-not-found',
                message: 'User not found',
              });
            }
          },
          (_, error) => {
            reject({ code: 'auth/unknown', message: error.message });
            return true;
          }
        );
      });
    });
  } catch (error) {
    return { error };
  }
};

// Generate UUID for IDs
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

// Check if we need to reset daily card counts (if it's a new day)
const checkAndResetDailyCounts = (deck) => {
  const today = new Date().toISOString().split('T')[0];
  const lastUpdated = deck.last_updated
    ? deck.last_updated.split('T')[0]
    : null;

  if (lastUpdated !== today) {
    return {
      ...deck,
      card_count_today: 0,
      last_updated: new Date().toISOString(),
    };
  }
  return deck;
};

// Get decks for current user
const getDecksForUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM decks WHERE user_id = ?',
        [userId],
        async (_, { rows }) => {
          const decks = [];
          for (let i = 0; i < rows.length; i++) {
            let deck = rows.item(i);

            // Check if we need to reset daily counts
            deck = checkAndResetDailyCounts(deck);

            // If the deck was reset, update it in the database
            if (deck.card_count_today === 0) {
              tx.executeSql(
                'UPDATE decks SET card_count_today = 0, last_updated = ? WHERE id = ?',
                [deck.last_updated, deck.id]
              );
            }

            // Get the cards for this deck
            const cards = await getCardsForDeck(deck.id);

            // Update subtitle to show today's progress with actual card count
            const totalCards = cards.length;
            const subtitle = `today: ${deck.card_count_today}/${totalCards} cards`;

            decks.push({
              ...deck,
              subtitle,
              cards,
              // Calculate progress based on actual cards, not cards_per_day
              progress: totalCards > 0 ? deck.card_count_today / totalCards : 0,
            });
          }
          resolve(decks);
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Get cards for a deck
const getCardsForDeck = (deckId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM cards WHERE deck_id = ?',
        [deckId],
        (_, { rows }) => {
          const cards = [];
          for (let i = 0; i < rows.length; i++) {
            cards.push(rows.item(i));
          }
          resolve(cards);
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Add a new deck
const addDeck = (deck, userId) => {
  return new Promise((resolve, reject) => {
    const deckId = generateUUID();

    // Convert the icon to a string if it's not already
    let iconValue = deck.icon;
    if (typeof iconValue !== 'string' && iconValue !== null) {
      // If it's a require() result, we can't store that directly
      // Use default icon path instead
      iconValue = 'default_icon';
    }

    const now = new Date().toISOString();

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO decks (id, title, subtitle, progress, icon, cards_per_day, user_id, card_count_today, last_updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          deckId,
          deck.title,
          deck.subtitle || `today: 0/0 cards`, // Initialize with 0/0 for new deck
          deck.progress || 0,
          iconValue,
          deck.cardsPerDay,
          userId,
          0,
          now,
        ],
        (_, result) => {
          resolve({
            id: deckId,
            ...deck,
            card_count_today: 0,
            last_updated: now,
            cards: [],
            subtitle: `today: 0/0 cards`, // Ensure subtitle is set correctly
          });
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Add a card to a deck
const addCard = (card, deckId) => {
  return new Promise((resolve, reject) => {
    const cardId = generateUUID();

    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO cards (id, front, back, notes, deck_id) VALUES (?, ?, ?, ?, ?)',
        [cardId, card.front, card.back, card.notes || '', deckId],
        (_, result) => {
          resolve({
            id: cardId,
            ...card,
          });
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Increment card count for today
const incrementCardCountToday = (deckId) => {
  return new Promise((resolve, reject) => {
    const now = new Date().toISOString();

    db.transaction((tx) => {
      // First get the current deck and its cards to check counts
      tx.executeSql(
        'SELECT * FROM decks WHERE id = ?',
        [deckId],
        async (_, { rows }) => {
          if (rows.length > 0) {
            let deck = rows.item(0);
            deck = checkAndResetDailyCounts(deck);

            // Get actual cards count
            const cards = await getCardsForDeck(deckId);
            const totalCards = cards.length;

            // Increment the card count
            const newCount = deck.card_count_today + 1;

            tx.executeSql(
              'UPDATE decks SET card_count_today = ?, last_updated = ? WHERE id = ?',
              [newCount, now, deckId],
              (_, updateResult) => {
                resolve({
                  success: true,
                  newCount,
                  // Calculate progress based on actual cards
                  progress: totalCards > 0 ? newCount / totalCards : 0,
                });
              },
              (_, error) => {
                reject(error);
                return true;
              }
            );
          } else {
            reject({ message: 'Deck not found' });
          }
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Delete a deck and its cards
const deleteDeck = (deckId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // First delete all cards associated with the deck
      tx.executeSql(
        'DELETE FROM cards WHERE deck_id = ?',
        [deckId],
        (_, cardResult) => {
          // Then delete the deck itself
          tx.executeSql(
            'DELETE FROM decks WHERE id = ?',
            [deckId],
            (_, deckResult) => {
              resolve({
                success: true,
                deletedCardCount: cardResult.rowsAffected,
              });
            },
            (_, error) => {
              reject(error);
              return true;
            }
          );
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Delete a card from a deck
const deleteCard = (cardId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM cards WHERE id = ?',
        [cardId],
        (_, result) => {
          resolve({ success: true, deletedCount: result.rowsAffected });
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Delete a user and all their data
const deleteUser = (userId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      // First get all decks for the user
      tx.executeSql(
        'SELECT id FROM decks WHERE user_id = ?',
        [userId],
        (_, { rows }) => {
          const deckIds = [];
          for (let i = 0; i < rows.length; i++) {
            deckIds.push(rows.item(i).id);
          }

          // Delete all cards for all decks
          const deleteCards = () => {
            if (deckIds.length > 0) {
              const placeholders = deckIds.map(() => '?').join(',');
              tx.executeSql(
                `DELETE FROM cards WHERE deck_id IN (${placeholders})`,
                [...deckIds],
                () => {
                  // Delete all decks
                  tx.executeSql(
                    'DELETE FROM decks WHERE user_id = ?',
                    [userId],
                    () => {
                      // Finally delete the user
                      tx.executeSql(
                        'DELETE FROM users WHERE id = ?',
                        [userId],
                        (_, result) => {
                          resolve({ success: true });
                        },
                        (_, error) => {
                          reject(error);
                          return true;
                        }
                      );
                    },
                    (_, error) => {
                      reject(error);
                      return true;
                    }
                  );
                },
                (_, error) => {
                  reject(error);
                  return true;
                }
              );
            } else {
              // No decks, just delete the user
              tx.executeSql(
                'DELETE FROM users WHERE id = ?',
                [userId],
                (_, result) => {
                  resolve({ success: true });
                },
                (_, error) => {
                  reject(error);
                  return true;
                }
              );
            }
          };

          deleteCards();
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Update user's username
const updateUsername = (userId, newUsername) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'UPDATE users SET name = ? WHERE id = ?',
        [newUsername, userId],
        (_, result) => {
          if (result.rowsAffected > 0) {
            resolve({ success: true });
          } else {
            reject({ message: 'No user found with that ID' });
          }
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Update user's email
const updateEmail = (userId, newEmail) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM users WHERE email = ? AND id != ?',
        [newEmail, userId],
        (_, { rows }) => {
          if (rows.length > 0) {
            reject({
              code: 'auth/email-already-in-use',
              message: 'Email already in use',
            });
          } else {
            tx.executeSql(
              'UPDATE users SET email = ? WHERE id = ?',
              [newEmail, userId],
              (_, result) => {
                if (result.rowsAffected > 0) {
                  resolve({ success: true });
                } else {
                  reject({ message: 'No user found with that ID' });
                }
              },
              (_, error) => {
                reject(error);
                return true;
              }
            );
          }
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Update user's password
const updatePassword = async (userId, currentPassword, newPassword) => {
  try {
    const currentPasswordHash = await hashPassword(currentPassword);
    const newPasswordHash = await hashPassword(newPassword);

    return new Promise((resolve, reject) => {
      db.transaction((tx) => {
        tx.executeSql(
          'SELECT * FROM users WHERE id = ?',
          [userId],
          (_, { rows }) => {
            if (rows.length > 0) {
              const user = rows.item(0);
              if (user.password_hash === currentPasswordHash) {
                tx.executeSql(
                  'UPDATE users SET password_hash = ? WHERE id = ?',
                  [newPasswordHash, userId],
                  (_, result) => {
                    if (result.rowsAffected > 0) {
                      resolve({ success: true });
                    } else {
                      reject({ message: 'Failed to update password' });
                    }
                  },
                  (_, error) => {
                    reject(error);
                    return true;
                  }
                );
              } else {
                reject({
                  code: 'auth/wrong-password',
                  message: 'Current password is incorrect',
                });
              }
            } else {
              reject({
                code: 'auth/user-not-found',
                message: 'User not found',
              });
            }
          },
          (_, error) => {
            reject(error);
            return true;
          }
        );
      });
    });
  } catch (error) {
    return { error };
  }
};

// Get user details
const getUserDetails = (userId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT id, email, name, created_at FROM users WHERE id = ?',
        [userId],
        (_, { rows }) => {
          if (rows.length > 0) {
            resolve(rows.item(0));
          } else {
            reject({ message: 'User not found' });
          }
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Save a location card to the database
const saveLocationCard = (card) => {
  return new Promise((resolve, reject) => {
    const cardId = generateUUID();
    
    db.transaction((tx) => {
      tx.executeSql(
        'INSERT INTO location_cards (id, title, question, answer, notes, latitude, longitude, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [
          cardId,
          card.title,
          card.question,
          card.answer,
          card.notes || '',
          card.latitude,
          card.longitude,
          card.userId,
          card.createdAt
        ],
        (_, result) => {
          resolve({
            id: cardId,
            ...card
          });
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Get all location cards for a user
const getLocationCards = (userId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'SELECT * FROM location_cards WHERE user_id = ? ORDER BY created_at DESC',
        [userId],
        (_, { rows }) => {
          const cards = [];
          for (let i = 0; i < rows.length; i++) {
            cards.push(rows.item(i));
          }
          resolve(cards);
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};


// Delete a location card
const deleteLocationCard = (cardId) => {
  return new Promise((resolve, reject) => {
    db.transaction((tx) => {
      tx.executeSql(
        'DELETE FROM location_cards WHERE id = ?',
        [cardId],
        (_, result) => {
          resolve({ success: true, deletedCount: result.rowsAffected });
        },
        (_, error) => {
          reject(error);
          return true;
        }
      );
    });
  });
};

// Add these to exports
export {
  db,
  initDB,
  registerUser,
  loginUser,
  getDecksForUser,
  getCardsForDeck,
  addDeck,
  addCard,
  generateUUID,
  deleteDeck,
  deleteCard,
  deleteUser,
  updateUsername,
  updateEmail,
  updatePassword,
  getUserDetails,
  incrementCardCountToday,
  saveLocationCard,
  getLocationCards,
  deleteLocationCard,
};
