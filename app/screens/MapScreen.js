import React, { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import axios from "axios";

const MapScreen = () => {
  const [parkingSpots, setParkingSpots] = useState([]);

  useEffect(() => {
    axios.get("https://your-api.com/parking-spots")
      .then(response => setParkingSpots(response.data))
      .catch(error => console.log("Error fetching data:", error));
  }, []);

  return (
    <View style={styles.container}>
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
            coordinate={{ latitude: spot.lat, longitude: spot.lng }} 
            title="Accessible Parking" 
          />
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { width: "100%", height: "100%" },
});

export default MapScreen;
