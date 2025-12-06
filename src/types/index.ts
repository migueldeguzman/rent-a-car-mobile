/**
 * Customer interface (also serves as User for authentication)
 * In this system, users ARE customers - the customers table contains both
 * customer information and authentication credentials (password_hash, role)
 */
export interface Customer {
  id: string;
  firstName: string;
  lastName: string;
  nationality: string;
  idType: 'PASSPORT' | 'EMIRATES_ID';
  idNumber: string;
  idIssuedAt?: string | null;
  idExpiryDate?: string | null;
  licenseNumber: string;
  licenseIssuedAt?: string | null;
  licenseIssueDate?: string | null;
  licenseExpiryDate?: string | null;
  driversId?: string | null; // Driver License ID/Number (for all customers)
  emiratesId?: string | null; // Emirates ID Number (only for UAE residents, NULL for tourists)
  isTourist?: boolean; // TRUE if tourist (passport holder), FALSE if UAE resident
  companyName?: string | null;
  address?: string | null;
  city?: string | null;
  mobileNumber: string;
  landlineNumber?: string | null;
  email: string;
  passwordHash?: string; // Only used server-side, never sent to client
  role?: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * User interface (lightweight version for authentication state)
 * This is what the frontend uses after login - a subset of Customer fields
 */
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  driversId?: string | null;
  emiratesId?: string | null;
  isTourist?: boolean;
  nationality?: string;
  mobileNumber?: string;
}

export interface AuthResponse {
  status: string;
  data: {
    user: User;
    token: string;
  };
}

export interface Vehicle {
  id: string;
  companyId: string;
  make: string;
  model: string;
  year: number;
  plateNumber: string;
  color?: string | null;
  dailyRate: string | number;
  weeklyRate: string | number;
  monthlyRate: string | number;
  status: 'AVAILABLE' | 'RENTED' | 'MAINTENANCE' | 'RETIRED';
  imageUrl?: string | null;
  description?: string | null;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Booking {
  id: string;
  companyId: string;
  vehicleId: string;
  customerId: string;
  invoiceId: string | null;
  bookingNumber: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  monthlyPeriods: number;
  remainingDays: number;
  dailyRate: string;
  monthlyRate: string;
  totalAmount: string;
  status: 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
  notes: string | null;
  paymentMethod?: 'CASH' | 'CREDIT_CARD' | 'BANK_TRANSFER';
  termsAccepted?: boolean;
  addOns?: AddOn[];
  notificationPreferences?: NotificationPreferences;
  createdAt: string;
  updatedAt: string;
  vehicle?: Vehicle;
}

export interface RateCalculation {
  totalDays: number;
  monthlyPeriods: number;
  remainingDays: number;
  totalAmount: number;
}

export interface AddOn {
  id: string;
  name: string;
  description?: string;
  dailyRate: number;
  totalAmount: number;
  selected: boolean;
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  whatsapp: boolean;
}

export interface PriceBreakdown {
  subtotal: number;
  vatRate: number;
  vatAmount: number;
  totalWithVat: number;
  securityDeposit: number;
  addOnsTotal?: number;
  grandTotal: number;
}
