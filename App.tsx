import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { StatusBar } from 'expo-status-bar';
import { ActivityIndicator, View, StyleSheet } from 'react-native';

// Context
import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { BookingFlowProvider } from './src/contexts/BookingFlowContext';

// Components
import CustomScrollbar from './src/components/CustomScrollbar';

// Screens
import LoginScreen from './src/screens/LoginScreen';
import RegisterScreen from './src/screens/RegisterScreen';
import VehicleListScreen from './src/screens/VehicleListScreen';
import BookingScreen from './src/screens/BookingScreen';
import KYCEligibilityScreen from './src/screens/KYCEligibilityScreen';
import PaymentScreen from './src/screens/PaymentScreen';
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

        {/* Four-Step Booking Flow */}
        <Stack.Screen
          name="Booking"
          component={BookingScreen}
          options={{ title: 'Step 1: Select Vehicle' }}
        />
        <Stack.Screen
          name="KYCEligibility"
          component={KYCEligibilityScreen}
          options={{ title: 'Step 2: Verify Eligibility' }}
        />
        <Stack.Screen
          name="Payment"
          component={PaymentScreen}
          options={{ title: 'Step 3: Payment' }}
        />
        <Stack.Screen
          name="BookingConfirmation"
          component={BookingConfirmationScreen}
          options={{
            title: 'Step 4: Confirmed',
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
      <BookingFlowProvider>
        <StatusBar style="auto" />
        <Navigation />
        <CustomScrollbar />
      </BookingFlowProvider>
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
