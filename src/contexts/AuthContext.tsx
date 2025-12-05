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

  const login = async (email: string, password: string) => {
    try {
      console.log('📧 Attempting login for:', email);
      const response = await authAPI.login(email, password);
      console.log('✅ Login response:', response);
      const { user: userData, token: authToken } = response.data;

      // Save to state
      setUser(userData);
      setToken(authToken);

      // Save to storage
      await storage.multiSet([
        ['authToken', authToken],
        ['user', JSON.stringify(userData)],
      ]);
      console.log('✅ Login successful, user saved');
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

  const register = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ) => {
    try {
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
