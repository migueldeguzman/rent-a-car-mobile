import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';

// Components
import CustomScrollbar from './src/components/CustomScrollbar';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import BookingScreen from './src/screens/BookingScreen';
import BookingConfirmationScreen from './src/screens/BookingConfirmationScreen';

const Stack = createStackNavigator();

function Navigation() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: '#007AFF' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      >
        {/* Public screens - accessible to everyone */}
        <Stack.Screen
          name="VehicleList"
          component={VehicleListScreen}
          options={{ headerShown: false }}
        />

        {/* Authentication screens */}
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{
            title: 'Login',
            headerShown: true
          }}
        />
        <Stack.Screen
          name="Register"
          component={RegisterScreen}
          options={{
            title: 'Create Account',
          }}
        />

        {/* Protected screens - require authentication check */}
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ title: 'Book Vehicle' }}
        />
        <Stack.Screen
          name="BookingConfirmation"
          component={BookingConfirmationScreen}
          options={{
            title: 'Booking Confirmed',
            headerLeft: () => null,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <StatusBar style="auto" />
      <Navigation />
      <CustomScrollbar />
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
