# Charge Types Migration Guide

## Why We Need This

**Problem:** Currently, all charges are hardcoded in:
- Application code (e.g., `BLACK_POINT_FEE = 250`)
- Database defaults (e.g., `knowledge_fee DECIMAL(10, 2) DEFAULT 20.00`)
- Documentation

**Issues:**
1. ❌ Can't change prices without deploying new code
2. ❌ No audit trail of price changes
3. ❌ Inconsistent pricing across agreements
4. ❌ Hard to track historical pricing

**Solution:** Centralized `charge_types` master table

---

## Benefits

### 1. **Dynamic Pricing**
```sql
-- Admin changes black point fee from 250 to 300
UPDATE charge_types
SET amount = 300.00, effective_from = '2026-01-01'
WHERE charge_code = 'BLACK_POINT_FEE';

-- All new fines from Jan 1, 2026 use new rate
-- Old fines still use historical rate
```

### 2. **Price History Tracking**
```sql
-- See all price changes for a charge
SELECT
    ct.charge_name,
    ch.old_amount,
    ch.new_amount,
    ch.effective_from,
    ch.change_reason
FROM charge_history ch
JOIN charge_types ct ON ct.id = ch.charge_type_id
WHERE ct.charge_code = 'BLACK_POINT_FEE'
ORDER BY ch.effective_from DESC;
```

### 3. **Consistent Application**
```sql
-- Instead of hardcoded:
const blackPointFee = 250; // Bad

-- Use database:
const blackPointFee = await getChargeAmount('BLACK_POINT_FEE'); // Good
```

### 4. **Date-Based Pricing**
```sql
-- Get price on specific date (for historical agreements)
SELECT get_charge_amount_on_date('KNOWLEDGE_FEE', '2024-06-15');

-- Ensures agreements use correct prices for their period
```

---

## Charge Categories

**From Agreement Terms & Conditions:**

### **FINE_FEE** (Fines & Penalties)
- Knowledge Fee: 20 AED (Dubai Police/RTA)
- Service Fee: 30 AED (Vesla processing)
- Black Point: 250 AED per point
- Confiscation PRO: 2000 AED
- Underage Claims: 1000 AED

### **SERVICE** (Additional Services)
- Salik Peak: 7 AED
- Salik Off-Peak: 5 AED
- Salik Admin: 30 AED
- Darb Toll: 5 AED
- Key Lost: 1200 AED
- Oil Service Overdue: 1000 AED
- Late Payment: 200 AED/month
- Additional Driver: 100 AED
- Excess KM: 1 AED/km

### **VIOLATION** (Contract Violations)
- Tinted Windows: 500 AED
- Smoking: 500 AED
- Illegal Use: 3000 AED

### **CLEANING** (Vehicle Cleaning)
- Exterior: 50 AED
- Interior: 50 AED
- Detailing: 500 AED

### **FUEL** (Fuel Charges)
- 0-25%: 200 AED
- 25-50%: 150 AED
- 50-75%: 100 AED
- 75-99%: 50 AED
- Service Fee: 30 AED

### **DAMAGE** (Damage Penalties)
- No Police Report: 4000 AED
- Self-Repair: 5000 AED

---

## Migration Steps

### Step 1: Run Charge Types Schema
```bash
psql "postgres://your-connection-string" -f charge_types_table.sql
```

**What it creates:**
- `charge_types` table (27 initial charges)
- `charge_history` table (audit trail)
- `get_charge_amount()` function
- `get_charge_amount_on_date()` function
- Price change audit trigger

### Step 2: Verify Charges Loaded
```sql
SELECT charge_code, charge_name, amount, charge_category
FROM charge_types
WHERE is_active = TRUE
ORDER BY charge_category, charge_code;
```

**Expected: 27 active charges**

### Step 3: Update Traffic Fines Table
```sql
-- Remove hardcoded defaults
ALTER TABLE traffic_fines
ALTER COLUMN knowledge_fee DROP DEFAULT,
ALTER COLUMN service_fee DROP DEFAULT,
ALTER COLUMN black_points_charge DROP DEFAULT;

-- These will now be calculated using charge_types
```

### Step 4: Update Application Code

**Before (Bad):**
```typescript
// traffic-fine.service.ts
const knowledgeFee = 20.00; // Hardcoded
const serviceFee = 30.00; // Hardcoded
const blackPointCharge = blackPoints * 250; // Hardcoded

const totalAmount = fineAmount + knowledgeFee + serviceFee + blackPointCharge;
```

