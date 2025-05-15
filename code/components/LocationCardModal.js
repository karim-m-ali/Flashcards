import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function LocationCardModal({ visible, onClose, onSave }) {
  const [title, setTitle] = useState('');
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = () => {
    // Validate inputs
    if (!title.trim() || !question.trim() || !answer.trim()) {
      alert('Please fill in all required fields');
      return;
    }

    // Create card data
    const cardData = {
      title: title.trim(),
      question: question.trim(),
      answer: answer.trim(),
      notes: notes.trim(),
    };

    // Pass data back to parent
    onSave(cardData);

    // Reset form
    setTitle('');
    setQuestion('');
    setAnswer('');
    setNotes('');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.modalContainer}
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Create Location Card</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <Text style={styles.label}>Title *</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="Give your location card a title"
              placeholderTextColor="#999"
            />

            <Text style={styles.label}>Question *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={question}
              onChangeText={setQuestion}
              placeholder="Enter the question"
              placeholderTextColor="#999"
              multiline
            />

            <Text style={styles.label}>Answer *</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={answer}
              onChangeText={setAnswer}
              placeholder="Enter the answer"
              placeholderTextColor="#999"
              multiline
            />

            <Text style={styles.label}>Notes (Optional)</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Any additional notes"
              placeholderTextColor="#999"
              multiline
            />

            <View style={styles.locationNote}>
              <Ionicons name="location" size={16} color="#0066cc" />
              <Text style={styles.locationNoteText}>
                This card will be linked to your current location
              </Text>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={styles.saveButton}
            onPress={handleSubmit}
          >
            <Text style={styles.saveButtonText}>Save Location Card</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Montserrat-Bold',
    color: '#333',
  },
  formContainer: {
    marginTop: 15,
  },
  label: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: '#555',
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    marginBottom: 10,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  locationNote: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e6f2ff',
    padding: 10,
    borderRadius: 8,
    marginVertical: 15,
  },
  locationNoteText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#0066cc',
    marginLeft: 8,
  },
  saveButton: {
    backgroundColor: '#FF8000',
    borderRadius: 8,
    padding: 15,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    color: 'white',
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
  },
});
