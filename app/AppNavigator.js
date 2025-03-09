import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { NavigationContainer } from "@react-navigation/native";
import LoginScreen from "./screens/LoginScreen";
import MapScreen from "./screens/MapScreen";
import ParkingScreen from "./screens/ParkingScreen";

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Login">
        <Stack.Screen name="Login" component={LoginScreen} />
        <Stack.Screen name="Map" component={MapScreen} />
        <Stack.Screen name="Parking" component={ParkingScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
