# Complete Database Setup Order

## Overview

This guide provides the correct order to run all SQL migrations for the Vesla Rent A Car database on Neon PostgreSQL.

---

## Setup Order (Run in This Sequence)

### **Step 1: Core Schema**
Run first - creates all base tables

**File:** `neon-schema.sql`

**What it creates:**
- 24 core tables (companies, customers, vehicles, bookings, agreements, invoices, etc.)
- Chart of accounts (10 initial accounts)
- Transaction tables for double-entry bookkeeping
- Activity log and audit tables
- Performance indexes
- Auto-update timestamp triggers

**Command:**
```bash
psql "postgres://your-neon-connection" -f neon-schema.sql
```

---

### **Step 2: Charge Types System**
Run second - adds pricing master tables

**File:** `charge_types_table.sql`

**What it creates:**
- charge_types table (57 charge types)
  - Rental rates (12 types)
  - Insurance (6 types)
  - Add-ons (4 types)
  - Delivery (3 types)
  - Tax (1 type)
  - Fees, violations, cleaning, fuel (31 types)
- charge_history table (price change audit trail)
- Helper functions:
  - get_charge_amount(code)
  - get_charge_amount_on_date(code, date)
- Price change audit trigger

**Command:**
```bash
psql "postgres://your-neon-connection" -f charge_types_table.sql
```

---

### **Step 3: Campaigns System**
Run third - adds promotional/discount system

**File:** `campaigns_table.sql`

**What it creates:**
- campaigns table (10 sample campaigns)
  - Summer Sale, Weekly Bonus, Monthly Discount
  - Weekend Special, New Customer Welcome
  - Corporate VIP, Ramadan Special, UAE National Day
  - Luxury Upgrade, Early Bird
- campaign_usage table (usage tracking)
- campaign_bundles table (multi-component offers)
- Helper functions:
  - get_applicable_campaigns()
  - calculate_campaign_discount()
  - record_campaign_usage()
- Reporting views:
  - active_campaigns_summary
  - campaign_performance

**Command:**
```bash
psql "postgres://your-neon-connection" -f campaigns_table.sql
```

---

### **Step 4: Revised Accounting System**
Run fourth - replaces old accounting tables with proper ERP structure

**File:** `accounting_tables_revised.sql`

**What it creates:**
- accounts table with GROUP/INDIVIDUAL classification
  - Pre-loaded chart of accounts (5 root groups, 10 main groups, 25 individual accounts)
- transaction_types table (10 pre-loaded document types)
  - Invoice, Bill, Receipt, Payment, Journal Voucher, Debit Note, Credit Note, Contra, Deposit, Refund
- ledger table (unified transaction repository replacing transaction_lines + payments)
- Helper functions:
  - get_account_balance(account_id, as_of_date)
  - get_next_transaction_number(type_code)
- Reporting views:
  - trial_balance
  - account_ledger_detail

**Command:**
```bash
psql "postgres://your-neon-connection" -f accounting_tables_revised.sql
```

**Important:** This script DROPS and replaces the old accounting tables from neon-schema.sql:
- Old: accounts, transactions, transaction_lines, payments (3 tables)
- New: accounts, transaction_types, ledger (3 tables with better structure)

---

## Complete Setup Script

**Option A: Run All at Once**

Create a master migration file:

```bash
# File: run_all_migrations.sql
\i neon-schema.sql
\i charge_types_table.sql
\i campaigns_table.sql
\i accounting_tables_revised.sql
```

Then run:
```bash
psql "postgres://your-neon-connection" -f run_all_migrations.sql
```

**Option B: One-Line Command**

```bash
cat neon-schema.sql charge_types_table.sql campaigns_table.sql accounting_tables_revised.sql | psql "postgres://your-neon-connection"
```

---

## Verification Checklist

After running all migrations, verify setup:

### ✅ **Check Table Count**

```sql
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
```

**Expected:** 27 tables
- 21 from neon-schema.sql (core tables without old accounting)
- 2 from charge_types_table.sql (charge_types, charge_history)
- 3 from campaigns_table.sql (campaigns, campaign_usage, campaign_bundles)
- 3 from accounting_tables_revised.sql (accounts, transaction_types, ledger) replacing old tables

### ✅ **Check Charge Types**

```sql
SELECT COUNT(*) FROM charge_types;
```

**Expected:** 57 charge types

**Breakdown:**
```sql
SELECT charge_category, COUNT(*) as count
FROM charge_types
GROUP BY charge_category
ORDER BY charge_category;
```

**Expected Results:**
```
ADDON      | 4
CLEANING   | 3
DAMAGE     | 2
DELIVERY   | 3
FINE_FEE   | 5
FUEL       | 5
INSURANCE  | 6
RENTAL     | 12
SERVICE    | 13
TAX        | 1
VIOLATION  | 3
```

### ✅ **Check Campaigns**

