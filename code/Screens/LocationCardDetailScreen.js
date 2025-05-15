import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

// Optional import for maps - will use if available
let MapView, Marker;
try {
  const Maps = require('react-native-maps');
  MapView = Maps.default;
  Marker = Maps.Marker;
} catch (err) {
  console.log("react-native-maps not available");
}

export default function LocationCardDetailScreen({ route, navigation }) {
  const { card } = route.params;
  
  // Function to open location in native maps app
  const openInMaps = () => {
    const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
    const latLng = `${card.latitude},${card.longitude}`;
    const label = card.title;
    const url = Platform.select({
      ios: `${scheme}${label}@${latLng}`,
      android: `${scheme}${latLng}(${label})`
    });
    
    Linking.openURL(url);
  };

  return (
    <LinearGradient
      colors={['#3399ff', '#0066cc', '#004c99']}
      style={styles.container}
    >
      {/* Header with back button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Location Card</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content}>
        {/* Card title */}
        <Text style={styles.title}>{card.title}</Text>

        {/* Location Map or Location Info */}
        <View style={styles.mapContainer}>
          {MapView ? (
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: card.latitude,
                longitude: card.longitude,
                latitudeDelta: 0.005,
                longitudeDelta: 0.005,
              }}
              scrollEnabled={false}
            >
              <Marker
                coordinate={{
                  latitude: card.latitude,
                  longitude: card.longitude,
                }}
                title={card.title}
              />
            </MapView>
          ) : (
            <View style={styles.locationInfoContainer}>
              <Ionicons name="location" size={24} color="white" />
              <Text style={styles.locationInfoText}>
                Location: {card.latitude.toFixed(6)}, {card.longitude.toFixed(6)}
              </Text>
              <TouchableOpacity
                style={styles.openMapsButton}
                onPress={openInMaps}
              >
                <Text style={styles.openMapsButtonText}>Open in Maps</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Question and Answer */}
        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Question:</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardText}>{card.question}</Text>
          </View>
        </View>

        <View style={styles.cardSection}>
          <Text style={styles.sectionTitle}>Answer:</Text>
          <View style={styles.cardContent}>
            <Text style={styles.cardText}>{card.answer}</Text>
          </View>
        </View>

        {/* Notes (if any) */}
        {card.notes && (
          <View style={styles.cardSection}>
            <Text style={styles.sectionTitle}>Notes:</Text>
            <View style={styles.cardContent}>
              <Text style={styles.cardText}>{card.notes}</Text>
            </View>
          </View>
        )}

        {/* Created date */}
        <View style={styles.dateContainer}>
          <Ionicons name="time-outline" size={16} color="white" />
          <Text style={styles.dateText}>
            Created: {new Date(card.createdAt).toLocaleDateString()}
          </Text>
        </View>
      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: 'white',
  },
  placeholder: {
    width: 24,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 24,
    color: 'white',
    marginBottom: 20,
  },
  mapContainer: {
    height: 200,
    borderRadius: 15,
    overflow: 'hidden',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  locationInfoContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 15,
  },
  locationInfoText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 14,
    color: 'white',
    marginTop: 10,
    marginBottom: 15,
  },
  openMapsButton: {
    backgroundColor: '#FF8000',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  openMapsButtonText: {
    fontFamily: 'Montserrat-Bold',
    color: 'white',
    fontSize: 14,
  },
  cardSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: 'white',
    marginBottom: 8,
  },
  cardContent: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    padding: 15,
  },
  cardText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 16,
    color: 'white',
  },
  dateContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 30,
  },
  dateText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: 'white',
    opacity: 0.8,
    marginLeft: 5,
  },
});
