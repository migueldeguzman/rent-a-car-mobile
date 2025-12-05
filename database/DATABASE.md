# Vesla Rent A Car - Database Design & Philosophy

## Table of Contents
1. [Core Concepts](#core-concepts)
2. [Design Philosophy](#design-philosophy)
3. [Database Structure](#database-structure)
4. [Table Relationships](#table-relationships)
5. [Key Design Decisions](#key-design-decisions)
6. [Data Flow](#data-flow)

---

## Core Concepts

### What is a Database?

**Think of it as a digital filing cabinet** that stores all your business information in an organized way.

**Real-world analogy:**
- Filing cabinet = Database
- Drawers = Tables
- Folders in drawer = Rows
- Labels on folders = Columns

### What is a Table?

**A table is like an Excel spreadsheet** - data organized in rows and columns.

**Example: customers table**

| id | name | email | phone | license_number |
|----|------|-------|-------|----------------|
| 1 | Ahmed Ali | ahmed@email.com | +971501234567 | ABC123 |
| 2 | Sarah Hassan | sarah@email.com | +971509876543 | XYZ789 |

- **Rows** = Individual records (each customer)
- **Columns** = Properties (name, email, phone)

### What is a Schema?

**A schema is the blueprint or design** - it defines:
- What tables exist
- What columns each table has
- What type of data goes in each column
- How tables connect to each other

**Analogy:**
- Building blueprint = Schema
- Actual building = Database with data

---

## Design Philosophy

### 1. **Single Source of Truth**

**Problem:** Information scattered everywhere leads to confusion.

**Our Solution:** Every piece of data lives in exactly ONE place.

**Example:**
- Customer's phone number → Stored ONLY in `customers` table
- Vehicle's plate number → Stored ONLY in `vehicles` table
- Rental price → Referenced from `charge_types` table

**Why this matters:**
- Update phone number once → Changes everywhere automatically
- No duplicate data = No conflicts
- Easy to maintain and audit

---

### 2. **Separation of Concerns**

**Each table has ONE clear job.**

**Bad Design (Everything in one table):**
```
┌─────────────────────────────────────────────────────┐
│ booking_everything                                  │
├─────────────────────────────────────────────────────┤
│ customer_name, customer_email, customer_phone,      │
│ vehicle_make, vehicle_model, vehicle_plate,         │
│ rental_start, rental_end, price, discount...       │
│ (50+ columns!)                                      │
└─────────────────────────────────────────────────────┘
```
Problems: Messy, hard to update, lots of duplication

**Good Design (Separate tables):**
```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│ customers    │     │ bookings     │     │ vehicles     │
├──────────────┤     ├──────────────┤     ├──────────────┤
│ id           │←───┤│ customer_id  │     │ id           │
│ name         │     │ vehicle_id   │├───→│ make         │
│ email        │     │ start_date   │     │ model        │
│ phone        │     │ end_date     │     │ plate_number │
└──────────────┘     └──────────────┘     └──────────────┘
```
Benefits: Clean, easy to update, no duplication

---

### 3. **Flexibility Over Hardcoding**

**Principle:** Configuration should be in the database, not in code.

**Bad Approach (Hardcoded):**
```typescript
// In code - requires deployment to change
const gpsPrice = 25; // AED per day
const knowledgeFee = 20; // AED per fine
const vatRate = 5; // %
```

**Good Approach (Database-driven):**
```sql
-- In database - change instantly without deploying
SELECT amount FROM charge_types WHERE charge_code = 'ADDON_GPS'; -- 25.00
SELECT amount FROM charge_types WHERE charge_code = 'KNOWLEDGE_FEE'; -- 20.00
SELECT amount FROM charge_types WHERE charge_code = 'VAT_RATE'; -- 5.00
```

**Benefits:**
- Admin can change prices instantly
- No developer needed for price updates
- Automatic price history tracking
- Can schedule future price changes

---

### 4. **Audit Everything**

**Every important action is tracked.**

**What we track:**
- Who created the booking
- When it was created
- Who modified it
- What changed (old value → new value)
- When prices changed
- Who changed them

**Example:**
```sql
-- Activity log tracks every change
INSERT INTO activity_log (user_id, entity_type, entity_id, action, old_values, new_values)
VALUES (
  'user-123',
  'BOOKING',
  'booking-456',
  'UPDATED',
  '{"status": "PENDING"}',
  '{"status": "CONFIRMED"}'
);
```

**Why this matters:**
- Compliance and legal requirements
- Dispute resolution
- Fraud prevention
- Performance analysis

---

### 5. **Plan for Growth**

**Design today for tomorrow's needs.**

**Scalability built-in:**
- UUID instead of integers (supports distributed systems)
- JSONB for flexible data (add new fields without schema changes)
- Partitioning-ready (can split large tables by date)
- Index optimization (fast queries even with millions of records)

**Future-proof examples:**
```sql
-- notification_preferences as JSONB - easy to add new channels
notification_preferences: {
  "email": true,
  "sms": false,
  "whatsapp": true,  -- Added later without schema change
  "push": true       -- Added later without schema change
}

-- target_customer_segments as JSONB - easy to add new segments
target_customer_segments: ["CORPORATE", "VIP", "STUDENT"] -- Can add more
```

---

## Database Structure

### Overview: 27 Tables in 6 Logical Groups

```
┌─────────────────────────────────────────────┐
│         VESLA RENT A CAR DATABASE           │
│                (27 Tables)                  │
└─────────────────────────────────────────────┘
           │
           ├── 1. CORE BUSINESS (13 tables)
           │   └── Who, What, When (customers, vehicles, bookings)
           │
           ├── 2. ACCOUNTING (4 tables)
           │   └── Money tracking (double-entry bookkeeping)
           │
           ├── 3. PRICING (2 tables)
           │   └── What things cost (dynamic pricing)
           │
           ├── 4. PROMOTIONS (3 tables)
           │   └── Discounts & campaigns (marketing)
           │
           ├── 5. CONFIGURATION (4 tables)
           │   └── System settings
           │
           └── 6. AUDIT (1 table)
               └── Change tracking
```

---

## Group 1: Core Business Tables (13 tables)

**Purpose:** Store the essential business entities and operations

### **Master Data (Who & What)**

#### 1. `companies` - Vesla Branches
**Stores:** Different Vesla locations (RAS AL KHOR, DIP, SZR)

**Why separate:** Each branch may have different:
- Contact numbers
- Operating hours
- Vehicle inventory
- Revenue tracking

**Key columns:**
- `branch_name` - "RAS AL KHOR"
- `address` - Physical location
- `license_number` - Trade license

---

#### 2. `customers` - Customer Information
**Stores:** All customer details (the HIRER from agreement)

**Philosophy:** Customer owns their data - one record per customer

**Key columns:**
- Personal: `first_name`, `last_name`, `nationality`
- Identity: `id_type`, `id_number`, `id_expiry_date`
- License: `license_number`, `license_expiry_date`
- Contact: `email`, `mobile_number`
- Security: `password_hash`, `role`

**Design decision:**
- Email is UNIQUE (one account per email)
- Passwords are hashed (never store plain text)
- Role-based access (CUSTOMER, ADMIN, STAFF)

---

#### 3. `additional_drivers` - Second Drivers
**Stores:** Extra drivers authorized on agreements

**Why separate from customers:**
- Not all additional drivers need login accounts
- One customer can add multiple drivers
- Different data requirements (no password needed)

**Linked to:** `customers` table via `customer_id`

---

#### 4. `vehicles` - Fleet Inventory
**Stores:** All rental vehicles

**Philosophy:** Vehicle is an asset - track everything about it

**Key columns:**
- Identification: `make`, `model`, `year`, `plate_number`, `vin`
- Classification: `vehicle_type` (SEDAN, SUV), `category` (ECONOMY, LUXURY)
- Pricing: `daily_rate`, `weekly_rate`, `monthly_rate`
- Insurance: `insurance_type`, `insurance_excess_amount`
- Maintenance: `current_km`, `service_due_km`, `last_service_date`
- Status: `AVAILABLE`, `RENTED`, `MAINTENANCE`, `OUT_OF_SERVICE`

**Design decision:**
- `plate_number` is UNIQUE (primary identifier in UAE)
- Pricing in vehicle allows overrides (special vehicles can have custom rates)
- Status tracking prevents double-booking

---

### **Transaction Data (When)**

#### 5. `bookings` - Reservation Requests
**Stores:** Initial reservation before agreement creation

**Philosophy:** Booking is the customer's intent to rent

**Workflow:**
```
Customer selects vehicle + dates
       ↓
Creates booking (status: PENDING)
       ↓
Payment confirmed
       ↓
Booking confirmed (status: CONFIRMED)
       ↓
Agreement created (status: AGREEMENT_CREATED)
```

**Key columns:**
- Links: `customer_id`, `vehicle_id`, `company_id`
- Dates: `start_date`, `end_date`, `rental_days`
- Business: `payment_method`, `rental_period_type` (DAILY/WEEKLY/MONTHLY)
- Legal: `terms_accepted`, `terms_accepted_at`
- Status: `PENDING` → `CONFIRMED` → `AGREEMENT_CREATED` → `CANCELLED`

---

#### 6. `booking_addons` - Selected Add-ons
**Stores:** GPS, child seat, insurance upgrades selected at booking

**Why separate:**
- Variable number of add-ons per booking
- Cleaner data structure
- Easy to add/remove add-ons

**Structure:**
```
Booking 123
  ├── GPS Navigation (25 AED/day × 7 days = 175 AED)
  ├── Child Seat (30 AED/day × 7 days = 210 AED)
  └── Additional Driver (50 AED/day × 7 days = 350 AED)

Total add-ons: 735 AED
```

---

#### 7. `rental_agreements` - Rental Contracts
**Stores:** Formal rental agreement (converted from booking)

**Philosophy:** Agreement is the legal contract - capture EVERYTHING

**Key sections:**

**A. Agreement Identification:**
- `agreement_number` - "RASMLY250800211-1" (unique ID)
- `booking_id` - Links to original booking

**B. Vehicle Handover (OUT DETAIL):**
- `handover_date`, `handover_km`, `handover_fuel_percentage`
- `handover_video_url` - Video proof of condition

**C. Vehicle Return (IN DETAIL):**
- `return_date`, `return_km`, `return_fuel_percentage`
- `return_video_url` - Video proof at return

**D. Financial Details (24 charge types):**
- `rent_amount`, `scdw_amount`, `fuel_charges`, `mileage_charges`
- `fines_amount`, `tolls_amount`, `delivery_charges`, etc.
- `subtotal`, `vat_amount`, `total_charges`
- `security_deposit`, `amount_received`, `balance_due`

**E. Agreement Status:**
- `DRAFT` - Being prepared
- `SIGNED` - Customer signed
- `ACTIVE` - Vehicle handed over, rental in progress
- `COMPLETED` - Vehicle returned, all settled
- `CANCELLED` - Agreement cancelled

**Design decision:**
- One agreement per booking (1:1 relationship)
- ALL charges itemized (transparency)
- Video evidence required (dispute prevention)
- Immutable once signed (cannot delete, only void)

---

#### 8. `agreement_drivers` - Agreement ↔ Drivers Link
**Stores:** Which additional drivers are authorized on which agreements

**Why separate:**
- Many-to-many relationship (one driver can be on multiple agreements)
- Clean data structure
- Easy to add/remove drivers

---

#### 9. `agreement_line_items` - Detailed Charge Breakdown
**Stores:** Every individual charge on the agreement

**Philosophy:** Complete transparency - itemize everything

**Example:**
```
Agreement RASMLY250800211-1
  ├── Rent (7 days × 100 AED) = 700 AED
  ├── GPS (7 days × 25 AED) = 175 AED
  ├── Delivery Fee = 50 AED
  ├── Fuel Charge = 150 AED
  └── Discount (Summer Sale) = -140 AED

Subtotal: 935 AED
VAT (5%): 46.75 AED
Total: 981.75 AED
```

**Design decision:**
- Links to `charge_types` table (ensures consistency)
- Item type classification (RENT, ADDON, FEE, CHARGE, DISCOUNT)
- Quantity support (for per-day charges)

---

#### 10. `vehicle_damages` - Damage Records
**Stores:** Damages found at vehicle return

**Philosophy:** Document everything for insurance/disputes

**Key columns:**
- `damage_type` - SCRATCH, DENT, CRACK, MECHANICAL, INTERIOR
- `damage_location` - FRONT_BUMPER, DOOR_LEFT, etc.
- `severity` - MINOR, MODERATE, MAJOR
- `repair_cost` - Estimated cost
- `photo_urls` - JSON array of damage photos
- `police_report_number`, `police_report_url`
- `at_fault` - Customer responsibility (true/false)

**Business logic:**
```
IF at_fault AND insurance_type = 'BASIC':
  charge = insurance_excess + repair_cost + daily_rent_until_fixed
ELIF at_fault AND insurance_type = 'CDW':
  charge = 0 (full coverage)
ELIF NOT at_fault:
  charge = daily_rent_until_fixed (only)
```

---

#### 11. `traffic_fines` - Violations & Fines
**Stores:** Traffic violations during rental period

**Philosophy:** Track and charge fines systematically

**Key columns:**
- `fine_number` - Official fine reference
- `fine_type` - SPEEDING, PARKING, RED_LIGHT, etc.
- `fine_amount` - Base fine from authorities
- `knowledge_fee` - 20 AED (Dubai Police/RTA)
- `service_fee` - 30 AED (Vesla processing)
- `black_points` - Traffic black points
- `black_points_charge` - 250 AED per point
- `total_amount` - All charges combined
- `status` - PENDING, NOTIFIED, PAID, OVERDUE

**Auto-calculation:**
```sql
total_amount = fine_amount + knowledge_fee + service_fee + (black_points × 250)
```

**Business rules:**
- Must be paid within 24 hours
- Black points charged at 250 AED each
- Vehicle confiscation: 2000 AED PRO fee + authority charges

---

#### 12. `invoices` - Monthly Billing
**Stores:** Generated invoices for active agreements

**Philosophy:** Monthly recurring billing for long-term rentals

**Workflow:**
```
Scheduled job runs on 1st of month
       ↓
Query all ACTIVE rental_agreements
       ↓
For each agreement:
  - Calculate monthly charge
  - Generate invoice
  - Create accounting entries
  - Email to customer
       ↓
Invoice due on 15th of month
```

**Key columns:**
- `invoice_number` - Unique invoice ID
- `agreement_id` - Links to rental agreement
- `billing_period_start`, `billing_period_end`
- `subtotal`, `vat_amount`, `total_amount`
- `amount_paid`, `balance_due`
- `due_date` - Payment deadline
- `status` - PENDING, SENT, PAID, OVERDUE, CANCELLED

---

#### 13. `invoice_line_items` - Invoice Details
**Stores:** Line-by-line breakdown of invoice

**Example:**
```
Invoice INV-2025-001
  ├── Vehicle Rental (30 days) = 1800 AED
  ├── GPS Navigation (30 days) = 750 AED
  ├── Insurance Upgrade (30 days) = 1500 AED
  └── VAT (5%) = 202.50 AED

Total: 4252.50 AED
```

---

## Group 2: Accounting Tables (4 tables)

**Purpose:** Double-entry bookkeeping for financial accuracy

**Philosophy:** Every transaction must balance (Debits = Credits)

### 14. `accounts` - Chart of Accounts
**Stores:** All accounting accounts

**Structure:**
```
Assets (1000-1999)
  ├── 1100 - Cash/Bank
  ├── 1200 - Accounts Receivable - Customers
  └── 1500 - Vehicles (Asset)

Liabilities (2000-2999)
  ├── 2100 - Accounts Payable
  ├── 2200 - Security Deposit Liability
  └── 2300 - VAT Payable

Revenue (4000-4999)
  ├── 4100 - Rental Revenue - Vehicles
  └── 4200 - Service Revenue - Add-ons

Expenses (5000-5999)
  ├── 5100 - Vehicle Maintenance
  └── 5200 - Insurance Expense
```

**Design decision:**
- Hierarchical structure (parent_account_id)
- Standard account codes (industry convention)
- Active/inactive flag (can deactivate without deleting)

---

### 15. `transactions` - Journal Entries (Header)
**Stores:** Transaction header information

**Philosophy:** Every financial event is a transaction

**Key columns:**
- `transaction_number` - Unique ID (JE-2025-001)
- `transaction_date` - When it happened
- `reference_type` - INVOICE, PAYMENT, DEPOSIT, REFUND
- `reference_id` - Links to source document
- `total_debit`, `total_credit` - Must be equal
- `status` - DRAFT, POSTED, REVERSED

**Constraint:**
```sql
CONSTRAINT balanced_transaction CHECK (total_debit = total_credit)
```
Database enforces accounting equation!

---

### 16. `transaction_lines` - Journal Entry Lines
**Stores:** Individual debit/credit entries

**Example:**
```
Transaction: JE-2025-001 (Rental Invoice)
Date: 2025-01-05

Line 1: DR  Accounts Receivable (1200)    735.00
Line 2:     CR  Rental Revenue (4100)             700.00
Line 3:     CR  VAT Payable (2300)                 35.00

Total Debits: 735.00 = Total Credits: 735.00 ✓
```

**Constraint:**
```sql
CHECK (
  (debit_amount > 0 AND credit_amount = 0) OR
  (debit_amount = 0 AND credit_amount > 0)
)
```
Each line is EITHER debit OR credit, never both!

---

### 17. `payments` - Payment Records
**Stores:** Customer payments

**Links to:**
- Invoice (what they're paying for)
- Customer (who paid)
- Transaction (accounting entry)

**Key columns:**
- `payment_number` - PAY-2025-001
- `payment_method` - CASH, CREDIT_CARD, BANK_TRANSFER
- `amount` - Payment amount
- `status` - PENDING, COMPLETED, FAILED, REFUNDED

---

## Group 3: Pricing Tables (2 tables)

**Purpose:** Dynamic pricing without code changes

### 18. `charge_types` - Pricing Master
**Stores:** 57 different charge types

**Philosophy:** All prices in database, not in code

**Categories:**
- RENTAL (12): Daily/weekly/monthly rates per category
- INSURANCE (6): Excess amounts, CDW rates
- ADDON (4): GPS, child seat, additional driver
- DELIVERY (3): Dubai free/paid, outside Dubai
- TAX (1): VAT rate
- FINE_FEE (5): Knowledge fee, service fee, black points
- SERVICE (13): Tolls, parking, keys, maintenance
- VIOLATION (3): Smoking, tinted windows, illegal use
- CLEANING (3): Exterior, interior, detailing
- FUEL (5): Fuel refill charges by level
- DAMAGE (2): No police report, self-repair penalties

**Key columns:**
- `charge_code` - Unique identifier (e.g., 'KNOWLEDGE_FEE')
- `charge_name` - Display name
- `amount` - Price
- `calculation_type` - FIXED, PER_DAY, PER_KM, PERCENTAGE, PER_UNIT
- `is_taxable` - Apply VAT or not
- `effective_from`, `effective_to` - Date ranges

**Benefits:**
- Change prices instantly (no deployment)
- Price history automatically tracked
- Future pricing scheduling
- Consistent pricing across system

---

### 19. `charge_history` - Price Change Audit
**Stores:** Every price change

**Example:**
```
Charge: BLACK_POINT_FEE
Old: 250.00 AED
New: 300.00 AED
Changed by: admin@vesla.com
Reason: "Regulatory update Q1 2025"
Effective: 2025-01-01
```

**Auto-populated by trigger** - no manual entry needed!

---

## Group 4: Promotions Tables (3 tables)

**Purpose:** Marketing campaigns and discounts

### 20. `campaigns` - Promotion Master
**Stores:** 10 sample campaigns + unlimited custom ones

**Philosophy:** Flexible, season-driven pricing

**Campaign Types:**
- DISCOUNT - Percentage or fixed amount off
- BONUS_DAYS - Rent 7, get 2 free
- FREE_ADDON - Complimentary GPS, etc.
- WAIVE_FEE - No delivery charges
- BUNDLED - Multiple benefits combined
- LOYALTY - Repeat customer rewards

**Targeting Options:**
- All vehicles or specific categories
- All customers or segments (CORPORATE, VIP, NEW_CUSTOMER)
- Date ranges
- Rental duration requirements
- Promo code required or auto-apply

**Sample Campaigns:**
- Summer Sale 2025: 20% off all vehicles
- Weekly Bonus: Rent 7 days, get 2 free
- Corporate VIP: 25% off + free GPS + free delivery
- Ramadan Special: 20% off + waived delivery
- Early Bird: Book 30 days ahead, save 10%

---

### 21. `campaign_usage` - Usage Tracking
**Stores:** Every time a campaign is used

**Purpose:**
- Enforce usage limits
- Track ROI
- Prevent abuse

**Example:**
```
Customer: ahmed@email.com
Campaign: SUMMER2025
Original: 700 AED
Discount: 140 AED (20%)
Final: 560 AED
Used on: 2025-06-15
```

---

### 22. `campaign_bundles` - Bundled Offers
**Stores:** Multi-component campaign configurations

**Example:**
```
Campaign: RAMADAN2025
  ├── Component 1: 20% discount on rental
  ├── Component 2: Free GPS add-on
  └── Component 3: Waived delivery fee
```

---

## Group 5: Configuration Tables (4 tables)

Covered above in other groups (part of business logic)

---

## Group 6: Audit Table (1 table)

### 23. `activity_log` - Complete Audit Trail
**Stores:** Every important action in the system

**What we track:**
- User who performed action
- What type of entity (BOOKING, AGREEMENT, INVOICE)
- Specific entity ID
- Action type (CREATED, UPDATED, DELETED, SIGNED, PAID)
- Old values (before change)
- New values (after change)
- IP address, user agent (security)
- Timestamp

**Example:**
```
User: admin@vesla.com
Entity: BOOKING (id: 12345)
Action: UPDATED
Old: {"status": "PENDING", "total": 700.00}
New: {"status": "CONFIRMED", "total": 560.00}
IP: 192.168.1.100
Time: 2025-06-15 14:30:00
```

**Why this matters:**
- Legal compliance
- Fraud detection
- Dispute resolution
- Security investigations
- Performance analysis

---

## Table Relationships

### Visual Relationship Map

```
┌──────────────┐
│  companies   │
└──────┬───────┘
       │ has many
       ↓
┌──────────────┐     ┌──────────────┐
│  vehicles    │     │  customers   │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │  used in      books│
       ↓                    ↓
       └─────→ ┌──────────────┐ ←─────┘
               │   bookings   │
               └──────┬───────┘
                      │ converts to
                      ↓
               ┌──────────────────┐
               │rental_agreements │
               └──────┬───────────┘
                      │ generates
                      ↓
               ┌──────────────┐
               │   invoices   │
               └──────┬───────┘
                      │ creates
                      ↓
               ┌──────────────┐
               │ transactions │
               └──────────────┘
```

### Relationship Types

**One-to-Many (1:N):**
- One customer → Many bookings
- One vehicle → Many bookings
- One agreement → Many line items
- One campaign → Many usages

**One-to-One (1:1):**
- One booking → One agreement
- One invoice → One transaction

**Many-to-Many (M:N):**
- Many customers ↔ Many additional drivers (via link table)
- Many agreements ↔ Many drivers (via agreement_drivers)

---

## Key Design Decisions

### 1. **UUID vs Integer IDs**

**We chose UUIDs:**
```sql
id UUID PRIMARY KEY DEFAULT uuid_generate_v4()
```

**Why:**
- Globally unique (can merge databases from different branches)
- Can generate on client-side (offline bookings)
- No ID guessing attacks
- Better for distributed systems

**Trade-off:**
- Slightly larger storage (16 bytes vs 4 bytes)
- Worth it for security and scalability

---

### 2. **JSONB for Flexible Data**

**Used for:**
- `notification_preferences` - Email, SMS, WhatsApp, Push
- `target_categories` - Campaign targeting
- `photo_urls` - Array of damage photos

**Why:**
- Easy to add new fields without schema changes
- Queryable (can filter by JSON fields)
- Perfect for frequently-changing structures

**Example:**
```sql
-- Add new notification channel without schema change
notification_preferences: {
  "email": true,
  "sms": false,
  "whatsapp": true,  -- Can add this later
  "push": true       -- And this
}
```

---

### 3. **Soft Delete vs Hard Delete**

**We use both strategically:**

**Soft delete (keep data, mark inactive):**
- Customers: `is_active = FALSE`
- Vehicles: `status = 'OUT_OF_SERVICE'`
- Campaigns: `is_active = FALSE`

**Hard delete (actually remove):**
- Booking add-ons (if booking cancelled)
- Line items (if agreement voided)

**Why:**
- Soft delete: Legal requirement, audit trail, recovery
- Hard delete: Clean up junk data, GDPR compliance

---

### 4. **Timestamps on Everything**

**Every table has:**
```sql
created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
```

**Auto-updated by trigger:**
```sql
CREATE TRIGGER update_customers_updated_at
BEFORE UPDATE ON customers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

**Why:**
- Track when records created
- Track when last modified
- Essential for auditing
- Useful for reporting

---

### 5. **Status Enums as Strings**

**Example:**
```sql
status VARCHAR(50) DEFAULT 'PENDING'
-- Values: 'PENDING', 'CONFIRMED', 'AGREEMENT_CREATED', 'CANCELLED'
```

**Why strings instead of integers:**
- Self-documenting (readable in database)
- No lookup table needed
- Easy to add new statuses
- Clear in logs and exports

**Trade-off:**
- Uses more storage
- Worth it for clarity

---

## Data Flow

### Complete Customer Journey

```
1. CUSTOMER REGISTRATION
   ↓
   Creates record in: customers
   ↓
2. BROWSE VEHICLES
   ↓
   Reads from: vehicles, charge_types, campaigns
   ↓
3. CREATE BOOKING
   ↓
   Inserts into: bookings, booking_addons
   Status: PENDING
   ↓
4. CONFIRM PAYMENT
   ↓
   Updates: bookings (status = CONFIRMED)
   Inserts into: payments
   ↓
5. CREATE AGREEMENT
   ↓
   Inserts into: rental_agreements
   Links: booking_id
   Status: DRAFT
   ↓
6. CUSTOMER SIGNS
   ↓
   Updates: rental_agreements (status = SIGNED, signature_url, signed_at)
   Inserts into: activity_log
   ↓
7. VEHICLE HANDOVER
   ↓
   Updates: rental_agreements (status = ACTIVE, handover details)
   Updates: vehicles (status = RENTED)
   Inserts into: agreement_line_items
   ↓
8. MONTHLY INVOICE (for long-term rentals)
   ↓
   Scheduled job generates:
     - invoices
     - invoice_line_items
     - transactions (accounting)
     - transaction_lines
   ↓
9. CUSTOMER PAYS INVOICE
   ↓
   Inserts into: payments
   Updates: invoices (status = PAID)
   Inserts into: transactions (payment received)
   ↓
10. VEHICLE RETURN
    ↓
    Updates: rental_agreements (return details)
    Inserts into: vehicle_damages (if any)
    Inserts into: traffic_fines (if any)
    Updates: vehicles (status = AVAILABLE)
    ↓
11. FINAL SETTLEMENT
    ↓
    Calculates: damages + fines + fuel charges
    Updates: rental_agreements (status = COMPLETED)
    Inserts into: transactions (final charges)
    ↓
12. SECURITY DEPOSIT REFUND
    ↓
    Calculates: deposit - charges
    Inserts into: payments (refund)
    Inserts into: transactions (liability reduction)
```

---

## Summary

### Design Principles
1. ✅ Single source of truth
2. ✅ Separation of concerns
3. ✅ Flexibility over hardcoding
4. ✅ Audit everything
5. ✅ Plan for growth

### Database Statistics
- **27 tables** organized in 6 logical groups
- **57 charge types** for dynamic pricing
- **10 sample campaigns** for promotions
- **7 helper functions** for common operations
- **2 views** for reporting
- **Complete audit trail** for all changes

### Key Benefits
- 💰 **Dynamic pricing** - Change rates without deploying code
- 🎯 **Flexible campaigns** - Seasonal promotions easily configured
- 📊 **Complete audit** - Track every change for compliance
- 🔒 **Data integrity** - Constraints ensure accuracy
- 📈 **Scalable** - Designed for millions of records
- 🛡️ **Secure** - UUIDs, soft deletes, role-based access

---

*Database Design Documentation v1.0*
*Last Updated: 2025-12-05*
*Vesla Rent A Car - Built for Growth*
