// Professional color palette for Rent-a-Car Mobile Application
// Accounting-compliant financial display colors

export const colors = {
  // Primary brand colors - Professional blue-green palette
  primary: {
    main: '#2C5F2D',      // Forest green - professional, trustworthy
    light: '#4A8C4E',     // Light forest green
    dark: '#1B3D1C',      // Dark forest green
    contrast: '#FFFFFF',   // White text on primary
  },

  // Secondary accent colors - Warm gold for highlights
  secondary: {
    main: '#D4AF37',      // Gold - premium, quality
    light: '#E6C964',     // Light gold
    dark: '#B8941F',      // Dark gold
    contrast: '#1B3D1C',   // Dark text on secondary
  },

  // Semantic colors for financial data
  financial: {
    positive: '#27AE60',   // Green for profits/credits
    negative: '#E74C3C',   // Red for losses/debits
    warning: '#F39C12',    // Orange for warnings
    info: '#3498DB',       // Blue for information
    vat: '#8E44AD',        // Purple for tax/VAT display
  },

  // Status colors for bookings
  status: {
    pending: '#F39C12',    // Orange
    confirmed: '#27AE60',  // Green
    active: '#3498DB',     // Blue
    completed: '#95A5A6',  // Gray
    cancelled: '#E74C3C',  // Red
  },

  // Neutral colors for UI elements
  neutral: {
    white: '#FFFFFF',
    background: '#F8F9FA',
    surface: '#FFFFFF',
    border: '#E1E4E8',
    divider: '#D1D5DB',
    text: {
      primary: '#1F2937',
      secondary: '#6B7280',
      disabled: '#9CA3AF',
      hint: '#9CA3AF',
    },
  },

  // Special UI elements
  ui: {
    cardBackground: '#FFFFFF',
    cardShadow: 'rgba(0, 0, 0, 0.08)',
    inputBackground: '#F9FAFB',
    inputBorder: '#D1D5DB',
    inputFocus: '#2C5F2D',
    buttonGradient: ['#2C5F2D', '#4A8C4E'],
    popularBadge: '#FFD700',  // Gold for popular items
    savingsBadge: '#27AE60',  // Green for savings
  },

  // Shadows for depth
  shadows: {
    small: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    medium: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 6,
      elevation: 4,
    },
    large: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
    },
  },
};

// Gradients for buttons and cards
export const gradients = {
  primaryButton: {
    colors: ['#2C5F2D', '#4A8C4E'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  secondaryButton: {
    colors: ['#D4AF37', '#E6C964'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  successButton: {
    colors: ['#27AE60', '#2ECC71'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 1 },
  },
  popularCard: {
    colors: ['#FFD700', '#FFA500'],
    start: { x: 0, y: 0 },
    end: { x: 1, y: 0 },
  },
};

// Financial formatting helpers
export const financialFormatting = {
  // Format currency with proper decimal places for accounting
  formatCurrency: (amount: number | string, currency: string = 'AED'): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return `${currency} ${numAmount.toFixed(2)}`;
  },

  // Format percentage for VAT and discounts
  formatPercentage: (value: number): string => {
    return `${value.toFixed(2)}%`;
  },

  // Calculate VAT (5% in UAE)
  calculateVAT: (amount: number, vatRate: number = 0.05): number => {
    return Math.round(amount * vatRate * 100) / 100; // Round to 2 decimal places
  },

  // Calculate security deposit (20% of total)
  calculateSecurityDeposit: (totalAmount: number, depositRate: number = 0.20): number => {
    return Math.round(totalAmount * depositRate * 100) / 100;
  },
};

export default colors;