// components/FormInput.js
import React, { useState } from 'react';
import { 
  View, 
  TextInput, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function FormInput({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
  error = '',
  validator = null
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecureVisible, setIsSecureVisible] = useState(!secureTextEntry);
  const [localError, setLocalError] = useState('');
  
  const validate = (text) => {
    if (validator) {
      const result = validator(text);
      setLocalError(result);
      return result === '';
    }
    return true;
  };
  
  const handleChangeText = (text) => {
    onChangeText(text);
    if (isFocused) {
      validate(text);
    }
  };
  
  const handleBlur = () => {
    setIsFocused(false);
    validate(value);
  };
  
  const displayedError = error || localError;
  const hasError = displayedError !== '';
  
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[
        styles.inputContainer,
        isFocused && styles.inputContainerFocused,
        hasError && styles.inputContainerError
      ]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={handleChangeText}
          placeholder={placeholder}
          placeholderTextColor="#a0a0a0"
          secureTextEntry={secureTextEntry && !isSecureVisible}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setIsFocused(true)}
          onBlur={handleBlur}
        />
        
        {secureTextEntry && (
          <TouchableOpacity 
            style={styles.visibilityIcon}
            onPress={() => setIsSecureVisible(!isSecureVisible)}
          >
            <Ionicons 
              name={isSecureVisible ? "eye-off" : "eye"} 
              size={24} 
              color="#a0a0a0" 
            />
          </TouchableOpacity>
        )}
      </View>
      
      {hasError && (
        <Text style={styles.errorText}>{displayedError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    marginBottom: 8,
    fontFamily: 'Montserrat-Medium',
    color: '#333',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 10,
    backgroundColor: '#f8f8f8',
  },
  inputContainerFocused: {
    borderColor: '#0066CC',
    borderWidth: 2,
  },
  inputContainerError: {
    borderColor: '#ff3b30',
    borderWidth: 2,
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: 'Montserrat-Regular',
    color: '#333',
  },
  visibilityIcon: {
    padding: 12,
  },
  errorText: {
    fontSize: 14,
    color: '#ff3b30',
    marginTop: 6,
    fontFamily: 'Montserrat-Regular',
  }
});
