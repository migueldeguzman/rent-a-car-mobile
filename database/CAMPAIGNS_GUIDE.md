# Campaigns & Promotions System - Complete Guide

## Overview

Flexible promotional system supporting seasonal discounts, loyalty programs, bundled offers, and time-limited campaigns. Designed to handle complex marketing scenarios with minimal code changes.

---

## Campaign Types

### 1. **DISCOUNT** - Percentage or Fixed Amount Off

**Use Cases:**
- Summer Sale: 20% off all rentals
- Weekend Special: 150 AED off
- Corporate discount: 25% off

**Configuration:**
```sql
discount_type: 'PERCENTAGE' or 'FIXED_AMOUNT'
discount_value: 20.00 (for 20%) or 150.00 (for 150 AED)
max_discount_amount: 500.00 (optional cap)
```

### 2. **BONUS_DAYS** - Free Extra Days

**Use Cases:**
- Rent 7 days, get 2 free
- Rent 30 days, get 5 free
- Weekend bonus: Rent Fri-Sun, get Monday free

**Configuration:**
```sql
campaign_type: 'BONUS_DAYS'
free_days_count: 2
free_days_trigger_count: 7
min_rental_days: 7
```

### 3. **FREE_ADDON** - Complimentary Add-ons

**Use Cases:**
- Free GPS with economy cars
- Free child seat for families
- Free insurance upgrade

**Configuration:**
```sql
campaign_type: 'FREE_ADDON'
free_addons: '["ADDON_GPS", "ADDON_CHILD_SEAT"]'::JSONB
```

### 4. **WAIVE_FEE** - Remove Charges

**Use Cases:**
- Free delivery in Dubai
- Waive additional driver fee
- No admin fees

**Configuration:**
```sql
campaign_type: 'WAIVE_FEE'
waived_fees: '["DELIVERY_DUBAI_DAILY", "ADDITIONAL_DRIVER"]'::JSONB
```

### 5. **BUNDLED** - Multiple Benefits

**Use Cases:**
- Ramadan: 20% off + free delivery + free GPS
- Corporate VIP: Discount + add-ons + fee waivers
- Premium package: Luxury car + full insurance + free extras

**Configuration:**
```sql
campaign_type: 'BUNDLED'
discount_type: 'PERCENTAGE'
discount_value: 20.00
free_addons: '["ADDON_GPS"]'::JSONB
waived_fees: '["DELIVERY_DUBAI_DAILY"]'::JSONB
```

### 6. **LOYALTY** - Repeat Customer Rewards

**Use Cases:**
- 5th rental free
- Point accumulation
- Tier-based benefits

**Configuration:**
```sql
campaign_type: 'LOYALTY'
target_customer_segments: '["VIP", "CORPORATE"]'::JSONB
usage_limit_per_customer: NULL (unlimited for loyalty members)
```

---

## Targeting Options

### **applies_to** Field Values

#### 1. **ALL** - Universal Campaign
Applies to all vehicles, all customers, all conditions

```sql
applies_to: 'ALL'
```

#### 2. **VEHICLE_CATEGORY** - Specific Categories
Target economy, luxury, SUV, etc.

```sql
applies_to: 'VEHICLE_CATEGORY'
target_categories: '["ECONOMY", "STANDARD"]'::JSONB
```

#### 3. **SPECIFIC_VEHICLE** - Individual Vehicles
Target specific plate numbers or vehicle IDs

```sql
applies_to: 'SPECIFIC_VEHICLE'
target_vehicles: '["vehicle-uuid-1", "vehicle-uuid-2"]'::JSONB
```

#### 4. **CUSTOMER_SEGMENT** - Customer Types
Target new customers, corporate, VIP, etc.

```sql
applies_to: 'CUSTOMER_SEGMENT'
target_customer_segments: '["CORPORATE", "VIP", "NEW_CUSTOMER"]'::JSONB
```

#### 5. **RENTAL_DURATION** - Length-Based
Activate based on rental period

```sql
applies_to: 'RENTAL_DURATION'
min_rental_days: 7
max_rental_days: 30
```

---

## Sample Campaigns (10 Included)

### 1. **Summer Sale 2025**
```sql
Campaign: SUMMER2025
Type: DISCOUNT (20% off)
Period: June 1 - Aug 31, 2025
Target: ALL vehicles
Auto-apply: YES
Promo code: Not required
```

### 2. **Weekly Rental Bonus**
```sql
Campaign: WEEKLY_BONUS
Type: BONUS_DAYS (2 free days)
Trigger: 7 days rental
Period: Year-round
Auto-apply: YES
Result: 9 days for price of 7
```

