import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Platform,
} from 'react-native';
import { vehicleAPI } from '../services/api';
import { Vehicle } from '../types';
import { useAuth } from '../contexts/AuthContext';

const COMPANY_ID = '347a553b-d7ab-4fa0-8697-3cfa82f41742'; // Vesla Motors

interface VehicleListScreenProps {
  navigation: any;
}

export default function VehicleListScreen({ navigation }: VehicleListScreenProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { logout, user } = useAuth();

  useEffect(() => {
    loadVehicles();
  }, []);

  const loadVehicles = async () => {
    try {
      console.log('📋 Loading vehicles from API...');
      const data = await vehicleAPI.getAvailableVehicles(COMPANY_ID);
      console.log('✅ Loaded vehicles:', data.length);
      setVehicles(data);
    } catch (error: any) {
      console.error('❌ Error loading vehicles:', error);
      console.error('Error response:', error.response?.data);
      Alert.alert('Error', error.response?.data?.error || 'Failed to load vehicles');
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadVehicles();
  };

  const handleVehiclePress = (vehicle: Vehicle) => {
    // Allow guest browsing - proceed to booking screen without authentication
    // Authentication will be required at Step 2 (KYC) when user tries to confirm booking
    navigation.navigate('Booking', { vehicle });
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      // On web, use window.confirm instead of Alert
      if (window.confirm('Are you sure you want to logout?')) {
        await logout();
      }
    } else {
      Alert.alert('Logout', 'Are you sure you want to logout?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]);
    }
  };

  const renderVehicle = ({ item }: { item: Vehicle }) => (
    <TouchableOpacity
      style={styles.vehicleCard}
      onPress={() => handleVehiclePress(item)}
    >
      <View style={styles.vehicleHeader}>
        <Text style={styles.vehicleName}>
          {item.make} {item.model} {item.year}
        </Text>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.vehicleDetails}>
        {item.plateNumber} • {item.color ?? 'N/A'}
      </Text>

      {item.description && (
        <Text style={styles.vehicleDescription}>{item.description}</Text>
      )}

      <View style={styles.priceContainer}>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Daily</Text>
          <Text style={styles.priceValue}>AED {String(item.dailyRate)}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Weekly</Text>
          <Text style={styles.priceValue}>AED {String(item.weeklyRate)}</Text>
        </View>
        <View style={styles.priceItem}>
          <Text style={styles.priceLabel}>Monthly</Text>
          <Text style={styles.priceValue}>AED {String(item.monthlyRate)}</Text>
        </View>
      </View>

      <View style={styles.bookButton}>
        <Text style={styles.bookButtonText}>Book Now</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading vehicles...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Available Vehicles</Text>
          <Text style={styles.headerSubtitle}>
            {user ? `Welcome, ${user.firstName}!` : 'Browse our vehicle fleet'}
          </Text>
        </View>

        {user && (
          // Show logout button for authenticated customers
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutButtonText}>Logout</Text>
          </TouchableOpacity>
        )}
      </View>

      {vehicles.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No vehicles available</Text>
          <TouchableOpacity onPress={loadVehicles} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={vehicles}
          keyExtractor={(item) => item.id}
          renderItem={renderVehicle}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={true}
          scrollEnabled={true}
          style={Platform.OS === 'web' ? { flex: 1, height: '100%' } : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    ...(Platform.OS === 'web' && { height: '100vh' }),
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    backgroundColor: '#fff',
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  authButtonsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  loginButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  loginButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  registerButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#007AFF',
    borderRadius: 8,
  },
  registerButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  logoutButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  logoutButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
  vehicleCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    width: '100%',
    maxWidth: 600,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  vehicleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  vehicleName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    flex: 1,
    lineHeight: 28,
  },
  statusBadge: {
    backgroundColor: '#34C759',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  vehicleDetails: {
    fontSize: 15,
    color: '#666',
    marginBottom: 10,
    fontWeight: '500',
  },
  vehicleDescription: {
    fontSize: 14,
    color: '#888',
    marginBottom: 20,
    lineHeight: 22,
  },
  priceContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    paddingTop: 20,
    paddingBottom: 4,
    borderTopWidth: 1,
    borderTopColor: '#e8e8e8',
    gap: 16,
  },
  priceItem: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  priceLabel: {
    fontSize: 11,
    color: '#888',
    marginBottom: 6,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 17,
    fontWeight: '700',
    color: '#007AFF',
    lineHeight: 24,
  },
  bookButton: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  bookButtonText: {
    color: '#fff',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
