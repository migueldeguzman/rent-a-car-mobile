# Vesla Rent A Car - Database Schema Documentation

## Overview

This database schema captures the complete rental car workflow from initial booking to monthly invoicing and accounting entries. It is designed for deployment on **Neon PostgreSQL** cloud database.

**Workflow:**
```
Booking → Rental Agreement → Monthly Invoices → Accounting Entries
```

---

## Database Structure

### 1. Core Tables

#### `companies`
Vesla Group branches (e.g., RAS AL KHOR, DIP, SZR Main)

**Key Fields:**
- `branch_name` - Branch location from agreement header
- `license_number` - Trade license
- `address`, `city`, `country`

#### `customers`
Customer information (HIRER section from agreement)

**Key Fields:**
- Personal: `first_name`, `last_name`, `nationality`
- ID: `id_type`, `id_number`, `id_issued_at`, `id_expiry_date`
- License: `license_number`, `license_issued_at`, `license_issue_date`, `license_expiry_date`
- Contact: `mobile_number`, `landline_number`, `email`
- Auth: `password_hash`, `role` (CUSTOMER, ADMIN, STAFF)

**Extracted from Agreement:**
- Name: Boniswa Khumalo
- Nationality: South Africa
- Passport: 784199306975378
- License: 1299361
- Mobile: +971523965600

#### `additional_drivers`
Secondary drivers (SECOND DRIVER section)

**Linked to:** `customers` table via `customer_id`

**Same structure as customers but without authentication**

#### `vehicles`
Fleet inventory

**Key Fields:**
- Identification: `make`, `model`, `year`, `color`, `plate_number`
- Pricing: `daily_rate`, `weekly_rate`, `monthly_rate`
- Insurance: `insurance_type`, `insurance_excess_amount`
- Maintenance: `current_km`, `service_due_km`, `last_service_date`
- Status: `AVAILABLE`, `RENTED`, `MAINTENANCE`, `OUT_OF_SERVICE`

**Extracted from Agreement:**
- Type: NISSAN SUNNY
- Plate: 98309-G
- Model: 2019
- Color: White

---

### 2. Booking Tables

#### `bookings`
Initial reservation before agreement creation

**Key Fields:**
- `booking_id` - External reference
- `customer_id`, `vehicle_id`, `company_id`
- `start_date`, `end_date`, `rental_period_type`
- `payment_method` - CASH, CREDIT_CARD, DEBIT_CARD, BANK_TRANSFER
- `status` - PENDING → CONFIRMED → AGREEMENT_CREATED → CANCELLED

**Workflow:**
1. Customer creates booking via mobile app
2. Status: PENDING
3. Payment confirmed → Status: CONFIRMED
4. Agreement created → Status: AGREEMENT_CREATED

#### `booking_addons`
Additional services selected during booking

**Examples:**
- GPS Navigation - 25 AED/day
- Child Safety Seat - 30 AED/day
- Additional Driver - 50 AED/day
- Premium Insurance - 75 AED/day

---

### 3. Rental Agreement Tables

#### `rental_agreements`
Complete rental contract (converted from booking)

**Agreement Number Format:** `RASMLY250800211-1`
- `RASM` - Branch code (RAS AL KHOR)
- `LY` - Year suffix
- `250800211` - Sequential number
- `-1` - Version

**OUT DETAIL (Vehicle Handover):**
- `handover_date`, `handover_km`, `handover_fuel_percentage`
- `handover_video_url` - Video evidence of condition

**IN DETAIL (Vehicle Return):**
- `return_date`, `return_km`, `return_fuel_percentage`
- `return_video_url` - Video evidence at return

**Charges & Services (from agreement):**
All fields from the sample agreement are captured:
- `rent_amount` - 1100
- `scdw_amount` - 0 (Super Collision Damage Waiver)
- `fuel_charges`, `mileage_charges`, `fines_amount`
- `tolls_amount`, `delivery_charges`, `processing_fee`
- `additional_driver_fee`, `parking_charges`
- `discount_amount`

**Totals:**
- `subtotal` - Sum of all charges minus discount
- `vat_rate` - 5%
- `vat_amount` - Subtotal × 5%
- `total_charges` - Subtotal + VAT

**Deposits:**
- `security_deposit` - 20% of total (calculated)
- `deposit_paid` - Actual deposit received
- `amount_received` - 1155
- `balance_due` - 0

**Status Flow:**
```
DRAFT → SIGNED → ACTIVE → COMPLETED
```

#### `agreement_drivers`
Links additional drivers to agreement

**Junction table:** `agreement_id` ↔ `driver_id`

#### `agreement_line_items`
Detailed breakdown of all charges

**Item Types:**
- RENT - Vehicle rental
- ADDON - GPS, insurance, etc.
- FEE - Processing, delivery
- CHARGE - Fines, tolls, parking
- DISCOUNT - Promotional discounts

