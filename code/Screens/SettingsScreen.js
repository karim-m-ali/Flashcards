import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView, 
  Alert,
  ActivityIndicator,
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AppContext } from '../App';

export default function SettingsScreen({ navigation }) {
  const { user, logout, deleteUser, updateUserInfo } = useContext(AppContext);
  const [loading, setLoading] = useState(false);
  
  // Modal states
  const [usernameModalVisible, setUsernameModalVisible] = useState(false);
  const [emailModalVisible, setEmailModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  
  // Form states
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Set initial values
  useEffect(() => {
    if (user) {
      setNewUsername(user.displayName || '');
      setNewEmail(user.email || '');
    }
  }, [user]);
  
  // Handle logout
  const handleLogout = async () => {
    Alert.alert(
      "Logout",
      "Are you sure you want to logout?",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Logout",
          onPress: async () => {
            setLoading(true);
            try {
              const result = await logout();
              if (result.error) {
                Alert.alert("Error", "Failed to logout: " + result.error.message);
              }
              // No need for else - if logout is successful, the app will redirect to login screen
            } catch (error) {
              console.error("Error logging out:", error);
              Alert.alert("Error", "An unexpected error occurred while logging out.");
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };
  
  // Handle delete account
  const handleDeleteAccount = () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone and all your data will be permanently lost.",
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: () => confirmDeleteAccount(),
          style: "destructive"
        }
      ]
    );
  };
  
  // Confirm delete account
  const confirmDeleteAccount = () => {
    if (Platform.OS === 'ios') {
      Alert.prompt(
        "Confirm Deletion",
        "Please type 'DELETE' to confirm account deletion",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete Account",
            onPress: (text) => {
              if (text === 'DELETE') {
                deleteUserAccount();
              } else {
                Alert.alert("Error", "Confirmation text didn't match. Account not deleted.");
              }
            },
            style: "destructive"
          }
        ],
        "plain-text"
      );
    } else {
      // For Android, just use a confirmation dialog
      Alert.alert(
        "Confirm Deletion",
        "This will permanently delete your account and all your data. Are you absolutely sure?",
        [
          {
            text: "Cancel",
            style: "cancel"
          },
          {
            text: "Delete Account",
            onPress: () => deleteUserAccount(),
            style: "destructive"
          }
        ]
      );
    }
  };
  
  // Delete user account function
  const deleteUserAccount = async () => {
    setLoading(true);
    try {
      const result = await deleteUser();
      if (result.error) {
        Alert.alert("Error", "Failed to delete account: " + (result.error.message || "Unknown error"));
      }
      // No need for success alert - if deletion is successful, user will be redirected to login screen
    } catch (error) {
      console.error("Error deleting account:", error);
      Alert.alert("Error", "Failed to delete account. Please try again.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update username
  const handleUpdateUsername = async () => {
    if (!newUsername.trim()) {
      Alert.alert("Error", "Username cannot be empty.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateUserInfo('username', newUsername);
      if (result.error) {
        Alert.alert("Error", "Failed to update username: " + (result.error.message || "Unknown error"));
      } else {
        Alert.alert("Success", "Username updated successfully.");
        setUsernameModalVisible(false);
      }
    } catch (error) {
      console.error("Error updating username:", error);
      Alert.alert("Error", "An unexpected error occurred while updating username.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update email
  const handleUpdateEmail = async () => {
    if (!newEmail.trim()) {
      Alert.alert("Error", "Email cannot be empty.");
      return;
    }
    
    // Simple email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail)) {
      Alert.alert("Error", "Please enter a valid email address.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateUserInfo('email', newEmail);
      if (result.error) {
        Alert.alert("Error", "Failed to update email: " + (result.error.message || "Unknown error"));
      } else {
        Alert.alert("Success", "Email updated successfully.");
        setEmailModalVisible(false);
      }
    } catch (error) {
      console.error("Error updating email:", error);
      Alert.alert("Error", "An unexpected error occurred while updating email.");
    } finally {
      setLoading(false);
    }
  };
  
  // Update password
  const handleUpdatePassword = async () => {
    if (!currentPassword) {
      Alert.alert("Error", "Current password is required.");
      return;
    }
    
    if (!newPassword || newPassword.length < 6) {
      Alert.alert("Error", "New password must be at least 6 characters.");
      return;
    }
    
    if (newPassword !== confirmPassword) {
      Alert.alert("Error", "New passwords don't match.");
      return;
    }
    
    setLoading(true);
    try {
      const result = await updateUserInfo('password', newPassword, currentPassword);
      if (result.error) {
        Alert.alert("Error", "Failed to update password: " + (result.error.message || "Unknown error"));
      } else {
        Alert.alert("Success", "Password updated successfully.");
        setPasswordModalVisible(false);
        // Clear password fields
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (error) {
      console.error("Error updating password:", error);
      Alert.alert("Error", "An unexpected error occurred while updating password.");
    } finally {
      setLoading(false);
    }
  };
  
  // Username edit modal
  const renderUsernameModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={usernameModalVisible}
      onRequestClose={() => setUsernameModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Username</Text>
          
          <TextInput
            style={styles.input}
            placeholder="New Username"
            placeholderTextColor="#888"
            value={newUsername}
            onChangeText={setNewUsername}
            autoCapitalize="none"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setUsernameModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleUpdateUsername}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Email edit modal
  const renderEmailModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={emailModalVisible}
      onRequestClose={() => setEmailModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Edit Email</Text>
          
          <TextInput
            style={styles.input}
            placeholder="New Email"
            placeholderTextColor="#888"
            value={newEmail}
            onChangeText={setNewEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => setEmailModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleUpdateEmail}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Password edit modal
  const renderPasswordModal = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={passwordModalVisible}
      onRequestClose={() => setPasswordModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Change Password</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Current Password"
            placeholderTextColor="#888"
            value={currentPassword}
            onChangeText={setCurrentPassword}
            secureTextEntry={true}
          />
          
          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor="#888"
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={true}
          />
          
          <TextInput
            style={styles.input}
            placeholder="Confirm New Password"
            placeholderTextColor="#888"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={true}
          />
          
          <View style={styles.modalButtons}>
            <TouchableOpacity 
              style={[styles.modalButton, styles.cancelButton]} 
              onPress={() => {
                setPasswordModalVisible(false);
                // Clear password fields
                setCurrentPassword('');
                setNewPassword('');
                setConfirmPassword('');
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={[styles.modalButton, styles.saveButton]} 
              onPress={handleUpdatePassword}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.buttonText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
  
  // Account settings section
  const renderAccountSettings = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Account Settings</Text>
      
      <TouchableOpacity 
        style={styles.settingRow} 
        onPress={() => setUsernameModalVisible(true)}
      >
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Edit Username</Text>
          <Text style={styles.settingDescription}>{user?.displayName || 'Set username'}</Text>
        </View>
        <View style={styles.settingValue}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingRow} 
        onPress={() => setEmailModalVisible(true)}
      >
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Edit Email</Text>
          <Text style={styles.settingDescription}>{user?.email}</Text>
        </View>
        <View style={styles.settingValue}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.settingRow}
        onPress={() => setPasswordModalVisible(true)}
      >
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Change Password</Text>
          <Text style={styles.settingDescription}>Update your account password</Text>
        </View>
        <View style={styles.settingValue}>
          <Ionicons name="chevron-forward" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.settingRow} onPress={handleLogout}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>Logout</Text>
          <Text style={styles.settingDescription}>Sign out from your account</Text>
        </View>
        <View style={styles.settingValue}>
          <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      
      <TouchableOpacity style={styles.dangerRow} onPress={handleDeleteAccount}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.dangerTitle}>Delete Account</Text>
          <Text style={styles.dangerDescription}>Permanently remove your account and all data</Text>
        </View>
        <View style={styles.settingValue}>
          <Ionicons name="trash-outline" size={20} color="#FF3B30" />
        </View>
      </TouchableOpacity>
    </View>
  );
  
  // About section
  const renderAboutSection = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>About</Text>
      
      <TouchableOpacity style={styles.settingRow}>
        <View style={styles.settingTextContainer}>
          <Text style={styles.settingTitle}>App Version</Text>
          <Text style={styles.settingDescription}>Current version of the app</Text>
        </View>
        <View style={styles.settingValue}>
          <Text style={styles.settingValueText}>1.0.0</Text>
        </View>
      </TouchableOpacity>
    </View>
  );
  
  // Extract username from email if no display name is available
  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  
  return (
    <LinearGradient
      colors={['#3399ff', '#0066cc', '#004c99']}
      style={styles.container}
    >
      {loading && !usernameModalVisible && !emailModalVisible && !passwordModalVisible ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
        </View>
      ) : (
        <>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Settings</Text>
          </View>
          
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.profileSection}>
              <View style={styles.profileIcon}>
                <Text style={styles.profileInitial}>{displayName.charAt(0).toUpperCase()}</Text>
              </View>
              <Text style={styles.profileName}>{displayName}</Text>
              <Text style={styles.profileEmail}>{user?.email}</Text>
            </View>
            
            {renderAccountSettings()}
            {renderAboutSection()}
            
            <View style={styles.footer}>
              <Text style={styles.footerText}>FlashCards App © 2025</Text>
            </View>
          </ScrollView>
          
          {/* Render modals */}
          {renderUsernameModal()}
          {renderEmailModal()}
          {renderPasswordModal()}
        </>
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 26,
    fontFamily: 'Montserrat-Bold',
    color: 'white',
  },
  scrollView: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  profileInitial: {
    fontSize: 36,
    fontFamily: 'Montserrat-Bold',
    color: 'white',
  },
  profileName: {
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    color: 'white',
    marginBottom: 5,
  },
  profileEmail: {
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  section: {
    marginBottom: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: 'white',
    marginBottom: 15,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  dangerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 60, 60, 0.3)',
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    color: 'white',
  },
  settingDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(255, 255, 255, 0.7)',
    marginTop: 3,
  },
  dangerTitle: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    color: '#FF3B30',
  },
  dangerDescription: {
    fontSize: 13,
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(255, 59, 48, 1)',
    marginTop: 3,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValueText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Medium',
    color: 'white',
    marginRight: 5,
  },
  footer: {
    alignItems: 'center',
    marginVertical: 30,
  },
  footerText: {
    fontSize: 14,
    fontFamily: 'Montserrat-Regular',
    color: 'rgba(255, 255, 255, 0.5)',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Montserrat-Bold',
    color: '#004c99',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#333',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 5,
  },
  cancelButton: {
    backgroundColor: '#ddd',
  },
  saveButton: {
    backgroundColor: '#0066cc',
  },
  buttonText: {
    fontSize: 16,
    fontFamily: 'Montserrat-Bold',
    color: '#fff',
  },
});