```sql
SELECT COUNT(*) FROM campaigns;
```

**Expected:** 10 sample campaigns

```sql
SELECT campaign_code, campaign_name, campaign_type
FROM campaigns
ORDER BY campaign_code;
```

### ✅ **Check Functions**

```sql
SELECT routine_name
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_type = 'FUNCTION'
ORDER BY routine_name;
```

**Expected Functions:**
- calculate_campaign_discount
- get_account_balance
- get_applicable_campaigns
- get_charge_amount
- get_charge_amount_on_date
- get_next_transaction_number
- log_charge_price_change
- record_campaign_usage
- update_updated_at_column

### ✅ **Check Views**

```sql
SELECT table_name
FROM information_schema.views
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Views:**
- account_ledger_detail
- active_campaigns_summary
- campaign_performance
- trial_balance

### ✅ **Check Accounting System**

```sql
-- Check chart of accounts structure
SELECT COUNT(*) FROM accounts WHERE account_class = 'GROUP';
-- Expected: 15 (5 root + 10 main groups)

SELECT COUNT(*) FROM accounts WHERE account_class = 'INDIVIDUAL';
-- Expected: 25 individual accounts

-- Check transaction types
SELECT COUNT(*) FROM transaction_types;
-- Expected: 10

-- Verify account hierarchy
SELECT
  a.account_code,
  a.account_name,
  a.account_class,
  a.level,
  p.account_code as parent_code,
  p.account_name as parent_name
FROM accounts a
LEFT JOIN accounts p ON p.id = a.parent_account_id
WHERE a.account_class = 'GROUP'
ORDER BY a.account_code;
```

### ✅ **Test Helper Functions**

```sql
-- Test charge amount lookup
SELECT get_charge_amount('KNOWLEDGE_FEE');
-- Expected: 20.00

-- Test campaign lookup
SELECT * FROM get_applicable_campaigns(
  NULL, -- customer_id (NULL for test)
  NULL, -- vehicle_id (NULL for test)
  CURRENT_DATE,
  7, -- 7 day rental
  NULL -- no promo code
);
-- Should return auto-apply campaigns like WEEKLY_BONUS, SUMMER2025

-- Test accounting functions
SELECT get_next_transaction_number('INVOICE');
-- Expected: INV-000001

SELECT get_next_transaction_number('RECEIPT');
-- Expected: RCPT-000001
```

---

## Sample Data Insertion

After schema setup, insert test data:

### **1. Create Sample Company**

```sql
INSERT INTO companies (name, branch_name, address, city, phone, email)
VALUES (
  'Vesla Rent A Car LLC',
  'RAS AL KHOR',
  'Ras Al Khor Industrial Area',
  'Dubai',
  '+971-4-1234567',
  'info@veslamotors.com'
)
RETURNING id, name, branch_name;
```

### **2. Create Sample Vehicles**

```sql
-- Economy vehicle
INSERT INTO vehicles (
  company_id,
  make, model, year, color, plate_number,
  vehicle_type, category,
  insurance_type, insurance_excess_amount,
  daily_rate, weekly_rate, monthly_rate,
  current_km, status
)
SELECT
  id,
  'NISSAN', 'SUNNY', 2019, 'White', '98309-G',
  'SEDAN', 'ECONOMY',
  'BASIC', 2000.00,
  100.00, 600.00, 1800.00,
  56923, 'AVAILABLE'
FROM companies WHERE branch_name = 'RAS AL KHOR' LIMIT 1
RETURNING id, make, model, plate_number;

-- SUV vehicle
INSERT INTO vehicles (
  company_id,
  make, model, year, color, plate_number,
  vehicle_type, category,
  insurance_type, insurance_excess_amount,
  daily_rate, weekly_rate, monthly_rate,
  current_km, status
)
SELECT
  id,
  'TOYOTA', 'LAND CRUISER', 2023, 'Black', '12345-B',
  'SUV', 'SUV',
  'BASIC', 3000.00,
  200.00, 1200.00, 3600.00,
  15000, 'AVAILABLE'
FROM companies WHERE branch_name = 'RAS AL KHOR' LIMIT 1
RETURNING id, make, model, plate_number;
```

### **3. Create Test Customer**

```sql
INSERT INTO customers (
  first_name, last_name, nationality,
  id_type, id_number,
  id_issued_at, id_expiry_date,
  license_number,
  license_issued_at, license_issue_date, license_expiry_date,
  mobile_number, email, password_hash, role
)
VALUES (
  'Test', 'Customer', 'United Arab Emirates',
  'EMIRATES_ID', '784-1234-5678901-2',
  'United Arab Emirates', '2027-12-31',
  'TEST123456',
  'United Arab Emirates', '2024-01-01', '2027-01-01',
  '+971501234567', 'test@example.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', -- Placeholder hash
  'CUSTOMER'
)
RETURNING id, first_name, last_name, email;
```

---

## Database Statistics

After complete setup, check database size:

```sql
SELECT
  schemaname,
  COUNT(*) as table_count,
  pg_size_pretty(SUM(pg_total_relation_size(schemaname||'.'||tablename))::bigint) as total_size