### 3. **Monthly Rental Discount**
```sql
Campaign: MONTHLY30
Type: DISCOUNT (30% off)
Period: Year-round
Min days: 30
Auto-apply: YES
```

### 4. **Economy Weekend Special**
```sql
Campaign: WEEKEND_ECONOMY
Type: DISCOUNT (150 AED off)
Period: Year-round
Target: ECONOMY vehicles only
Promo code: WEEKEND
Min days: 2
```

### 5. **New Customer Welcome**
```sql
Campaign: WELCOME_NEW
Type: DISCOUNT (15% off)
Period: Year-round
Target: NEW_CUSTOMER segment
Auto-apply: YES
Limit: 1 use per customer
```

### 6. **Corporate VIP Program**
```sql
Campaign: CORPORATE_VIP
Type: BUNDLED
Benefits:
  - 25% discount
  - Free GPS
  - Free delivery
Target: CORPORATE, VIP segments
Auto-apply: YES
```

### 7. **Ramadan Special**
```sql
Campaign: RAMADAN2025
Type: BUNDLED
Period: March 1-30, 2025
Benefits:
  - 20% discount
  - Waived delivery fee
Promo code: RAMADAN2025
```

### 8. **UAE National Day**
```sql
Campaign: UAE_NATIONAL_DAY
Type: DISCOUNT (49 AED off)
Period: Nov 28 - Dec 5, 2025
Target: ALL
Auto-apply: YES
```

### 9. **Luxury Upgrade Deal**
```sql
Campaign: LUXURY_UPGRADE
Type: CUSTOM
Period: Jan 15 - Feb 15, 2025
Offer: Luxury cars at Standard pricing
Promo code: LUXUPGRADE
Limit: 50 bookings total
```

### 10. **Early Bird Booking**
```sql
Campaign: EARLY_BIRD_30
Type: DISCOUNT (10% off)
Period: Year-round
Requirement: Book 30 days in advance
Auto-apply: YES
```

---

## Usage Flow

### Step 1: Customer Searches for Vehicle
```typescript
// Frontend: Vehicle list screen
// No campaign logic yet, just show regular prices
```

### Step 2: Customer Selects Vehicle & Dates
```typescript
// Backend calculates base price
const basePrice = calculateRentalPrice(vehicle, rentalDays);
```

### Step 3: Check Applicable Campaigns
```typescript
// Backend service
import pool from './database';

async function getApplicableCampaigns(
  customerId: string,
  vehicleId: string,
  startDate: Date,
  rentalDays: number,
  promoCode?: string
) {
  const result = await pool.query(
    `SELECT * FROM get_applicable_campaigns($1, $2, $3, $4, $5)`,
    [customerId, vehicleId, startDate, rentalDays, promoCode]
  );

  return result.rows;
}
```

### Step 4: Apply Best Campaign (Highest Priority)
```typescript
const campaigns = await getApplicableCampaigns(...);

let bestDiscount = 0;
let selectedCampaign = null;

for (const campaign of campaigns) {
  const discount = await calculateCampaignDiscount(
    campaign.campaign_id,
    basePrice
  );

  if (discount > bestDiscount) {
    bestDiscount = discount;
    selectedCampaign = campaign;
  }
}

const finalPrice = basePrice - bestDiscount;
```

### Step 5: Show Pricing to Customer
```typescript
// Response to frontend
{
  "originalPrice": 700.00,
  "campaignApplied": {
    "code": "SUMMER2025",
    "name": "Summer Sale - 20% Off",
    "discountAmount": 140.00
  },
  "finalPrice": 560.00,
  "savings": 140.00,
  "savingsPercentage": 20.00
}
```

### Step 6: Customer Confirms Booking
```typescript
// Record campaign usage
await pool.query(
  `SELECT record_campaign_usage($1, $2, $3, $4, $5, $6)`,
  [campaignId, customerId, bookingId, discountAmount, originalPrice, promoCode]
);

// Update booking with discount
await pool.query(
  `UPDATE bookings
   SET discount_amount = $1,
       campaign_id = $2
   WHERE id = $3`,
  [discountAmount, campaignId, bookingId]
);
```

---

## Priority & Stacking Rules

### Priority System

**Higher number = Applied first**

```sql
priority: 1 (default)
priority: 5 (medium)
priority: 10 (highest)
```

**Example:**
```sql
-- Both campaigns apply to same booking
Campaign A: SUMMER2025 (20% off, priority: 5)
Campaign B: CORPORATE_VIP (25% off, priority: 10)

Result: Corporate VIP applied (higher priority + better discount)
```

### Stacking Campaigns

**stackable = TRUE:** Can combine with other campaigns

