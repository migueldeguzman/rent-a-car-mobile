# Vesla Rent A Car - Pricing Architecture

## Overview

The pricing system uses a **dual-layer approach**:

1. **charge_types table** - Global pricing templates (category-based rates)
2. **vehicles table** - Vehicle-specific pricing (overrides global rates)

This allows flexibility for:
- Default category pricing (e.g., all Economy cars: 100/day)
- Vehicle-specific pricing (e.g., Nissan Sunny Special Edition: 120/day)
- Seasonal pricing adjustments
- Promotional rates

---

## Architecture Layers

### Layer 1: Global Charge Types (charge_types table)

**Purpose:** Default pricing templates for rental categories

**Example:**
```sql
-- Economy category default rates
RENT_DAILY_ECONOMY: 100 AED/day
RENT_WEEKLY_ECONOMY: 600 AED/week
RENT_MONTHLY_ECONOMY: 1800 AED/month
```

**Use Case:**
- New vehicles inherit category defaults
- Bulk pricing updates across all vehicles in category
- Baseline pricing for quotes/estimates

### Layer 2: Vehicle-Specific Pricing (vehicles table)

**Purpose:** Individual vehicle pricing (overrides category defaults)

**Example:**
```sql
-- Vehicle: Nissan Sunny 98309-G
daily_rate: 100.00   (from category OR custom)
weekly_rate: 600.00  (from category OR custom)
monthly_rate: 1800.00 (from category OR custom)
```

**Use Case:**
- Premium features (sunroof, leather seats) → higher rate
- Older vehicles → lower rate
- High-demand vehicles → surge pricing
- Promotional vehicles → discounted rate

---

## Pricing Resolution Logic

**When calculating rental price:**

```typescript
// 1. Try vehicle-specific pricing first
if (vehicle.daily_rate !== null) {
  return vehicle.daily_rate;
}

// 2. Fall back to category default
const categoryRate = await ChargeService.getAmount(`RENT_DAILY_${vehicle.category}`);
return categoryRate;
```

**Example Flow:**
```
Customer books: Nissan Sunny (Economy)
                ↓
Check vehicles table: daily_rate = 100.00 ✓
                ↓
Use: 100 AED/day

---

Customer books: BMW X5 (Luxury) - new vehicle, no custom rate set
                ↓
Check vehicles table: daily_rate = NULL
                ↓
Check charge_types: RENT_DAILY_LUXURY = 300.00 ✓
                ↓
Use: 300 AED/day
```

---

## Complete Charge Categories

### **RENTAL** (12 charge types)

Primary revenue source - vehicle rental rates

**Category-Based Rates:**
- `RENT_DAILY_ECONOMY` - 100 AED/day
- `RENT_WEEKLY_ECONOMY` - 600 AED/week
- `RENT_MONTHLY_ECONOMY` - 1800 AED/month

- `RENT_DAILY_STANDARD` - 150 AED/day
- `RENT_WEEKLY_STANDARD` - 900 AED/week
- `RENT_MONTHLY_STANDARD` - 2700 AED/month

- `RENT_DAILY_SUV` - 200 AED/day
- `RENT_WEEKLY_SUV` - 1200 AED/week
- `RENT_MONTHLY_SUV` - 3600 AED/month

- `RENT_DAILY_LUXURY` - 300 AED/day
- `RENT_WEEKLY_LUXURY` - 1800 AED/week
- `RENT_MONTHLY_LUXURY` - 5400 AED/month

**Calculation Types:**
- Daily: `PER_DAY` (multiplied by rental days)
- Weekly: `FIXED` (7 days flat rate)
- Monthly: `FIXED` (30 days flat rate)

**Savings Calculation:**
```typescript
// Example: 10-day rental
const dailyTotal = 10 * 100 = 1000 AED
const weeklyTotal = (1 * 600) + (3 * 100) = 900 AED
const savings = 1000 - 900 = 100 AED (10% discount)
```

---

### **INSURANCE** (6 charge types)

Insurance coverage and excess amounts

