import React, { createContext, useState, useContext, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import {
  BookingFlowState,
  Vehicle,
  AddOn,
  PriceBreakdown,
  KYCData,
  PaymentData,
  AccountingEntry,
  Booking,
} from '../types';

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
};

interface BookingFlowContextType {
  flowState: BookingFlowState;

  // Navigation
  goToStep: (step: 1 | 2 | 3 | 4) => void;
  nextStep: () => void;
  previousStep: () => void;
  resetFlow: () => void;

  // Step 1: Vehicle Selection
  setVehicleSelection: (
    vehicle: Vehicle,
    rentalPeriod: {
      startDate: string;
      endDate: string;
      totalDays: number;
      monthlyPeriods: number;
      remainingDays: number;
    },
    addOns: AddOn[],
    priceBreakdown: PriceBreakdown
  ) => void;

  // Step 2: KYC/Eligibility
  setKYCData: (kycData: KYCData) => void;

  // Step 3: Payment
  setPaymentData: (paymentData: PaymentData, accountingEntry: AccountingEntry) => void;

  // Step 4: Confirmation
  setBookingConfirmation: (booking: Booking, receiptUrl?: string) => void;

  // Persistence
  saveFlowToStorage: () => Promise<void>;
  loadFlowFromStorage: () => Promise<void>;
}

const BookingFlowContext = createContext<BookingFlowContextType | undefined>(undefined);

const STORAGE_KEY = 'bookingFlow';

export const BookingFlowProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [flowState, setFlowState] = useState<BookingFlowState>({
    currentStep: 1,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  });

  // Navigation functions
  const goToStep = (step: 1 | 2 | 3 | 4) => {
    setFlowState((prev) => ({
      ...prev,
      currentStep: step,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const nextStep = () => {
    setFlowState((prev) => ({
      ...prev,
      currentStep: Math.min(prev.currentStep + 1, 4) as 1 | 2 | 3 | 4,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const previousStep = () => {
    setFlowState((prev) => ({
      ...prev,
      currentStep: Math.max(prev.currentStep - 1, 1) as 1 | 2 | 3 | 4,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  const resetFlow = () => {
    setFlowState({
      currentStep: 1,
      startedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    });
    storage.removeItem(STORAGE_KEY);
  };

  // Step 1: Vehicle Selection
  const setVehicleSelection = (
    vehicle: Vehicle,
    rentalPeriod: {
      startDate: string;
      endDate: string;
      totalDays: number;
      monthlyPeriods: number;
      remainingDays: number;
    },
    addOns: AddOn[],
    priceBreakdown: PriceBreakdown
  ) => {
    setFlowState((prev) => ({
      ...prev,
      vehicle,
      rentalPeriod,
      selectedAddOns: addOns,
      priceBreakdown,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  // Step 2: KYC/Eligibility
  const setKYCData = (kycData: KYCData) => {
    setFlowState((prev) => ({
      ...prev,
      kycData,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  // Step 3: Payment
  const setPaymentData = (paymentData: PaymentData, accountingEntry: AccountingEntry) => {
    setFlowState((prev) => ({
      ...prev,
      paymentData,
      accountingEntry,
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  // Step 4: Confirmation
  const setBookingConfirmation = (booking: Booking, receiptUrl?: string) => {
    setFlowState((prev) => ({
      ...prev,
      booking,
      receiptUrl,
      completedAt: new Date().toISOString(),
      lastUpdatedAt: new Date().toISOString(),
    }));
  };

  // Persistence
  const saveFlowToStorage = async () => {
    try {
      await storage.setItem(STORAGE_KEY, JSON.stringify(flowState));
    } catch (error) {
      console.error('Error saving booking flow to storage:', error);
    }
  };

  const loadFlowFromStorage = async () => {
    try {
      const saved = await storage.getItem(STORAGE_KEY);
      if (saved) {
        setFlowState(JSON.parse(saved));
      }
    } catch (error) {
      console.error('Error loading booking flow from storage:', error);
    }
  };

  return (
    <BookingFlowContext.Provider
      value={{
        flowState,
        goToStep,
        nextStep,
        previousStep,
        resetFlow,
        setVehicleSelection,
        setKYCData,
        setPaymentData,
        setBookingConfirmation,
        saveFlowToStorage,
        loadFlowFromStorage,
      }}
    >
      {children}
    </BookingFlowContext.Provider>
  );
};

export const useBookingFlow = () => {
  const context = useContext(BookingFlowContext);
  if (context === undefined) {
    throw new Error('useBookingFlow must be used within a BookingFlowProvider');
  }
  return context;
};