**After (Good):**
```typescript
// traffic-fine.service.ts
import pool from './database';

async function calculateFineTotalAmount(fineAmount: number, blackPoints: number): Promise<number> {
  const knowledgeFee = await getChargeAmount('KNOWLEDGE_FEE');
  const serviceFee = await getChargeAmount('SERVICE_FEE');
  const blackPointRate = await getChargeAmount('BLACK_POINT_FEE');
  const blackPointCharge = blackPoints * blackPointRate;

  return fineAmount + knowledgeFee + serviceFee + blackPointCharge;
}

async function getChargeAmount(chargeCode: string): Promise<number> {
  const result = await pool.query(
    'SELECT get_charge_amount($1) as amount',
    [chargeCode]
  );
  return parseFloat(result.rows[0].amount);
}
```

### Step 5: Create Charge Service

**Create:** `backend/src/services/charge.service.ts`

```typescript
import pool from '../models/database';

interface ChargeType {
  id: string;
  charge_code: string;
  charge_name: string;
  charge_category: string;
  amount: number;
  calculation_type: string;
  is_taxable: boolean;
  description: string;
}

export const ChargeService = {
  /**
   * Get current charge amount by code
   */
  async getAmount(chargeCode: string): Promise<number> {
    const result = await pool.query(
      'SELECT get_charge_amount($1) as amount',
      [chargeCode]
    );
    return parseFloat(result.rows[0].amount) || 0;
  },

  /**
   * Get charge amount on specific date (for historical pricing)
   */
  async getAmountOnDate(chargeCode: string, date: Date): Promise<number> {
    const result = await pool.query(
      'SELECT get_charge_amount_on_date($1, $2) as amount',
      [chargeCode, date]
    );
    return parseFloat(result.rows[0].amount) || 0;
  },

  /**
   * Get all active charges by category
   */
  async getByCategory(category: string): Promise<ChargeType[]> {
    const result = await pool.query(
      `SELECT * FROM charge_types
       WHERE charge_category = $1
         AND is_active = TRUE
         AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY charge_name`,
      [category]
    );
    return result.rows;
  },

  /**
   * Get all active charges
   */
  async getAllActive(): Promise<ChargeType[]> {
    const result = await pool.query(
      `SELECT * FROM charge_types
       WHERE is_active = TRUE
         AND effective_from <= CURRENT_DATE
         AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
       ORDER BY charge_category, charge_name`
    );
    return result.rows;
  },

  /**
   * Update charge amount (creates audit trail)
   */
  async updateAmount(
    chargeCode: string,
    newAmount: number,
    effectiveFrom: Date,
    reason: string
  ): Promise<void> {
    await pool.query(
      `UPDATE charge_types
       SET amount = $1,
           effective_from = $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE charge_code = $3`,
      [newAmount, effectiveFrom, chargeCode]
    );

    // History logged automatically via trigger
  },

  /**
   * Calculate fuel charge based on return percentage
   */
  async calculateFuelCharge(fuelPercentage: number): Promise<number> {
    let chargeCode: string;

    if (fuelPercentage >= 0 && fuelPercentage < 25) {
      chargeCode = 'FUEL_0_25';
    } else if (fuelPercentage >= 25 && fuelPercentage < 50) {
      chargeCode = 'FUEL_25_50';
    } else if (fuelPercentage >= 50 && fuelPercentage < 75) {
      chargeCode = 'FUEL_50_75';
    } else if (fuelPercentage >= 75 && fuelPercentage < 100) {
      chargeCode = 'FUEL_75_99';
    } else {
      return 0; // No charge if 100%
    }

    const fuelCharge = await this.getAmount(chargeCode);
    const serviceFee = await this.getAmount('FUEL_SERVICE_FEE');

    return fuelCharge + serviceFee;
  },

  /**
   * Calculate traffic fine total
   */
  async calculateFineTotalAmount(
    fineAmount: number,
    blackPoints: number
  ): Promise<{
    knowledge_fee: number;
    service_fee: number;
    black_points_charge: number;
    total_amount: number;
  }> {
    const knowledgeFee = await this.getAmount('KNOWLEDGE_FEE');
    const serviceFee = await this.getAmount('SERVICE_FEE');
    const blackPointRate = await this.getAmount('BLACK_POINT_FEE');
    const blackPointsCharge = blackPoints * blackPointRate;

    return {
      knowledge_fee: knowledgeFee,
      service_fee: serviceFee,
      black_points_charge: blackPointsCharge,
      total_amount: fineAmount + knowledgeFee + serviceFee + blackPointsCharge,
    };
  },
};
```

---

## Usage Examples