**Insurance Excess (Third-Party/Basic):**
- `INSURANCE_BASIC_SEDAN` - 2000 AED excess
- `INSURANCE_BASIC_SUV` - 3000 AED excess
- `INSURANCE_BASIC_7SEATER` - 4000 AED excess

**Full Coverage (CDW/SCDW):**
- `INSURANCE_CDW_DAILY` - 50 AED/day (no excess)
- `INSURANCE_SCDW_DAILY` - 75 AED/day (super coverage)

**Security Deposit:**
- `SECURITY_DEPOSIT_PERCENTAGE` - 20% of total with VAT

**Logic:**
```typescript
// At fault accident with Basic Insurance
if (insuranceType === 'BASIC') {
  const excess = await ChargeService.getAmount(`INSURANCE_BASIC_${vehicleType}`);
  customerPays = excess + dailyRentalUntilRepaired;
}

// At fault accident with CDW (Full)
if (insuranceType === 'CDW' || insuranceType === 'FULL') {
  customerPays = 0; // No charges
}

// Security deposit calculation
const subtotal = vehicleRental + addOnsTotal;
const vatAmount = subtotal * 0.05;
const totalWithVat = subtotal + vatAmount;
const securityDeposit = totalWithVat * 0.20;
```

---

### **ADDON** (4 charge types)

Additional services during rental

- `ADDON_GPS` - 25 AED/day
- `ADDON_CHILD_SEAT` - 30 AED/day
- `ADDON_ADDITIONAL_DRIVER` - 50 AED/day
- `ADDON_INSURANCE_UPGRADE` - 75 AED/day

**Calculation:**
```typescript
const addonTotal = addons.reduce((sum, addon) => {
  return sum + (addon.dailyRate * rentalDays);
}, 0);
```

---

### **DELIVERY** (3 charge types)

Vehicle delivery and collection fees

- `DELIVERY_DUBAI` - 0 AED (free for monthly contracts in Dubai)
- `DELIVERY_DUBAI_DAILY` - 50 AED (daily/weekly contracts)
- `DELIVERY_OUTSIDE_DUBAI` - 100 AED

**From Agreement Terms:**
> Daily and weekly contracts will incur a delivery fee as per the customer's location; for monthly contracts, delivery is free in Dubai only.

---

### **TAX** (1 charge type)

UAE regulatory tax

- `VAT_RATE` - 5% (percentage of subtotal)

**Application:**
```typescript
const subtotal = rent + addons + charges - discount;
const vatAmount = subtotal * (vatRate / 100);
const total = subtotal + vatAmount;
```

---

### **FINE_FEE** (5 charge types)

Traffic fine processing fees

- `KNOWLEDGE_FEE` - 20 AED (Dubai Police/RTA)
- `SERVICE_FEE` - 30 AED (Vesla processing)
- `BLACK_POINT_FEE` - 250 AED per point
- `CONFISCATION_PRO_FEE` - 2000 AED (vehicle confiscation)
- `UNDERAGE_CLAIMS_FEE` - 1000 AED (under 25 or license < 1 year)

**Total Fine Calculation:**
```typescript
const totalFine = fineAmount + knowledgeFee + serviceFee + (blackPoints * 250);
```

---

### **SERVICE** (13 charge types)

Operational and administrative fees

**Toll Charges:**
- `SALIK_PEAK` - 7 AED per pass
- `SALIK_OFFPEAK` - 5 AED per pass
- `SALIK_ADMIN` - 30 AED (admin fee per usage)
- `DARB_TOLL` - 5 AED per pass
- `PARKING_SERVICE` - 30 AED (parking admin)

**Operational:**
- `KEY_LOST` - 1200 AED
- `SPARE_KEY_COLLECTION` - 1200 AED + VAT
- `OIL_SERVICE_OVERDUE` - 1000 AED
- `PARKING_CENTER_FEE` - 30 AED
- `LATE_PAYMENT_FEE` - 200 AED/month
- `ADMIN_CASE_FEE` - 5000 AED (legal cases)
- `EXCESS_KM` - 1 AED/km
- `FORCED_COLLECTION` - 1200 AED (recovery fee)