```sql
-- Example: Stack multiple campaigns
Campaign 1: EARLY_BIRD_30 (10% off, stackable: TRUE, priority: 5)
Campaign 2: CORPORATE_VIP (25% off, stackable: TRUE, priority: 10)

Total discount: 35% off
```

**stackable = FALSE:** Cannot combine (default)

```sql
-- Only highest priority/value applies
Campaign 1: SUMMER2025 (20% off, stackable: FALSE)
Campaign 2: WEEKEND_ECONOMY (150 AED off, stackable: FALSE)

Result: Apply whichever gives bigger discount
```

---

## Promo Code Handling

### Auto-Apply Campaigns (no promo code needed)

```sql
requires_promo_code: FALSE
auto_apply: TRUE
```

Customer sees discount automatically at checkout.

### Promo Code Required

```sql
requires_promo_code: TRUE
promo_code: 'SUMMER2025'
auto_apply: FALSE
```

Customer must enter "SUMMER2025" to activate.

### API Endpoint Example

```typescript
// POST /api/bookings/apply-promo
{
  "bookingId": "uuid",
  "promoCode": "SUMMER2025"
}

// Response
{
  "success": true,
  "campaign": {
    "name": "Summer Sale - 20% Off",
    "discountAmount": 140.00
  },
  "newTotal": 560.00
}
```

---

## Usage Limits

### Per-Customer Limit

```sql
usage_limit_per_customer: 1

-- First-time customer campaign
-- Each customer can use only once
```

### Total Campaign Limit

```sql
total_usage_limit: 100

-- Limited availability offers
-- First 100 bookings only
```

### Tracking

```sql
-- Current usage count automatically incremented
current_usage_count: 47 (out of 100)

-- Campaign stops applying when limit reached
```

---

## Time-Based Targeting

### Campaign Period (When Rental Happens)

```sql
start_date: '2025-06-01'
end_date: '2025-08-31'

-- Rental must START within this period
```

### Booking Period (When Booking is Made)

```sql
booking_start_date: '2025-05-01'
booking_end_date: '2025-08-31'

-- Booking created within this period
-- Rental can be later (early bird scenario)
```

### Example: Early Bird Campaign

```sql
Campaign: EARLY_BIRD_30
booking_start_date: '2025-01-01' (book anytime)
start_date: '2025-02-01' (rental must be in Feb+)
Requirement: Book 30 days before start_date
```

---

## Special Campaign Features

### Free Days Calculation

```typescript
// Weekly Bonus: Rent 7, get 2 free
free_days_trigger_count: 7
free_days_count: 2

// Customer books 7 days
const effectiveDays = 7 + 2 = 9 days
const chargeFor = 7 days
const discount = 2 * dailyRate
```

### Bundle Components

```sql
-- Create bundle offer
INSERT INTO campaign_bundles (campaign_id, bundle_component_type, component_value, discount_percentage)
VALUES
  ('campaign-uuid', 'ADDON', '{"addon_code": "ADDON_GPS"}', 50.00), -- GPS 50% off
  ('campaign-uuid', 'INSURANCE_UPGRADE', '{"type": "CDW"}', 100.00); -- Free CDW
```

---

## Reporting & Analytics

### Active Campaigns View

```sql
SELECT * FROM active_campaigns_summary;
```

**Returns:**
- Currently active campaigns
- Usage percentage
- Promo codes
- Auto-apply status

### Campaign Performance Report

```sql
SELECT * FROM campaign_performance
ORDER BY total_discount_given DESC;
```

**Returns:**
- Total uses
- Unique customers
- Revenue impact
- Average discount per booking

### Custom Queries

**Top performing campaigns:**
```sql
SELECT
  campaign_code,
  campaign_name,
  COUNT(*) as uses,
  SUM(discount_amount) as total_discounts,
  AVG(discount_amount) as avg_discount
FROM campaign_usage
WHERE applied_at >= '2025-01-01'
GROUP BY campaign_code, campaign_name
ORDER BY uses DESC
LIMIT 10;
```

**Customer segment analysis:**
```sql
SELECT
  c.target_customer_segments,
  COUNT(cu.id) as total_uses,
  SUM(cu.discount_amount) as total_discount
FROM campaigns c
JOIN campaign_usage cu ON cu.campaign_id = c.id
WHERE c.target_customer_segments IS NOT NULL
GROUP BY c.target_customer_segments;
```

---

## API Integration Examples

### Get Applicable Campaigns

