import React, { useState, useEffect, useRef } from "react";
import * as Location from 'expo-location';
import { 
  View, 
  StyleSheet, 
  TextInput, 
  Text, 
  TouchableOpacity, 
  Animated, 
  ScrollView,import React, { useState, useEffect, useRef } from "react";
import * as Location from 'expo-location';
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
  PanResponder,
  Modal,
  ActivityIndicator,
  Alert
} from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");

interface ParkingSpot {
  id?: number;
  name: string;
  address?: string;
  spotsAvailable?: number;
  accessibleSpots?: number;
  freeAccess: number;
  lastUpdate?: string | null;
  coordinates: number[]; // [longitude, latitude]
  distance?: number; 
}

const API_BASE_URL = "http://127.0.0.1:5000";

export default function HomeScreen() {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationName, setLocationName] = useState("");
  const [locationAddress, setLocationAddress] = useState("");
  const [totalSpots, setTotalSpots] = useState("");
  const [accessibleSpots, setAccessibleSpots] = useState("");
  // const [locationCoords, setLocationCoords] = useState<number[] | null>(null); // [longitude, latitude]
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");


  const mapRef = useRef<MapView | null>(null);
  const scrollViewRef = useRef<ScrollView | null>(null);


  const panelHeight = height * 0.7;
  const collapsedHeight = height * 0.13;
  const slideUpAnim = useRef(new Animated.Value(height * 0.58)).current;

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // Radius of the Earth in km
    const toRad = (angle: number) => (angle * Math.PI) / 180;
    
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  };
  
  

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
          Animated.spring(slideUpAnim, {
            toValue: panelHeight - collapsedHeight,
            useNativeDriver: true,
          }).start(() => {
            setDrawerVisible(false);
          });
        } else {
          Animated.spring(slideUpAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            setDrawerVisible(true);
          });
        }
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      console.log("User Location:", location.coords); // Debug log
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
      fetchParkingSpots();
    })(); 
  }, []);

  const addNewLocation = async () => {
    if (!locationName || !locationAddress || !totalSpots || !accessibleSpots || !latitude || !longitude) {
      Alert.alert("Missing Fields", "Please fill in all fields.");
      return;
    }
  
    const coordinates = [parseFloat(longitude), parseFloat(latitude)]; // Convert to numbers
  
    try {
      const response = await axios.post(`${API_BASE_URL}/api/public/add`, {
        name: locationName,
        address: locationAddress,
        freeAccess: parseInt(accessibleSpots, 10),
        coordinates: coordinates,
        lastUpdate: new Date().toISOString(),
      });
  
      if (response.status === 201) {
        Alert.alert("Success", "Location added successfully!");
        setLoginModalVisible(false);
        fetchParkingSpots(); // Refresh the list
      }
    } catch (error) {
      Alert.alert("Error", "Failed to add location.");
      console.error(error);
    }
  };
  

  const goToParkingSpot = (latitude?: number, longitude?: number, index?: number) => {
    if (latitude === undefined || longitude === undefined || index === undefined) {
      Alert.alert("Invalid Location", "This location does not have valid coordinates.");
      return;
    }
  
    // Center the map on the selected parking spot
    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: { latitude, longitude },
        zoom: 17,
      });
    }
  
    // Calculate scroll position
    const itemHeight = 120; // Approximate height of each list item
    const scrollToY = Math.min(index * itemHeight); // Scroll to the item
  
    // if (scrollViewRef.current) {
    //   scrollViewRef.current.scrollTo({ y: scrollToY, animated: true });
    // }
  
    // Adjust sliding panel to 45% height
    const newPanelHeight = height * 0.45; // Set the panel height to 45% of the screen
    Animated.spring(slideUpAnim, {
      toValue: height - newPanelHeight, // Slide up to the new height
      useNativeDriver: true,
    }).start(() => setDrawerVisible(true));
  
    // Ensure the name is always at the top
    if (scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  };
  
  
  

  const goToUserLocation = () => {
    if (!userLocation) {
      Alert.alert('Location Not Found', 'Please enable location services and try again.');
      return;
    }

    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: userLocation,
        zoom: 15,
      });
    }
  };
  
  
  // Fetch parking spots from the API
  const fetchParkingSpots = async () => {
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await axios.get(`${API_BASE_URL}/api/public/getAll`);
      console.log("Raw API Response:", response.data); // Debug log
  
      let formattedData = response.data.map((spot: any) => {
        const [longitude, latitude] = spot.coordinates || [0, 0]; // Default to [0,0] if undefined
  
        return {
          name: spot.name,
          freeAccess: spot.freeAccess,
          lastUpdate: spot.lastUpdate || null, // Store lastUpdate properly
          address: spot.address || "Address not available", // Fetch address from backend
          coordinates: [latitude, longitude], // Ensure correct order
          spotsAvailable: 0,
          accessibleSpots: spot.freeAccess,
          distance: userLocation
            ? calculateDistance(userLocation.latitude, userLocation.longitude, longitude, latitude)
            : Infinity, // If no user location, set distance to Infinity
        };
      });
      formattedData = formattedData.filter((spot) => spot.distance <= 25);
      // Sort by distance (closest first)
      formattedData.sort((a, b) => a.distance - b.distance);
  
      setParkingSpots(formattedData);
    } catch (err) {
      console.error("Error fetching parking spots:", err);
      setError("Failed to load parking spots. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      fetchParkingSpots();
      return;
    }
  
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/public/getALocation?name=${query}`);
  
      // Transform the backend data to match your frontend model
      const formattedData = response.data.map((spot: any) => {
        const [longitude, latitude] = spot.coordinates || [0, 0]; // Default to [0,0] if undefined
  
        return {
          name: spot.name,
          freeAccess: spot.freeAccess,
          lastUpdate: spot.lastUpdate,
          coordinates: [latitude, longitude], // Ensure correct order
          address: "Retrieved from search",
          spotsAvailable: 0,
          accessibleSpots: spot.freeAccess,
        };
      });
  
      setParkingSpots(formattedData);
    } catch (err) {
      console.error("Error searching locations:", err);
      setError("Failed to search locations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  
  // Fake parking data as fallback
  const fakeParkingData: ParkingSpot[] = [
    { 
      id: 1, 
      name: "University Blvd Lot", 
      address: "6131 University Blvd, Vancouver", 
      spotsAvailable: 15, 
      freeAccess: 15,
      accessibleSpots: 15,
      coordinates: [-123.2465, 49.2665], // Note: Backend uses [longitude, latitude]
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 2, 
      name: "Agronomy Road Parking", 
      address: "6152 Agronomy Rd, Vancouver", 
      spotsAvailable: 15, 
      freeAccess: 15,
      accessibleSpots: 15,
      coordinates: [-123.2495, 49.2610],
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 3, 
      name: "West Parkade", 
      address: "2140 Lower Mall, Vancouver", 
      spotsAvailable: 8, 
      freeAccess: 4,
      accessibleSpots: 4,
      coordinates: [-123.2560, 49.2675],
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 4, 
      name: "North Parkade", 
      address: "6115 Student Union Blvd, Vancouver", 
      spotsAvailable: 12, 
      freeAccess: 6,
      accessibleSpots: 6,
      coordinates: [-123.2495, 49.2685],
      lastUpdate: new Date().toISOString()
    }
  ];
  
  useEffect(() => {
    // Fetch parking spots when component mounts
    fetchParkingSpots();
    
    // Optionally set up a refresh interval
    const intervalId = setInterval(() => {
      fetchParkingSpots();
    }, 60000); // Refresh every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchLocations(text);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const toggleDrawer = () => {
    const toValue = drawerVisible ? panelHeight - collapsedHeight : 0;
    
    Animated.spring(slideUpAnim, {
      toValue,
      useNativeDriver: true,
    }).start();
    
    setDrawerVisible(!drawerVisible);
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleMenuAction = (action: string) => {
    console.log(`Selected: ${action}`);
    if (action === 'login') {
      setLoginModalVisible(true);
    }
    if (action === 'refresh') {
      fetchParkingSpots();
    }
    setMenuVisible(false);
  };

  // Helper function to format date/time
  const formatLastUpdated = (lastUpdate: string | null) => {
    if (!lastUpdate) return "Unknown";
  
    try {
      const updateDate = new Date(lastUpdate);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60));
  
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes === 1) return "1 minute ago";
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
  
      return updateDate.toLocaleDateString(); // Show the date if older than a day
    } catch (e) {
      return "Invalid date";
    }
  };
  

  return (
    <View style={styles.container}>
      {/* Map distance */}
      <MapView
      ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 49.2665,
          longitude: -123.2450,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >{userLocation && (
  <Marker
    coordinate={userLocation}
    title="You are here"
    pinColor="blue"
  >
    <Ionicons name="location" size={30} color="#4285F4" />
  </Marker>
)}
        {parkingSpots.map((spot, index) => (
          <Marker
            key={spot.id || index}
            coordinate={{
              // Convert from backend format [longitude, latitude] to MapView format
              latitude: spot.coordinates[1], 
              longitude: spot.coordinates[0]
            }}
            title={spot.name}
            description={`${spot.freeAccess} accessible spots available`}
          />
        ))}
      </MapView>

      {/* Top Bar with Search and Menu */}
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Location"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery("");
              fetchParkingSpots();
            }}>
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={toggleMenu}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleMenuAction('login')}
          >
            <Ionicons name="add" size={20} color="#333" style={styles.menuIcon} />
            <Text style={styles.menuText}>Add Location</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuAction('refresh')}
          >
            <Ionicons name="refresh" size={20} color="#333" style={styles.menuIcon} />
            <Text style={styles.menuText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Location Button */}
      <TouchableOpacity style={styles.locationButton} onPress={goToUserLocation}>
        <Ionicons name="navigate" size={24} color="#4CAF50" />
      </TouchableOpacity>

      {/* Slide-up Drawer */}
      <Animated.View 
        style={[
          styles.slideUpPanel,
          {
            transform: [{ translateY: slideUpAnim }],
            height: panelHeight,
          },
        ]}
      >
        {/* Handle bar for drag interaction */}
        <View 
          {...panResponder.panHandlers}
          style={styles.dragHandle}
        >
          <View style={styles.dragIndicator} />
          <TouchableOpacity onPress={toggleDrawer} style={styles.toggleButton} />
        </View>

        {/* Panel Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5D3FD3" />
            <Text style={styles.loadingText}>Loading parking spots...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={40} color="#E75480" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchParkingSpots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView ref={scrollViewRef} style={styles.panelContent}>
            {parkingSpots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No parking spots found</Text>
              </View>
            ) : (
              parkingSpots.map((spot, index) => (
                <TouchableOpacity 
                  key={spot.id || index} 
                  style={styles.parkingItem} 
                  onPress={() => goToParkingSpot(spot.coordinates[1], spot.coordinates[0], index)}
                >
                  <Text style={styles.parkingTitle}>{spot.name}</Text>
                  <Text style={styles.parkingAddress}>{spot.address || "Address not available"}</Text>
                  
                  {/* <Text style={styles.distanceText}>
                  Distance: {spot.distance !== undefined ? spot.distance.toFixed(2) : "Unknown"} km
                  </Text> */}
                  {/* Remove this entire block
                  {spot.spotsAvailable !== undefined && (
                <View style={styles.spotInfoContainer}>
                 <View style={styles.spotIconContainer}>
                   <Text style={styles.spotIconText}>P</Text>
                  </View>
                  <Text style={styles.spotText}>{spot.spotsAvailable} spots available</Text>
                </View>
              )}
            */}

            {/* Keep only this block */}
            <View style={styles.accessibleInfoContainer}>
              <View style={styles.accessibleIconContainer}>
                <Text style={styles.accessibleIconText}>A</Text>
              </View>
              <Text style={styles.spotText}>
                {spot.freeAccess} Handicap spots available
             </Text>
            </View>
            
            {/* 🟢 Last Updated Time */}
        
          <Text style={styles.lastUpdatedText}>
            Last updated: {formatLastUpdated(spot.lastUpdate)}
          </Text>
      </TouchableOpacity>
             ))
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Add location Modal */}
      {/* Add Location Modal */}
<Modal
  visible={loginModalVisible}
  transparent={true}
  animationType="fade"
  onRequestClose={() => setLoginModalVisible(false)}
>
  <TouchableOpacity 
    style={styles.modalOverlay} 
    activeOpacity={1} 
    onPress={() => setLoginModalVisible(false)}
  >
    <TouchableOpacity 
      style={styles.modalContent}
      activeOpacity={1}
      onPress={(e) => e.stopPropagation()}
    >
      <Text style={styles.modalTitle}>Location Name</Text>
      <TextInput
        style={styles.modalInput}
        placeholder="Enter Location Name"
        placeholderTextColor="#999"
        value={locationName}
        onChangeText={setLocationName}
      />

      <Text style={styles.modalTitle}>Address</Text>
      <TextInput
        style={styles.modalInput}
        placeholder="1234 Sample Address, everywhere"
        placeholderTextColor="#999"
        value={locationAddress}
        onChangeText={setLocationAddress}
      />

      <Text style={styles.modalTitle}>Total Parking Spots</Text>
      <TextInput
        style={styles.modalInput}
        placeholder="Enter Total Spots"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={totalSpots}
        onChangeText={setTotalSpots}
      />

      <Text style={styles.modalTitle}>Handicap Accessible Spots</Text>
      <TextInput
        style={styles.modalInput}
        placeholder="Enter Accessible Spots"
        placeholderTextColor="#999"
        keyboardType="numeric"
        value={accessibleSpots}
        onChangeText={setAccessibleSpots}
      />
    <Text style={styles.modalTitle}>Latitude</Text>
<TextInput
  style={styles.modalInput}
  placeholder="Enter Latitude"
  placeholderTextColor="#999"
  keyboardType="numeric"
  value={latitude}
  onChangeText={(text) => setLatitude(text)}
/>

<Text style={styles.modalTitle}>Longitude</Text>
<TextInput
  style={styles.modalInput}
  placeholder="Enter Longitude"
  placeholderTextColor="#999"
  keyboardType="numeric"
  value={longitude}
  onChangeText={(text) => setLongitude(text)}
/>

      
 
      <TouchableOpacity 
        style={styles.signInButton} 
        onPress={addNewLocation} // Call function when button is pressed
      >
        <Text style={styles.signInButtonText}>Add Location</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  </TouchableOpacity>
</Modal>

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
  topBar: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    flex: 1,
    marginRight: 10,
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
  menuButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 8,
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
  menuDropdown: {
    position: 'absolute',
    top: 90,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    width: 160,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 8,
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
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
    flexDirection: 'row',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
    marginVertical: 8,
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
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
    marginBottom: 6,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
    fontStyle: 'italic',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  signInButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#333',
    textDecorationLine: 'underline',
  },
  signUpButton: {
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#333',
    fontSize: 16,
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#E75480',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});
  Dimensions,
  Platform,
  PanResponder,
  Modal,
  ActivityIndicator,
  Alert
} from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");

interface ParkingSpot {
  id?: number;
  name: string;
  address?: string;
  spotsAvailable?: number;
  accessibleSpots?: number;
  freeAccess: number;
  lastUpdate?: string | null;
  coordinates: number[]; // [longitude, latitude]
}

const API_BASE_URL = "http://127.0.0.1:5000";

export default function HomeScreen() {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [loginModalVisible, setLoginModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<LatLng | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const mapRef = useRef<MapView | null>(null);

  const panelHeight = height * 0.7;
  const collapsedHeight = height * 0.13;
  const slideUpAnim = useRef(new Animated.Value(height * 0.58)).current;

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
          Animated.spring(slideUpAnim, {
            toValue: panelHeight - collapsedHeight,
            useNativeDriver: true,
          }).start(() => {
            setDrawerVisible(false);
          });
        } else {
          Animated.spring(slideUpAnim, {
            toValue: 0,
            useNativeDriver: true,
          }).start(() => {
            setDrawerVisible(true);
          });
        }
      },
    })
  ).current;

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setLocationError('Permission to access location was denied');
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      console.log("User Location:", location.coords); // Debug log
      setUserLocation({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      });
    })(); 
  }, []);

  const goToUserLocation = () => {
    if (!userLocation) {
      Alert.alert('Location Not Found', 'Please enable location services and try again.');
      return;
    }

    if (mapRef.current) {
      mapRef.current.animateCamera({
        center: userLocation,
        zoom: 15,
      });
    }
  };

  // Rest of your existing code...

  // Fetch parking spots from the API
  const fetchParkingSpots = async () => {
    setIsLoading(true);
    setError(null);
  
    try {
      const response = await axios.get(`${API_BASE_URL}/api/public/getAll`);
  
      console.log("Raw API Response:", response.data); // Debug log
  
      // Ensure coordinates are correctly formatted as [latitude, longitude]
      const formattedData = response.data.map((spot: any) => {
        const [longitude, latitude] = spot.coordinates; // Ensure order is correct
  
        console.log(`Spot: ${spot.name}, Latitude: ${latitude}, Longitude: ${longitude}`);
  
        return {
          name: spot.name,
          freeAccess: spot.freeAccess,
          lastUpdate: spot.lastUpdate,
          coordinates: [latitude, longitude], // Ensure correct order
          address: "Retrieved from MongoDB",
          spotsAvailable: 0,
          accessibleSpots: spot.freeAccess,
        };
      });
      
      setParkingSpots(formattedData);
    } catch (err) {
      console.error("Error fetching parking spots:", err);
      setError("Failed to load parking spots. Please try again.");
      
      // For development, you might want to fallback to dummy data if API fails
      setParkingSpots(fakeParkingData);
    } finally {
      setIsLoading(false);
    }
  };

  // For search functionality
  const searchLocations = async (query: string) => {
    if (!query.trim()) {
      fetchParkingSpots();
      return;
    }
    
    setIsLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/api/public/getALocation?name=${query}`);
      
      // Transform the backend data to match your frontend model
      const formattedData = response.data.map((spot: any) => ({
        
        name: spot.name,
        freeAccess: spot.freeAccess,
        lastUpdate: spot.lastUpdate,
        coordinates: spot.coordinates,
        address: "Retrieved from search", 
        spotsAvailable: 0,
        accessibleSpots: spot.freeAccess,
      }));
      
      setParkingSpots(formattedData);
    } catch (err) {
      console.error("Error searching locations:", err);
      setError("Failed to search locations. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };
  
  // Fake parking data as fallback
  const fakeParkingData: ParkingSpot[] = [
    { 
      id: 1, 
      name: "University Blvd Lot", 
      address: "6131 University Blvd, Vancouver", 
      spotsAvailable: 15, 
      freeAccess: 15,
      accessibleSpots: 15,
      coordinates: [-123.2465, 49.2665], // Note: Backend uses [longitude, latitude]
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 2, 
      name: "Agronomy Road Parking", 
      address: "6152 Agronomy Rd, Vancouver", 
      spotsAvailable: 15, 
      freeAccess: 15,
      accessibleSpots: 15,
      coordinates: [-123.2495, 49.2610],
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 3, 
      name: "West Parkade", 
      address: "2140 Lower Mall, Vancouver", 
      spotsAvailable: 8, 
      freeAccess: 4,
      accessibleSpots: 4,
      coordinates: [-123.2560, 49.2675],
      lastUpdate: new Date().toISOString()
    },
    { 
      id: 4, 
      name: "North Parkade", 
      address: "6115 Student Union Blvd, Vancouver", 
      spotsAvailable: 12, 
      freeAccess: 6,
      accessibleSpots: 6,
      coordinates: [-123.2495, 49.2685],
      lastUpdate: new Date().toISOString()
    }
  ];
  
  useEffect(() => {
    // Fetch parking spots when component mounts
    fetchParkingSpots();
    
    // Optionally set up a refresh interval
    const intervalId = setInterval(() => {
      fetchParkingSpots();
    }, 60000); // Refresh every minute
    
    // Clean up interval on component unmount
    return () => clearInterval(intervalId);
  }, []);
  
  // Handle search input changes
  const handleSearchChange = (text: string) => {
    setSearchQuery(text);
    // Debounce search to avoid too many API calls
    const timeoutId = setTimeout(() => {
      searchLocations(text);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  };

  const toggleDrawer = () => {
    const toValue = drawerVisible ? panelHeight - collapsedHeight : 0;
    
    Animated.spring(slideUpAnim, {
      toValue,
      useNativeDriver: true,
    }).start();
    
    setDrawerVisible(!drawerVisible);
  };

  const toggleMenu = () => {
    setMenuVisible(!menuVisible);
  };

  const handleMenuAction = (action: string) => {
    console.log(`Selected: ${action}`);
    if (action === 'login') {
      setLoginModalVisible(true);
    }
    if (action === 'refresh') {
      fetchParkingSpots();
    }
    setMenuVisible(false);
  };

  // Helper function to format date/time
  const formatLastUpdated = (lastUpdate: string | null) => {
    if (!lastUpdate) return "Unknown";
    
    try {
      const updateDate = new Date(lastUpdate);
      const now = new Date();
      const diffMinutes = Math.floor((now.getTime() - updateDate.getTime()) / (1000 * 60));
      
      if (diffMinutes < 1) return "Just now";
      if (diffMinutes === 1) return "1 minute ago";
      if (diffMinutes < 60) return `${diffMinutes} minutes ago`;
      
      const diffHours = Math.floor(diffMinutes / 60);
      if (diffHours === 1) return "1 hour ago";
      if (diffHours < 24) return `${diffHours} hours ago`;
      
      return updateDate.toLocaleDateString();
    } catch (e) {
      return "Invalid date";
    }
  };

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
      ref={mapRef}
        style={styles.map}
        initialRegion={{
          latitude: 49.2665,
          longitude: -123.2450,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
      >{userLocation && (
  <Marker
    coordinate={userLocation}
    title="You are here"
    pinColor="blue"
  >
    <Ionicons name="location" size={30} color="#4285F4" />
  </Marker>
)}
        {parkingSpots.map((spot, index) => (
          <Marker
            key={spot.id || index}
            coordinate={{
              // Convert from backend format [longitude, latitude] to MapView format
              latitude: spot.coordinates[1], 
              longitude: spot.coordinates[0]
            }}
            title={spot.name}
            description={`${spot.freeAccess} accessible spots available`}
          />
        ))}
      </MapView>

      {/* Top Bar with Search and Menu */}
      <View style={styles.topBar}>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search Location"
            placeholderTextColor="#999"
            value={searchQuery}
            onChangeText={handleSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => {
              setSearchQuery("");
              fetchParkingSpots();
            }}>
              <Ionicons name="close" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.menuButton}
          onPress={toggleMenu}
        >
          <Ionicons name="menu" size={24} color="#333" />
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {menuVisible && (
        <View style={styles.menuDropdown}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => handleMenuAction('login')}
          >
            <Ionicons name="person" size={20} color="#333" style={styles.menuIcon} />
            <Text style={styles.menuText}>Login</Text>
          </TouchableOpacity>
          
          <View style={styles.menuDivider} />
          
          <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuAction('refresh')}
          >
            <Ionicons name="refresh" size={20} color="#333" style={styles.menuIcon} />
            <Text style={styles.menuText}>Refresh Data</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Current Location Button */}
      <TouchableOpacity style={styles.locationButton} onPress={goToUserLocation}>
        <Ionicons name="navigate" size={24} color="#4CAF50" />
      </TouchableOpacity>

      {/* Slide-up Drawer */}
      <Animated.View 
        style={[
          styles.slideUpPanel,
          {
            transform: [{ translateY: slideUpAnim }],
            height: panelHeight,
          },
        ]}
      >
        {/* Handle bar for drag interaction */}
        <View 
          {...panResponder.panHandlers}
          style={styles.dragHandle}
        >
          <View style={styles.dragIndicator} />
          <TouchableOpacity onPress={toggleDrawer} style={styles.toggleButton} />
        </View>

        {/* Panel Content */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#5D3FD3" />
            <Text style={styles.loadingText}>Loading parking spots...</Text>
          </View>
        ) : error ? (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={40} color="#E75480" />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity 
              style={styles.retryButton}
              onPress={fetchParkingSpots}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView style={styles.panelContent}>
            {parkingSpots.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No parking spots found</Text>
              </View>
            ) : (
              parkingSpots.map((spot, index) => (
                <View key={spot.id || index} style={styles.parkingItem}>
                  <Text style={styles.parkingTitle}>{spot.name}</Text>
                  <Text style={styles.parkingAddress}>{spot.address || "Address not available"}</Text>
                  
                  {spot.lastUpdate && (
                    <Text style={styles.lastUpdatedText}>
                      Last updated: {formatLastUpdated(spot.lastUpdate)}
                    </Text>
                  )}
                  
                  {/* Remove this entire block
  {spot.spotsAvailable !== undefined && (
    <View style={styles.spotInfoContainer}>
      <View style={styles.spotIconContainer}>
        <Text style={styles.spotIconText}>P</Text>
      </View>
      <Text style={styles.spotText}>{spot.spotsAvailable} spots available</Text>
    </View>
  )}
*/}

{/* Keep only this block */}
<View style={styles.accessibleInfoContainer}>
  <View style={styles.accessibleIconContainer}>
    <Text style={styles.accessibleIconText}>A</Text>
  </View>
  <Text style={styles.spotText}>
    {spot.freeAccess} accessible spots available
  </Text>
</View>
                </View>
              ))
            )}
          </ScrollView>
        )}
      </Animated.View>

      {/* Login Modal */}
      <Modal
        visible={loginModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setLoginModalVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay} 
          activeOpacity={1} 
          onPress={() => setLoginModalVisible(false)}
        >
          <TouchableOpacity 
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.modalTitle}>Email</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Email"
              placeholderTextColor="#999"
            />
            
            <Text style={styles.modalTitle}>Password</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Password"
              placeholderTextColor="#999"
              secureTextEntry
            />
            
            <TouchableOpacity 
              style={styles.signInButton} 
              onPress={() => setLoginModalVisible(false)}
            >
              <Text style={styles.signInButtonText}>Sign In</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={styles.signUpButton} 
              onPress={() => console.log("Sign up business")}
            >
              <Text style={styles.signUpButtonText}>Sign Up Your Business</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
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
  topBar: {
    position: 'absolute',
    top: 40,
    left: 10,
    right: 10,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 10,
    flex: 1,
    marginRight: 10,
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
  menuButton: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 8,
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
  menuDropdown: {
    position: 'absolute',
    top: 90,
    right: 10,
    backgroundColor: 'white',
    borderRadius: 8,
    width: 160,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    zIndex: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuIcon: {
    marginRight: 10,
  },
  menuText: {
    fontSize: 16,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginHorizontal: 8,
  },
  locationButton: {
    position: 'absolute',
    bottom: 100,
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
    flexDirection: 'row',
  },
  dragIndicator: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#DDDDDD',
    marginVertical: 8,
  },
  toggleButton: {
    position: 'absolute',
    right: 16,
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
    marginBottom: 6,
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#888888',
    marginBottom: 12,
    fontStyle: 'italic',
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
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 350,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#DDDDDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    width: '100%',
  },
  signInButton: {
    backgroundColor: '#333',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  signInButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  forgotPasswordContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  forgotPasswordText: {
    color: '#333',
    textDecorationLine: 'underline',
  },
  signUpButton: {
    alignItems: 'center',
  },
  signUpButtonText: {
    color: '#333',
    fontSize: 16,
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    marginTop: 10,
    fontSize: 16,
    color: '#E75480',
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#333',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
});