import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { AuthResponse, Vehicle, Booking } from '../types';

// Storage helper that works on both web and mobile
const storage = {
  async getItem(key: string): Promise<string | null> {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return await AsyncStorage.getItem(key);
  },
  async multiRemove(keys: string[]): Promise<void> {
    if (Platform.OS === 'web') {
      keys.forEach(key => localStorage.removeItem(key));
      return;
    }
    await AsyncStorage.multiRemove(keys);
  },
};

// Update this to your backend URL
// For web: http://localhost:3001/api
// For Android emulator: http://10.0.2.2:3001/api
// For iOS simulator: http://localhost:3001/api
// For physical device: http://<YOUR_LOCAL_IP>:3001/api
const API_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, clear storage
      await storage.multiRemove(['authToken', 'user']);
    }
    return Promise.reject(error);
  }
);

// Auth APIs
export const authAPI = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/login', { email, password });
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    firstName: string,
    lastName: string
  ): Promise<AuthResponse> => {
    const response = await api.post<AuthResponse>('/auth/register', {
      email,
      password,
      firstName,
      lastName,
    });
    return response.data;
  },
};

// Vehicle APIs
export const vehicleAPI = {
  getAvailableVehicles: async (companyId: string): Promise<Vehicle[]> => {
    const response = await api.get<{ success: boolean; data: Vehicle[]; count: number }>(
      `/vehicles/available?companyId=${companyId}`
    );
    return response.data.data;
  },

  getVehicleById: async (vehicleId: string): Promise<Vehicle> => {
    const response = await api.get<{ success: boolean; data: Vehicle }>(
      `/vehicles/${vehicleId}`
    );
    return response.data.data;
  },

  checkAvailability: async (
    vehicleId: string,
    startDate: string,
    endDate: string
  ): Promise<boolean> => {
    const response = await api.get<{ success: boolean; data: { available: boolean } }>(
      `/vehicles/${vehicleId}/availability?startDate=${startDate}&endDate=${endDate}`
    );
    return response.data.data.available;
  },
};

// Customer APIs
export const customerAPI = {
  // Register customer with complete KYC data (creates account + KYC in one step)
  registerWithKYC: async (data: {
    // Account credentials
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    // KYC identity data
    phoneNumber: string;
    emiratesId?: string | null;
    passportNumber?: string | null;
    passportCountry?: string | null;
    licenseNumber: string;
    driversLicenseCountry: string;
    driversLicenseExpiry?: string;
    nationality: string;
    dateOfBirth?: string;
    isTourist: boolean;
  }): Promise<any> => {
    const response = await api.post('/customers/register-with-kyc', data);
    return response.data;
  },

  updateKYC: async (kycData: {
    email: string;
    phoneNumber: string;
    emiratesId?: string | null;
    passportNumber?: string | null;
    passportCountry?: string | null;
    licenseNumber: string;
    driversLicenseCountry: string;
    driversLicenseExpiry?: string;
    nationality: string;
    dateOfBirth?: string;
    isTourist: boolean;
  }): Promise<any> => {
    const response = await api.put('/customers/kyc/update', kycData);
    return response.data;
  },

  updateCard: async (cardData: {
    email: string;
    creditCardNumber: string; // Only last 4 digits
    creditCardType: string;
    cardHolderName: string;
    bankProvider: string;
  }): Promise<any> => {
    const response = await api.put('/customers/card/update', cardData);
    return response.data;
  },
};

// Booking APIs
export const bookingAPI = {
  createBooking: async (data: {
    companyId?: string; // Made optional, backend defaults to 'default-company-id'
    vehicleId: string;
    // customerId removed - backend will get/create customer from authenticated user
    startDate: string;
    endDate: string;
    notes?: string;
    paymentMethod?: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER';
    termsAccepted?: boolean;
    addOns?: any[];
    notificationPreferences?: any;
  }): Promise<Booking> => {
    const response = await api.post<{ success: boolean; data: Booking }>(
      '/bookings',
      data
    );
    return response.data.data;
  },

  confirmBooking: async (
    bookingId: string
  ): Promise<{ booking: Booking }> => {
    const response = await api.post<{ success: boolean; data: { booking: Booking } }>(
      `/bookings/${bookingId}/confirm`
    );
    return response.data.data;
  },

  getBookingById: async (bookingId: string): Promise<Booking> => {
    const response = await api.get<{ success: boolean; data: Booking }>(
      `/bookings/${bookingId}`
    );
    return response.data.data;
  },

  getMyBookings: async (companyId?: string): Promise<Booking[]> => {
    const params = companyId ? `?companyId=${companyId}` : '';
    const response = await api.get<{ success: boolean; data: Booking[] }>(
      `/bookings/my/bookings${params}`
    );
    return response.data.data;
  },

  listBookings: async (companyId: string, filters?: {
    customerId?: string;
    vehicleId?: string;
    status?: string;
  }): Promise<Booking[]> => {
    const params = new URLSearchParams({ companyId });
    if (filters?.customerId) params.append('customerId', filters.customerId);
    if (filters?.vehicleId) params.append('vehicleId', filters.vehicleId);
    if (filters?.status) params.append('status', filters.status);

    const response = await api.get<{ success: boolean; data: Booking[] }>(
      `/bookings?${params.toString()}`
    );
    return response.data.data;
  },

  // Admin: Get all bookings with pagination
  getAllBookings: async (page: number = 1, limit: number = 10, status?: string): Promise<{
    bookings: Booking[];
    pagination: {
      page: number;
      limit: number;
      totalCount: number;
      totalPages: number;
    };
  }> => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString()
    });
    if (status) params.append('status', status);

    const response = await api.get<{
      success: boolean;
      bookings: Booking[];
      pagination: {
        page: number;
        limit: number;
        totalCount: number;
        totalPages: number;
      };
    }>(`/bookings?${params.toString()}`);

    return {
      bookings: response.data.bookings,
      pagination: response.data.pagination
    };
  },

  // Get total booking count
  getBookingCount: async (status?: string): Promise<{
    total: number;
    status: string;
  }> => {
    const params = status ? `?status=${status}` : '';
    const response = await api.get<{
      success: boolean;
      total: number;
      status: string;
    }>(`/bookings/count${params}`);

    return {
      total: response.data.total,
      status: response.data.status
    };
  },
};

// Rate calculation helper
export const calculateRate = (
  startDate: Date,
  endDate: Date,
  dailyRate: number,
  monthlyRate: number
): {
  totalDays: number;
  monthlyPeriods: number;
  remainingDays: number;
  totalAmount: number;
} => {
  const diffTime = endDate.getTime() - startDate.getTime();
  const totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  const monthlyPeriods = Math.floor(totalDays / 30);
  const remainingDays = totalDays % 30;
  const totalAmount = monthlyPeriods * monthlyRate + remainingDays * dailyRate;

  return {
    totalDays,
    monthlyPeriods,
    remainingDays,
    totalAmount,
  };
};

export default api;
