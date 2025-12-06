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
  licenseNumber?: string | null;
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
  paymentMethod?: 'CREDIT_CARD' | 'DEBIT_CARD' | 'GOOGLE_PAY' | 'APPLE_PAY';
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

/**
 * KYC/Eligibility Data - Step 2 of Booking Flow
 * Customer verification information for rental eligibility
 */
export interface KYCData {
  // Method of verification
  verificationType: 'UAE_PASS' | 'MANUAL';

  // UAE Pass data (if using UAE Pass)
  uaePassToken?: string;
  uaePassVerified?: boolean;

  // Manual input fields
  phoneNumber: string;
  emiratesId?: string | null; // For UAE residents
  passportNumber?: string | null; // For tourists
  passportCountry?: string | null; // Passport issuing country
  licenseNumber: string; // Driver's license number (required for all)
  driversLicenseCountry?: string; // License issuing country
  driversLicenseExpiry?: string; // Expiry date

  // Payment information
  creditCardNumber?: string; // Last 4 digits only for security
  creditCardType?: 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER';
  cardHolderName?: string;
  bankProvider?: string; // e.g., "Emirates NBD", "ADCB", "Dubai Islamic Bank"

  // Additional info
  isTourist: boolean; // TRUE if passport holder, FALSE if Emirates ID holder
  nationality: string;
  dateOfBirth?: string;

  // Verification status
  kycVerified: boolean;
  verifiedAt?: string;
}

/**
 * Payment Information - Step 3 of Booking Flow
 * Payment processing and accounting entry data
 */
export interface PaymentData {
  // Payment details
  paymentMethod: 'CREDIT_CARD' | 'DEBIT_CARD' | 'GOOGLE_PAY' | 'APPLE_PAY';
  amount: number; // Total amount charged
  currency: string; // Default "AED"

  // Card details (if card payment)
  cardLast4?: string;
  cardType?: string;
  cardHolderName?: string;

  // Transaction details
  transactionId?: string; // Payment gateway transaction ID
  transactionDate: string;
  transactionStatus: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

  // Receipt information
  receiptNumber: string;
  receiptUrl?: string; // PDF receipt URL

  // Accounting entry reference
  accountingEntryId?: string; // Links to accounting_entries table
}

/**
 * Accounting Entry - Double-entry bookkeeping
 * Generated during Step 3 (Payment)
 */
export interface AccountingEntry {
  id: string;
  companyId: string;

  // Entry metadata
  entryNumber: string; // e.g., "JE-2024-001"
  entryDate: string;
  entryType: 'PAYMENT' | 'REFUND' | 'ADJUSTMENT';
  description: string;

  // Reference to booking
  referenceType: 'BOOKING' | 'INVOICE' | 'REFUND';
  referenceId: string; // booking.id or invoice.id

  // Debit side - Credit Card Clearing Account
  debitAccount: string; // Account code (e.g., "1100-CC-CLEARING")
  debitAccountName: string; // "Credit Card Clearing"
  debitAmount: number;

  // Credit side - Customer Account (AR)
  creditAccount: string; // Customer-specific account code (e.g., "1200-CUST-{customerId}")
  creditAccountName: string; // Customer name (e.g., "John Doe - Receivable")
  creditAmount: number;

  // Audit trail
  createdBy?: string; // User ID who processed payment
  createdAt: string;
  updatedAt?: string;

  // Status
  status: 'DRAFT' | 'POSTED' | 'REVERSED';
  postedAt?: string;
  reversedAt?: string;
  reversalReason?: string;
}

/**
 * Booking Flow State - Tracks progress through 4 steps
 */
export interface BookingFlowState {
  currentStep: 1 | 2 | 3 | 4;

  // Step 1: Vehicle Selection
  vehicle?: Vehicle;
  rentalPeriod?: {
    startDate: string;
    endDate: string;
    totalDays: number;
    monthlyPeriods: number;
    remainingDays: number;
  };
  selectedAddOns?: AddOn[];
  priceBreakdown?: PriceBreakdown;

  // Step 2: KYC/Eligibility
  kycData?: KYCData;

  // Step 3: Payment
  paymentData?: PaymentData;
  accountingEntry?: AccountingEntry;

  // Step 4: Confirmation
  booking?: Booking;
  receiptUrl?: string;

  // Metadata
  startedAt?: string;
  completedAt?: string;
  lastUpdatedAt?: string;
}

/**
 * Receipt Data - Generated after payment
 */
export interface Receipt {
  receiptNumber: string;
  receiptDate: string;

  // Customer info
  customerName: string;
  customerEmail: string;
  customerId: string;

  // Booking info
  bookingNumber: string;
  vehicleInfo: string; // e.g., "Toyota Camry 2023"
  rentalPeriod: string; // e.g., "Jan 1, 2024 - Jan 31, 2024"

  // Payment breakdown
  subtotal: number;
  vatAmount: number;
  totalAmount: number;
  amountPaid: number;
  paymentMethod: string;

  // Accounting reference
  accountingEntryNumber: string;
  debitAccount: string;
  creditAccount: string;

  // PDF URL
  pdfUrl?: string;
}