---

### **VIOLATION** (3 charge types)

Contract violation penalties

- `TINTED_WINDOWS` - 500 AED
- `SMOKING_CHARGE` - 500 AED
- `ILLEGAL_USE_PENALTY` - 3000 AED

---

### **CLEANING** (3 charge types)

Vehicle cleaning charges

- `CLEANING_EXTERIOR` - 50 AED
- `CLEANING_INTERIOR` - 50 AED
- `DETAILING` - 500 AED

---

### **FUEL** (5 charge types)

Fuel refill charges based on return level

- `FUEL_0_25` - 200 AED (0-25% fuel level)
- `FUEL_25_50` - 150 AED (25-50% fuel level)
- `FUEL_50_75` - 100 AED (50-75% fuel level)
- `FUEL_75_99` - 50 AED (75-99% fuel level)
- `FUEL_SERVICE_FEE` - 30 AED (service charge)

**Calculation:**
```typescript
async function calculateFuelCharge(returnFuelPercentage: number) {
  let baseCharge = 0;

  if (returnFuelPercentage < 25) baseCharge = 200;
  else if (returnFuelPercentage < 50) baseCharge = 150;
  else if (returnFuelPercentage < 75) baseCharge = 100;
  else if (returnFuelPercentage < 100) baseCharge = 50;

  const serviceFee = baseCharge > 0 ? 30 : 0;
  return baseCharge + serviceFee;
}
```

---

### **DAMAGE** (2 charge types)

Damage-related penalties

- `NO_POLICE_REPORT` - 4000 AED (+ actual damage + rental fees)
- `SELF_REPAIR_PENALTY` - 5000 AED (+ excess + new repair costs)

---

## Total Charge Types: 57

**Breakdown by Category:**
- RENTAL: 12
- INSURANCE: 6
- ADDON: 4
- DELIVERY: 3
- TAX: 1
- FINE_FEE: 5
- SERVICE: 13
- VIOLATION: 3
- CLEANING: 3
- FUEL: 5
- DAMAGE: 2

---

## Usage Examples

### Example 1: Calculate Rental Price
```typescript
import { ChargeService } from '../services/charge.service';

async function calculateRentalPrice(vehicle: Vehicle, days: number) {
  // Try vehicle-specific rate first
  if (vehicle.daily_rate) {
    return vehicle.daily_rate * days;
  }

  // Fall back to category rate
  const categoryRate = await ChargeService.getAmount(
    `RENT_DAILY_${vehicle.category.toUpperCase()}`
  );

  return categoryRate * days;
}
```

### Example 2: Calculate Agreement Total
```typescript
async function calculateAgreementTotal(data: {
  vehicle: Vehicle;
  rentalDays: number;
  addons: Addon[];
  insuranceType: string;
}) {
  // Base rental
  const rentAmount = await calculateRentalPrice(data.vehicle, data.rentalDays);

  // Add-ons
  const addonTotal = await Promise.all(
    data.addons.map(async (addon) => {
      const rate = await ChargeService.getAmount(`ADDON_${addon.code}`);
      return rate * data.rentalDays;
    })
  ).then(amounts => amounts.reduce((sum, amt) => sum + amt, 0));

  // Insurance upgrade
  let insuranceCharge = 0;
  if (data.insuranceType === 'CDW') {
    const cdwRate = await ChargeService.getAmount('INSURANCE_CDW_DAILY');
    insuranceCharge = cdwRate * data.rentalDays;
  }

  // Subtotal
  const subtotal = rentAmount + addonTotal + insuranceCharge;

  // VAT
  const vatRate = await ChargeService.getAmount('VAT_RATE');
  const vatAmount = subtotal * (vatRate / 100);

  // Total
  const totalWithVat = subtotal + vatAmount;

  // Security Deposit
  const depositRate = await ChargeService.getAmount('SECURITY_DEPOSIT_PERCENTAGE');
  const securityDeposit = totalWithVat * (depositRate / 100);

  return {
    rent_amount: rentAmount,
    addon_total: addonTotal,
    insurance_charge: insuranceCharge,
    subtotal,
    vat_amount: vatAmount,
    total_charges: totalWithVat,
    security_deposit: securityDeposit,
  };
}
```

