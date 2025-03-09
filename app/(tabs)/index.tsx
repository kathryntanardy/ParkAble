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
  PanResponder,
  Modal,
  ActivityIndicator,
  Alert
} from "react-native";
import MapView, { LatLng, Marker } from "react-native-maps";
import axios from "axios";
import { Ionicons } from "@expo/vector-icons";

const { height, width } = Dimensions.get("window");

// Update interface to match your backend data structure
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

// Base URL for your API - replace with your actual backend URL
// If running locally on a physical device, use your computer's IP address
// If using an emulator, you might use http://10.0.2.2:5000 for Android or http://localhost:5000 for iOS
const API_BASE_URL = "http://127.0.0.1:5000";

export default function HomeScreen() {
  const [parkingSpots, setParkingSpots] = useState<ParkingSpot[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [drawerVisible, setDrawerVisible] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  
  // Set initial position to show the drawer (at full height)
  const panelHeight = height * 0.7;
  const collapsedHeight = height * 0.13;
  
  // Animation for the slide-up panel, starting at the expanded position (0)
  const slideUpAnim = useRef(new Animated.Value(height * 0.58)).current;
  
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
    setMenuVisible(false);
    // Handle menu actions (login or settings)
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
          
          {/* <TouchableOpacity 
            style={styles.menuItem} 
            onPress={() => handleMenuAction('refresh')}
          >
            <Ionicons name="settings" size={20} color="#333" style={styles.menuIcon} />
            <Text style={styles.menuText}>Settings</Text>
          </TouchableOpacity>
        </View>
      )}

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
                  
                  {spot.spotsAvailable !== undefined && (
                    <View style={styles.spotInfoContainer}>
                      <View style={styles.spotIconContainer}>
                        <Text style={styles.spotIconText}>P</Text>
                      </View>
                      <Text style={styles.spotText}>{spot.spotsAvailable} spots available</Text>
                    </View>
                  )}
                  
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
  }
});