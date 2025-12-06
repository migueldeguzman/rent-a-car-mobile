/**
 * AuthContext - Customer-based Authentication
 *
 * IMPORTANT: This app uses a single customers table for authentication.
 * There is NO separate users table. When a customer registers/logs in,
 * the backend queries the customers table (which contains email, password_hash, role).
 * The backend returns a lightweight User object (subset of Customer fields) + JWT token.
 */
import React, { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { authAPI } from '../services/api';
import { User } from '../types';

// Storage helper that works on both web and mobile
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }
    await AsyncStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }
    await AsyncStorage.removeItem(key);
  },
  async multiGet(keys: string[]): Promise<[string, string | null][]> {
    if (Platform.OS === 'web') {
      return keys.map(key => [key, localStorage.getItem(key)]);
    }
    return await AsyncStorage.multiGet(keys);
  },
  async multiSet(pairs: [string, string][]): Promise<void> {
    if (Platform.OS === 'web') {
      pairs.forEach(([key, value]) => localStorage.setItem(key, value));
      return;
    }
    await AsyncStorage.multiSet(pairs);
  },
  async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web') {
      keys.forEach(key => localStorage.removeItem(key));
      return;
    }
    await AsyncStorage.multiRemove(keys);
  },
};

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load user from storage on app start
  useEffect(() => {
    loadUserFromStorage();
  }, []);

  const loadUserFromStorage = async () => {
    try {
      const [storedToken, storedUser] = await storage.multiGet(['authToken', 'user']);

      if (storedToken[1] && storedUser[1]) {
        setToken(storedToken[1]);
        setUser(JSON.parse(storedUser[1]));
      }
    } catch (error) {
      console.error('Error loading user from storage:', error);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Login - Authenticates customer via customers table
   * Backend validates email/password_hash from customers table
   * Returns lightweight User object (subset of customer data) + JWT token
   */
  const login = async (email: string, password: string) => {
    try {
      console.log('📧 Attempting login for customer:', email);
      const response = await authAPI.login(email, password);
      console.log('✅ Login response from customers table:', response);
      const { user: userData, token: authToken } = response.data;

      // Save to state
      setUser(userData);
      setToken(authToken);

      // Save to storage
      await storage.multiSet([
        ['authToken', authToken],
        ['user', JSON.stringify(userData)],
      ]);
      console.log('✅ Customer authenticated successfully');
    } catch (error: any) {
      console.error('❌ Login error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data,
      });
      throw new Error(error.response?.data?.message || error.message || 'Login failed');
    }
  };

  /**
   * Register - Creates new customer record in customers table
   * Backend inserts into customers table with password_hash
   * Returns lightweight User object + JWT token for immediate login
   *
   * NOTE: This basic registration is NOT used in the booking flow.
   * The booking flow uses registerWithKYC (in customerAPI) which creates
   * a customer with full KYC data in one step.
   */
  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
      console.log('📝 Registering new customer in customers table...');
      const response = await authAPI.register(email, password, firstName, lastName);
      const { user: userData, token: authToken } = response.data;

      // Save to state
      setUser(userData);
      setToken(authToken);

      // Save to storage
      await storage.multiSet([
        ['authToken', authToken],
        ['user', JSON.stringify(userData)],
      ]);
      console.log('✅ Customer registered successfully in customers table');
    } catch (error: any) {
      throw new Error(error.response?.data?.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      // Clear state
      setUser(null);
      setToken(null);

      // Clear storage
      await storage.multiRemove(['authToken', 'user']);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