```typescript
// GET /api/campaigns/applicable
// Query params: vehicleId, startDate, rentalDays, customerId, promoCode?

router.get('/campaigns/applicable', async (req, res) => {
  const { vehicleId, startDate, rentalDays, customerId, promoCode } = req.query;

  const campaigns = await pool.query(
    `SELECT * FROM get_applicable_campaigns($1, $2, $3, $4, $5)`,
    [customerId, vehicleId, startDate, rentalDays, promoCode]
  );

  res.json({ campaigns: campaigns.rows });
});
```

### Apply Campaign to Booking

```typescript
// POST /api/bookings/:id/apply-campaign
// Body: { campaignId, promoCode? }

router.post('/bookings/:id/apply-campaign', async (req, res) => {
  const { id } = req.params;
  const { campaignId, promoCode } = req.body;

  // Get booking details
  const booking = await pool.query('SELECT * FROM bookings WHERE id = $1', [id]);
  const originalAmount = booking.rows[0].total_amount;

  // Calculate discount
  const discount = await pool.query(
    'SELECT calculate_campaign_discount($1, $2) as discount',
    [campaignId, originalAmount]
  );

  const discountAmount = discount.rows[0].discount;

  // Record usage
  await pool.query(
    'SELECT record_campaign_usage($1, $2, $3, $4, $5, $6)',
    [campaignId, req.user.id, id, discountAmount, originalAmount, promoCode]
  );

  // Update booking
  await pool.query(
    `UPDATE bookings
     SET discount_amount = $1,
         total_amount = $2
     WHERE id = $3`,
    [discountAmount, originalAmount - discountAmount, id]
  );

  res.json({
    success: true,
    discountAmount,
    newTotal: originalAmount - discountAmount,
  });
});
```

### Admin: Create Campaign

```typescript
// POST /api/admin/campaigns
router.post('/admin/campaigns', async (req, res) => {
  const {
    campaign_code,
    campaign_name,
    campaign_type,
    start_date,
    end_date,
    discount_type,
    discount_value,
    // ... other fields
  } = req.body;

  const result = await pool.query(
    `INSERT INTO campaigns (
      campaign_code, campaign_name, campaign_type,
      start_date, end_date, discount_type, discount_value,
      created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    RETURNING *`,
    [
      campaign_code,
      campaign_name,
      campaign_type,
      start_date,
      end_date,
      discount_type,
      discount_value,
      req.user.id,
    ]
  );

  res.json({ campaign: result.rows[0] });
});
```

---

## Best Practices

### 1. **Use Auto-Apply for Universal Promotions**
```sql
-- Good for: Summer sales, seasonal discounts
auto_apply: TRUE
requires_promo_code: FALSE
```

### 2. **Require Promo Codes for Limited Offers**
```sql
-- Good for: Email campaigns, partnerships, influencers
auto_apply: FALSE
requires_promo_code: TRUE
promo_code: 'EXCLUSIVE2025'
```

### 3. **Set Usage Limits for High-Value Campaigns**
```sql
-- Protect against abuse
total_usage_limit: 100
usage_limit_per_customer: 1
max_discount_amount: 500.00
```

### 4. **Use Priority for Campaign Hierarchy**
```sql
-- VIP programs highest
priority: 10 (Corporate/VIP)
priority: 5 (Seasonal sales)
priority: 1 (Generic discounts)
```

### 5. **Track Performance Regularly**
```sql
-- Weekly check
SELECT * FROM campaign_performance
WHERE total_uses > 0
ORDER BY total_discount_given DESC;
```

---

## Testing Campaigns

### Test Scenario 1: Auto-Apply Discount

```sql
-- Create test campaign
INSERT INTO campaigns (campaign_code, campaign_name, campaign_type, start_date, end_date, discount_type, discount_value, auto_apply)
VALUES ('TEST_AUTO', 'Test Auto Discount', 'DISCOUNT', CURRENT_DATE, CURRENT_DATE + 30, 'PERCENTAGE', 15.00, TRUE);

-- Test query
SELECT * FROM get_applicable_campaigns(
  'customer-uuid',
  'vehicle-uuid',
  CURRENT_DATE,
  3,
  NULL
);

-- Should return TEST_AUTO campaign
```

### Test Scenario 2: Promo Code Required

```sql
-- Without promo code
SELECT * FROM get_applicable_campaigns(
  'customer-uuid',
  'vehicle-uuid',
  CURRENT_DATE,
  3,
  NULL
);
-- Returns: [] (no campaigns)

-- With promo code
SELECT * FROM get_applicable_campaigns(
  'customer-uuid',
  'vehicle-uuid',
  CURRENT_DATE,
  3,
  'WEEKEND'
);
-- Returns: WEEKEND_ECONOMY campaign
```

---

*Campaigns System Guide Version: 1.0*
*Last Updated: 2025-12-05*