#### `vehicle_damages`
Damages recorded at return

**Key Fields:**
- `damage_type` - SCRATCH, DENT, CRACK, MECHANICAL, INTERIOR
- `damage_location` - FRONT_BUMPER, DOOR_LEFT, etc.
- `severity` - MINOR, MODERATE, MAJOR
- `repair_cost` - Estimated repair amount
- `photo_urls` - JSON array of damage photos
- `police_report_number`, `police_report_url`
- `at_fault` - Customer responsibility (true/false)

**Insurance Logic:**
- **Under 25 or license < 1 year:** Pay all damages + 1000 AED fee
- **Basic Insurance:** Pay excess (2000/3000/4000 depending on vehicle) + daily rent
- **Full Insurance (CDW):** No charges

#### `traffic_fines`
Traffic violations

**Key Fields:**
- `fine_number` - Official fine reference
- `fine_amount` - Base fine
- `knowledge_fee` - 20 AED (Dubai Police/RTA)
- `service_fee` - 30 AED (Vesla processing)
- `black_points` - Traffic black points
- `black_points_charge` - 250 AED per point
- `total_amount` - Fine + fees + black point charges

**Status:** PENDING → NOTIFIED → PAID → OVERDUE

**Business Rules:**
- Must be paid within 24 hours
- If unpaid, car can be forcefully collected
- Black points charged at 250 AED each
- Confiscation: 2000 AED PRO fee + authority charges

---

### 4. Invoicing Tables

#### `invoices`
Monthly recurring invoices for active agreements

**Generated by scheduled job on 1st of month**

**Key Fields:**
- `invoice_number` - Unique invoice ID
- `agreement_id` - Linked rental agreement
- `billing_period_start`, `billing_period_end`
- `due_date` - 15th of month
- `status` - PENDING → SENT → PAID → OVERDUE

**Invoice Flow:**
```
1. Job runs on 1st of month
2. Query all ACTIVE agreements
3. Calculate monthly charge (vehicle + add-ons)
4. Generate invoice
5. Email to customer
6. Create accounting entries (DR: A/R, CR: Revenue, VAT)
```

**First Month Special:**
- Include security deposit as separate line item
- Mark as "Deposit Held - Refundable"

**Last Month Special:**
- Process final invoice
- Deduct damages from deposit
- Generate deposit refund entry

#### `invoice_line_items`
Individual line items on invoice

**Line Types:**
- RENTAL - Monthly vehicle rental
- ADDON - GPS, insurance, etc.
- DEPOSIT - Security deposit collection
- REFUND - Deposit refund

---

### 5. Accounting Tables (ERP Integration)

#### `accounts`
Chart of accounts (double-entry bookkeeping)

**Initial Setup:**

**Assets:**
- 1100 - Cash/Bank
- 1200 - Accounts Receivable - Customers
- 1500 - Vehicles (Asset)

**Liabilities:**
- 2100 - Accounts Payable
- 2200 - Security Deposit Liability
- 2300 - VAT Payable

**Revenue:**
- 4100 - Rental Revenue - Vehicles
- 4200 - Service Revenue - Add-ons

**Expenses:**
- 5100 - Vehicle Maintenance
- 5200 - Insurance Expense

#### `transactions`
Journal entries (header)

**Key Fields:**
- `transaction_number` - Unique journal entry ID
- `transaction_date` - Posting date
- `reference_type` - INVOICE, PAYMENT, DEPOSIT, REFUND
- `reference_id` - Link to source document
- `total_debit`, `total_credit` - Must balance

**Constraint:** `total_debit = total_credit` (enforced by database)

#### `transaction_lines`
Individual debit/credit lines

**Constraint:** Each line must be EITHER debit OR credit (not both)

**Example - Monthly Invoice:**
```sql
Transaction: JE-2025-001
Date: 2025-01-01
Reference: Invoice INV-001

Line 1: DR Accounts Receivable (1200)    735.00
Line 2:    CR Rental Revenue (4100)              700.00
Line 3:    CR VAT Payable (2300)                  35.00
```

**Example - Security Deposit:**
```sql
Transaction: JE-2025-002
Date: 2025-01-01
Reference: Agreement AGR-001

Line 1: DR Cash/Bank (1100)              147.00
Line 2:    CR Security Deposit Liability (2200)  147.00
```

**Example - Payment Received:**
```sql
Transaction: JE-2025-003
Date: 2025-01-05
Reference: Payment PAY-001

Line 1: DR Cash/Bank (1100)              735.00
Line 2:    CR Accounts Receivable (1200)         735.00
```

#### `payments`
Customer payments

**Key Fields:**
- `payment_number` - Unique payment ID
- `invoice_id` - Which invoice was paid
- `payment_method` - CASH, CREDIT_CARD, etc.
- `transaction_id` - Link to journal entry
- `status` - PENDING, COMPLETED, FAILED, REFUNDED

