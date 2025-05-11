import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';

export default function LearningCard({ title, subtitle, progress, icon }) {
  // Handle different types of icons (URI strings, emoji strings, or require statements)
  const renderIcon = () => {
    if (!icon) {
      // Default icon if none is provided
      return <Image source={require('../assets/snack-icon.png')} style={styles.icon} />;
    }
    
    if (typeof icon === 'string') {
      if (icon.startsWith('file:') || icon.startsWith('data:')) {
        // It's an image URI
        return <Image source={{ uri: icon }} style={styles.icon} />;
      } else {
        // It's an emoji or text
        return <Text style={styles.emojiIcon}>{icon}</Text>;
      }
    } else {
      // It's an imported image
      return <Image source={icon} style={styles.icon} />;
    }
  };

  return (
    <Animatable.View animation="fadeInUp" duration={600} style={styles.card}>
      <LinearGradient colors={['#ffffff', 'lightgrey']} style={styles.innerRow}>
        {renderIcon()}
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardSubtitle}>{subtitle}</Text>
            <View style={styles.progressBarBg}>
              <View
                style={[
                  styles.progressBarFill, 
                  { width: `${Math.min(progress * 100, 100)}%` }
                ]}
              />
            </View>

        </View>
      </LinearGradient>
    </Animatable.View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginVertical: 10,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  innerRow: {
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    marginRight: 10,
    borderRadius: 8,
  },
  emojiIcon: {
    fontSize: 30,
    marginRight: 10,
    width: 40,
    textAlign: 'center',
  },
  cardTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: '#333',
  },
  cardSubtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    color: '#777',
    marginBottom: 8,
  },
  progressBarBg: {
    height: 5,
    backgroundColor: '#c7c7c8',
    borderRadius: 10,
  },
  progressBarFill: {
    height: 5,
    backgroundColor: '#FF8000',
    borderRadius: 10,
  },
});
