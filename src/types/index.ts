export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
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