### Example 1: Create Traffic Fine
```typescript
import { ChargeService } from '../services/charge.service';

async function createTrafficFine(data: {
  fineAmount: number;
  blackPoints: number;
  // ... other fields
}) {
  const charges = await ChargeService.calculateFineTotalAmount(
    data.fineAmount,
    data.blackPoints
  );

  const result = await pool.query(
    `INSERT INTO traffic_fines (
      fine_amount,
      knowledge_fee,
      service_fee,
      black_points,
      black_points_charge,
      total_amount
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [
      data.fineAmount,
      charges.knowledge_fee,
      charges.service_fee,
      data.blackPoints,
      charges.black_points_charge,
      charges.total_amount,
    ]
  );

  return result.rows[0];
}
```

### Example 2: Calculate Fuel Charge at Return
```typescript
async function processVehicleReturn(agreementId: string, returnFuelPercentage: number) {
  const fuelCharge = await ChargeService.calculateFuelCharge(returnFuelPercentage);

  if (fuelCharge > 0) {
    await pool.query(
      `UPDATE rental_agreements
       SET fuel_charges = $1
       WHERE id = $2`,
      [fuelCharge, agreementId]
    );
  }
}
```

### Example 3: Add Line Item with Charge Reference
```typescript
async function addAgreementCharge(agreementId: string, chargeCode: string, quantity: number = 1) {
  const charge = await pool.query(
    `SELECT * FROM charge_types WHERE charge_code = $1 AND is_active = TRUE`,
    [chargeCode]
  );

  const chargeType = charge.rows[0];
  const totalAmount = chargeType.amount * quantity;

  await pool.query(
    `INSERT INTO agreement_line_items (
      agreement_id,
      charge_type_id,
      item_type,
      description,
      quantity,
      unit_price,
      total_amount
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      agreementId,
      chargeType.id,
      'CHARGE',
      chargeType.charge_name,
      quantity,
      chargeType.amount,
      totalAmount,
    ]
  );
}
```

### Example 4: Admin API - Get All Charges
```typescript
// GET /api/admin/charges
router.get('/charges', async (req, res) => {
  const charges = await ChargeService.getAllActive();
  res.json({ charges });
});
```

### Example 5: Admin API - Update Charge
```typescript
// PUT /api/admin/charges/:code
router.put('/charges/:code', async (req, res) => {
  const { code } = req.params;
  const { amount, effectiveFrom, reason } = req.body;

  await ChargeService.updateAmount(code, amount, new Date(effectiveFrom), reason);

  res.json({ message: 'Charge updated successfully' });
});
```

---

## Testing

### Test 1: Verify Charge Amounts
```sql
SELECT charge_code, amount FROM charge_types WHERE charge_code IN (
  'KNOWLEDGE_FEE',
  'SERVICE_FEE',
  'BLACK_POINT_FEE',
  'SMOKING_CHARGE',
  'KEY_LOST'
);
```

**Expected:**
```
KNOWLEDGE_FEE    | 20.00
SERVICE_FEE      | 30.00
BLACK_POINT_FEE  | 250.00
SMOKING_CHARGE   | 500.00
KEY_LOST         | 1200.00
```

### Test 2: Price Change Audit
```sql
-- Update a charge
UPDATE charge_types
SET amount = 35.00
WHERE charge_code = 'SERVICE_FEE';

-- Check history logged
SELECT * FROM charge_history
WHERE charge_type_id = (SELECT id FROM charge_types WHERE charge_code = 'SERVICE_FEE');
```

### Test 3: Date-Based Pricing
```sql
-- Get current price
SELECT get_charge_amount('SERVICE_FEE'); -- 35.00

-- Get historical price
SELECT get_charge_amount_on_date('SERVICE_FEE', '2025-01-01'); -- 30.00
```

---

## Rollback Plan

If you need to rollback:

```sql
-- Drop charge types tables
DROP TABLE IF EXISTS charge_history CASCADE;
DROP TABLE IF EXISTS charge_types CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS get_charge_amount(VARCHAR);
DROP FUNCTION IF EXISTS get_charge_amount_on_date(VARCHAR, DATE);
DROP FUNCTION IF EXISTS log_charge_price_change();

-- Restore hardcoded defaults in traffic_fines
ALTER TABLE traffic_fines
ALTER COLUMN knowledge_fee SET DEFAULT 20.00,
ALTER COLUMN service_fee SET DEFAULT 30.00;
```

---

## Next Steps

1. ✅ Run `charge_types_table.sql` migration
2. ✅ Verify 27 charges loaded
3. ✅ Create `charge.service.ts` in backend
4. ✅ Update fine calculation logic
5. ✅ Update agreement charge logic
6. ✅ Test all charge calculations
7. ✅ Create admin UI for managing charges

---

*Migration Guide Version: 1.0*
*Last Updated: 2025-12-05*
