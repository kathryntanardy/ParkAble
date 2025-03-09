import React, { useEffect, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import axios from "axios";

const ParkingScreen = () => {
  const [parkingData, setParkingData] = useState([]);

  useEffect(() => {
    axios.get("https://your-api.com/parking-locations")
      .then(response => setParkingData(response.data))
      .catch(error => console.log("Error fetching data:", error));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Parking Locations</Text>
      <FlatList
        data={parkingData}
        keyExtractor={(item) => item.name}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Text style={styles.cell}>{item.name}</Text>
            <Text style={styles.cell}>{item.total}</Text>
            <Text style={styles.cell}>{item.accessible}</Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20 },
  title: { fontSize: 22, fontWeight: "bold", marginBottom: 10 },
  row: { flexDirection: "row", padding: 10, borderBottomWidth: 1 },
  cell: { flex: 1, textAlign: "center" },
});

export default ParkingScreen;
