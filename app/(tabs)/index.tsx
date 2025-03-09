import React, { useState, useEffect } from "react";
import { View, StyleSheet, TextInput } from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import axios from "axios";

import { Ionicons } from "@expo/vector-icons"; // Make sure to install expo/vector-icons

export default function HomeScreen() {
  const [parkingSpots, setParkingSpots] = useState<LatLng[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  useEffect(() => {
    axios.get("https://your-api.com/parking-spots")
      .then(response => setParkingSpots(response.data))
      .catch(error => console.log("Error fetching data:", error));
  }, []);
  
  // const handleSearch = (text) => {
  //   setSearchQuery(text);
  //   // implement search functionality
  // };
  
  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a destination"
          placeholderTextColor="#999" // Ensure the placeholder is visible
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 49.2827,
          longitude: -123.1207,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >  
        {parkingSpots.map((spot, index) => (
          <Marker
            key={index}
            coordinate={spot}
            title="Accessible Parking"
          />
        ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  map: { 
    width: "100%", 
    height: "100%" 
  },
  searchContainer: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 20,
  }
});