### Example 3: Update Category Pricing
```typescript
// Admin updates all economy vehicles to new rate
await ChargeService.updateAmount('RENT_DAILY_ECONOMY', 120.00, new Date('2026-01-01'), 'Seasonal price increase');

// All economy vehicles without custom rates now use 120 AED/day
// Vehicles with custom rates remain unchanged
```

### Example 4: Set Vehicle-Specific Rate
```typescript
// Premium Nissan Sunny with sunroof gets custom rate
await pool.query(
  `UPDATE vehicles
   SET daily_rate = 120.00,
       weekly_rate = 720.00,
       monthly_rate = 2160.00
   WHERE plate_number = '98309-G'`
);

// This vehicle now uses custom rates instead of category defaults
```

---

## Best Practices

### 1. **Use Category Rates as Defaults**
- Set category rates in charge_types
- Only override in vehicles table when necessary
- Makes bulk pricing updates easier

### 2. **Track Price Changes**
- charge_history table automatically logs all changes
- Include change_reason for audit purposes
- Use effective_from for future pricing

### 3. **Calculation Consistency**
- Always use ChargeService.getAmount()
- Never hardcode rates in application code
- Use date-based lookup for historical agreements

### 4. **Taxable Flags**
- Most charges are taxable (is_taxable = true)
- Security deposit is NOT taxable
- Insurance excess is NOT taxable

### 5. **Seasonal Pricing**
- Use effective_from/effective_to dates
- Create new charge entries for peak seasons
- Maintain historical rates for old agreements

---

## Database Queries

### Get All Active Rental Rates
```sql
SELECT charge_code, charge_name, amount, calculation_type
FROM charge_types
WHERE charge_category = 'RENTAL'
  AND is_active = TRUE
  AND effective_from <= CURRENT_DATE
  AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
ORDER BY charge_code;
```

### Get Vehicle Price (with fallback)
```sql
SELECT
  v.plate_number,
  v.category,
  COALESCE(
    v.daily_rate,
    (SELECT amount FROM charge_types WHERE charge_code = 'RENT_DAILY_' || UPPER(v.category) LIMIT 1)
  ) as effective_daily_rate
FROM vehicles v
WHERE v.id = 'vehicle-uuid';
```

### Update Category Pricing
```sql
UPDATE charge_types
SET amount = 120.00,
    effective_from = '2026-01-01'
WHERE charge_code = 'RENT_DAILY_ECONOMY';
```

### View Price History
```sql
SELECT
  ct.charge_code,
  ct.charge_name,
  ch.old_amount,
  ch.new_amount,
  ch.change_reason,
  ch.effective_from
FROM charge_history ch
JOIN charge_types ct ON ct.id = ch.charge_type_id
WHERE ct.charge_category = 'RENTAL'
ORDER BY ch.created_at DESC;
```

---

## Migration Impact

### Before Migration
```typescript
// Hardcoded rates
const dailyRate = vehicle.category === 'ECONOMY' ? 100 : 150;
const vatRate = 5; // Hardcoded 5%
const knowledgeFee = 20; // Hardcoded
```

### After Migration
```typescript
// Dynamic rates
const dailyRate = await calculateRentalPrice(vehicle, 1);
const vatRate = await ChargeService.getAmount('VAT_RATE');
const knowledgeFee = await ChargeService.getAmount('KNOWLEDGE_FEE');
```

**Benefits:**
- ✅ Change rates without deploying code
- ✅ Price history tracking
- ✅ Future-dated pricing
- ✅ Consistent pricing across system
- ✅ Easy bulk updates

---

*Pricing Architecture Version: 1.0*
*Last Updated: 2025-12-05*
