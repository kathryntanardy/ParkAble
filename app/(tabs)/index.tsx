import React, { useState, useEffect, useRef } from "react";
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Animated, 
  ScrollView,
  Dimensions,
  Platform,
  PanResponder
} from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { height } = Dimensions.get("window");

interface ParkingSpot {
  id: number;
  name: string;
  address: string;
  spotsAvailable: number;
  accessibleSpots: number;
  coordinate?: LatLng;
}

export default function HomeScreen() {
  const [parkingSpots, setParkingSpots] = useState<LatLng[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(true);
  const [activeParkingSpots, setActiveParkingSpots] = useState<ParkingSpot[]>([]);
  
  // Animation for the slide-up panel
  const slideUpAnim = useRef(new Animated.Value(0)).current;
  
  // Fake parking data with coordinates for the map markers
  const fakeParkingData: ParkingSpot[] = [
    { 
      id: 1, 
      name: "University Blvd Lot", 
      address: "6131 University Blvd, Vancouver", 
      spotsAvailable: 15, 
      accessibleSpots: 15,
      coordinate: { latitude: 49.2665, longitude: -123.2465 }
    },
    { 
      id: 2, 
      name: "Agronomy Road Parking", 
      address: "6152 Agronomy Rd, Vancouver", 
      spotsAvailable: 15, 
      accessibleSpots: 15,
      coordinate: { latitude: 49.2610, longitude: -123.2495 }
    },
    { 
      id: 3, 
      name: "West Parkade", 
      address: "2140 Lower Mall, Vancouver", 
      spotsAvailable: 8, 
      accessibleSpots: 4,
      coordinate: { latitude: 49.2675, longitude: -123.2560 }
    },
    { 
      id: 4, 
      name: "North Parkade", 
      address: "6115 Student Union Blvd, Vancouver", 
      spotsAvailable: 12, 
      accessibleSpots: 6,
      coordinate: { latitude: 49.2685, longitude: -123.2495 }
    }
  ];

  // Pan responder for the draggable drawer
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          slideUpAnim.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 100) {
          // User dragged down far enough to collapse the drawer
          toggleDrawer();
        } else {
          // Spring back to open position
          Animated.spring(slideUpAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  useEffect(() => {
    // Set the fake data initially
    setActiveParkingSpots(fakeParkingData);
    
    // Mock API call
    axios.get("https://your-api.com/parking-spots")
      .then(response => setParkingSpots(response.data))
      .catch(error => console.log("Error fetching data:", error));
  }, []);

  const toggleDrawer = () => {
    const toValue = drawerVisible ? height * 0.7 : 0;
    
    Animated.spring(slideUpAnim, {
      toValue,
      useNativeDriver: true,
    }).start();
    
    setDrawerVisible(!drawerVisible);
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: 49.2665,
          longitude: -123.2450,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >
        {fakeParkingData.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={spot.coordinate as LatLng}
            title={spot.name}
            description={`${spot.spotsAvailable} spots available`}
          />
        ))}
      </MapView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="University of British Columbia"
          placeholderTextColor="#999"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      {/* Current Location Button */}
      <TouchableOpacity style={styles.locationButton}>
        <Ionicons name="navigate" size={24} color="#4CAF50" />
      </TouchableOpacity>

      {/* Slide-up Drawer */}
      <Animated.View 
        style={[
          styles.slideUpPanel,
          {
            transform: [{ translateY: slideUpAnim }],
          },
        ]}
      >
        {/* Handle bar for drag interaction */}
        <View 
          {...panResponder.panHandlers}
          style={styles.dragHandle}
        >
          <View style={styles.dragIndicator} />
        </View>

        {/* Panel Content */}
        <ScrollView style={styles.panelContent}>
          {activeParkingSpots.map((spot) => (
            <View key={spot.id} style={styles.parkingItem}>
              <Text style={styles.parkingTitle}>{spot.name}</Text>
              <Text style={styles.parkingAddress}>{spot.address}</Text>
              
              <View style={styles.spotInfoContainer}>
                <View style={styles.spotIconContainer}>
                  <Text style={styles.spotIconText}>P</Text>
                </View>
                <Text style={styles.spotText}>{spot.spotsAvailable} spots available</Text>
              </View>
              
              <View style={styles.accessibleInfoContainer}>
                <View style={styles.accessibleIconContainer}>
                  <Text style={styles.accessibleIconText}>A</Text>
                </View>
                <Text style={styles.spotText}>{spot.accessibleSpots} accessible spots available</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </Animated.View>
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
    alignItems: 'center',
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
  },
  locationButton: {
    position: 'absolute',
    bottom: 280,
    right: 16,
    backgroundColor: 'white',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slideUpPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: height * 0.7,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: -3,
    },
    shadowOpacity: 0.27,
    shadowRadius: 4.65,
    elevation: 6,
  },
  dragHandle: {
    width: '100%',
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
    marginVertical: 8,
  },
  panelContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  parkingItem: {
    marginBottom: 16,
    paddingVertical: 8,
  },
  parkingTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  parkingAddress: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 12,
  },
  spotInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  accessibleInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
  },
  spotIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E6E0F8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accessibleIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFE0EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  spotIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5D3FD3',
  },
  accessibleIconText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#E75480',
  },
  spotText: {
    fontSize: 14,
    color: '#333333',
  }
});