---

### 6. Audit Tables

#### `activity_log`
Complete audit trail of all changes

**Tracked Events:**
- CREATED, UPDATED, DELETED
- SIGNED (agreement)
- PAID (invoice/payment)

**Stored Data:**
- `old_values` - JSON before change
- `new_values` - JSON after change
- `ip_address`, `user_agent` - Request metadata

---

## Key Relationships

```
customers (1) ──< (N) bookings
customers (1) ──< (N) additional_drivers
vehicles (1) ──< (N) bookings
companies (1) ──< (N) bookings

bookings (1) ──── (1) rental_agreements
rental_agreements (1) ──< (N) agreement_drivers ──> (N) additional_drivers
rental_agreements (1) ──< (N) agreement_line_items
rental_agreements (1) ──< (N) vehicle_damages
rental_agreements (1) ──< (N) traffic_fines
rental_agreements (1) ──< (N) invoices

invoices (1) ──< (N) invoice_line_items
invoices (1) ──< (N) payments

accounts (1) ──< (N) transaction_lines
transactions (1) ──< (N) transaction_lines
```

---

## Data Validation Rules

### Customer Requirements
- ✅ Age ≥ 25 OR license age ≥ 1 year
- ✅ Valid Emirates ID or Passport
- ✅ Valid UAE driving license
- ✅ License expiry > rental end date

### Booking Requirements
- ✅ Start date ≥ current date
- ✅ End date > start date
- ✅ Minimum rental period:
  - Daily: 1 day
  - Weekly: 7 days
  - Monthly: 30 days

### Agreement Requirements
- ✅ All customer documents valid
- ✅ Terms & conditions accepted
- ✅ Customer signature captured
- ✅ Video evidence of vehicle condition

### Financial Requirements
- ✅ VAT = 5% of subtotal
- ✅ Security deposit = 20% of total with VAT
- ✅ All payments recorded with journal entries
- ✅ Journal entries must balance (DR = CR)

---

## Database Triggers

### Auto-Update Timestamps
All main tables have triggers to update `updated_at` on every change:
- companies
- customers
- vehicles
- bookings
- rental_agreements
- invoices
- transactions

---

## Performance Indexes

**Customer Lookups:**
- `idx_customers_email` - Login lookup
- `idx_customers_mobile` - SMS notifications
- `idx_customers_id_number` - Document verification

**Vehicle Searches:**
- `idx_vehicles_plate_number` - Unique lookup
- `idx_vehicles_status` - Availability filtering
- `idx_vehicles_company` - Branch filtering

**Agreement Management:**
- `idx_agreements_number` - Unique lookup
- `idx_agreements_status` - Status filtering
- `idx_agreements_booking` - Booking reference

**Financial Queries:**
- `idx_invoices_due_date` - Overdue detection
- `idx_transactions_date` - Period reporting
- `idx_fines_status` - Unpaid fines

---

## Sample Data from Agreement

**Agreement:** RASMLY250800211-1

**Customer:**
- Name: Boniswa Khumalo
- Nationality: South Africa
- ID: 784199306975378 (Emirates ID)
- License: 1299361
- Mobile: +971523965600
- Email: boniswad@gmail.com

**Vehicle:**
- Make/Model: NISSAN SUNNY
- Year: 2019
- Color: White
- Plate: 98309-G

**Rental Period:**
- Start: 05-Dec-25 14:30
- Expected Return: 03-Jan-26 14:30
- Duration: 29 days

**Handover Details:**
- KM: 56923
- Fuel: 62.5% (5/8)

**Charges:**
- Rent: 1100 AED
- VAT (5%): 55 AED
- Total: 1155 AED
- Deposit: 0 AED
- Received: 1155 AED
- Balance: 0 AED

---

## Next Steps

1. **Create Neon Database**
   - Sign up at neon.tech
   - Create new project: "vesla-rent-a-car"
   - Note connection string

2. **Run Migration**
   ```bash
   psql postgres://[connection-string] < neon-schema.sql
   ```

3. **Update Backend .env**
   ```env
   DATABASE_URL=postgres://[neon-connection-string]
   ```

4. **Create Backend Services**
   - `agreement.service.ts` - Convert booking → agreement
   - `invoice.service.ts` - Generate monthly invoices
   - `accounting.service.ts` - Create journal entries

5. **Setup Scheduled Jobs**
   - Monthly invoice generator (1st of month)
   - Agreement status updater (daily)
   - Payment reminder (5 days before due)

6. **Test Data Flow**
   - Create booking
   - Convert to agreement
   - Generate invoice
   - Record payment
   - Verify accounting balance

---

*Database Schema Version: 1.0*
*Last Updated: 2025-12-05*
