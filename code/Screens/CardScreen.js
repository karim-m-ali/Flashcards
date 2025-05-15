import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function CardScreen({ route }) {
  const card = route?.params?.card;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        {card ? card.title : 'Card Details Screen'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0066cc',
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    color: 'white',
    fontFamily: 'Montserrat-Bold',
    fontSize: 22,
  },
});