FROM pg_tables
WHERE schemaname = 'public'
GROUP BY schemaname;
```

---

## Rollback Plan

If you need to completely reset:

```sql
-- WARNING: This deletes ALL data

-- Drop all views
DROP VIEW IF EXISTS account_ledger_detail CASCADE;
DROP VIEW IF EXISTS active_campaigns_summary CASCADE;
DROP VIEW IF EXISTS campaign_performance CASCADE;
DROP VIEW IF EXISTS trial_balance CASCADE;

-- Drop all functions
DROP FUNCTION IF EXISTS get_account_balance CASCADE;
DROP FUNCTION IF EXISTS get_applicable_campaigns CASCADE;
DROP FUNCTION IF EXISTS calculate_campaign_discount CASCADE;
DROP FUNCTION IF EXISTS record_campaign_usage CASCADE;
DROP FUNCTION IF EXISTS get_charge_amount CASCADE;
DROP FUNCTION IF EXISTS get_charge_amount_on_date CASCADE;
DROP FUNCTION IF EXISTS get_next_transaction_number CASCADE;
DROP FUNCTION IF EXISTS log_charge_price_change CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;

-- Drop all tables (in reverse dependency order)
DROP TABLE IF EXISTS campaign_bundles CASCADE;
DROP TABLE IF EXISTS campaign_usage CASCADE;
DROP TABLE IF EXISTS campaigns CASCADE;
DROP TABLE IF EXISTS charge_history CASCADE;
DROP TABLE IF EXISTS charge_types CASCADE;
DROP TABLE IF EXISTS activity_log CASCADE;
DROP TABLE IF EXISTS ledger CASCADE;
DROP TABLE IF EXISTS transaction_types CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS invoice_line_items CASCADE;
DROP TABLE IF EXISTS invoices CASCADE;
DROP TABLE IF EXISTS traffic_fines CASCADE;
DROP TABLE IF EXISTS vehicle_damages CASCADE;
DROP TABLE IF EXISTS agreement_line_items CASCADE;
DROP TABLE IF EXISTS agreement_drivers CASCADE;
DROP TABLE IF EXISTS rental_agreements CASCADE;
DROP TABLE IF EXISTS booking_addons CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS additional_drivers CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS companies CASCADE;

-- Then re-run migrations in order
```

---

## Troubleshooting

### **Issue: "relation already exists"**

Some tables were already created. Either:
1. Drop specific table: `DROP TABLE table_name CASCADE;`
2. Full reset (see Rollback Plan above)

### **Issue: "function does not exist"**

The `update_updated_at_column()` function wasn't created.

**Solution:** Ensure neon-schema.sql ran completely before other migrations.

### **Issue: Foreign key constraint violation**

Wrong migration order.

**Solution:** Always run in order:
1. neon-schema.sql (creates base tables)
2. charge_types_table.sql (references customers)
3. campaigns_table.sql (references customers, bookings, agreements)
4. accounting_tables_revised.sql (replaces old accounting tables)

### **Issue: Charge types not loading**

Check if INSERT statements ran:

```sql
SELECT COUNT(*) FROM charge_types;
```

If zero, re-run charge_types_table.sql.

---

## Next Steps After Setup

### **1. Configure Backend**

Update `.env` file:
```env
DATABASE_URL=postgres://your-neon-connection-string
```

### **2. Create Backend Services**

Files to create:
- `src/services/charge.service.ts` - Charge lookups
- `src/services/campaign.service.ts` - Campaign management
- `src/services/pricing.service.ts` - Price calculations
- `src/services/accounting.service.ts` - Journal entries and ledger operations

### **3. Test Database Connection**

```typescript
// test-connection.ts
import pool from './database';

async function test() {
  const result = await pool.query('SELECT COUNT(*) FROM charge_types');
  console.log('Charge types:', result.rows[0].count);

  const campaigns = await pool.query('SELECT COUNT(*) FROM campaigns');
  console.log('Campaigns:', campaigns.rows[0].count);
}

test();
```

### **4. Build Admin UI**

Create admin dashboard to:
- Manage charge types (update pricing)
- Create/edit campaigns
- View campaign performance
- Track usage statistics

---

## Quick Reference

**Total Tables:** 27
**Total Functions:** 9
**Total Views:** 4
**Total Charge Types:** 57
**Sample Campaigns:** 10
**Initial Accounts:** 40 (5 root groups + 10 main groups + 25 individual accounts)
**Transaction Types:** 10

**Setup Time:** ~2-3 minutes
**Estimated Database Size:** ~50 MB (with sample data)

---

*Complete Setup Guide Version: 1.0*
*Last Updated: 2025-12-05*
