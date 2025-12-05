# Quick Reference - Vesla Rent-a-Car Database

## 🚀 One-Command Setup

```bash
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile\database
psql "postgres://your-neon-connection" -f run_all_migrations.sql
```

---

## 📊 Database Stats

| Item | Count |
|------|-------|
| Tables | 27 |
| Functions | 9 |
| Views | 4 |
| Charge Types | 57 |
| Campaigns | 10 |
| Accounts | 40 |
| Transaction Types | 10 |

---

## 🗂️ Table Groups

### Core Business (8 tables)
- `companies` - Branches
- `customers` - Customer info
- `additional_drivers` - Extra drivers
- `vehicles` - Fleet inventory
- `bookings` - Reservations
- `booking_addons` - GPS, insurance, etc.
- `rental_agreements` - Active contracts
- `agreement_line_items` - Charge breakdown

### Invoicing (2 tables)
- `invoices` - Monthly bills
- `invoice_line_items` - Bill breakdown

### Damages & Fines (3 tables)
- `vehicle_damages` - Damage records
- `traffic_fines` - Fine tracking
- `agreement_drivers` - Driver links

### Pricing (2 tables)
- `charge_types` - Master pricing (57 types)
- `charge_history` - Price changes

### Campaigns (3 tables)
- `campaigns` - Promotions (10 samples)
- `campaign_usage` - Usage tracking
- `campaign_bundles` - Multi-offers

### Accounting (3 tables)
- `accounts` - Chart of accounts (40 accounts)
- `transaction_types` - Document types (10 types)
- `ledger` - All transactions

### Audit (1 table)
- `activity_log` - Audit trail

---

## 🔧 Helper Functions

### Pricing
```sql
-- Get current price
SELECT get_charge_amount('KNOWLEDGE_FEE');
-- Returns: 20.00

-- Get historical price
SELECT get_charge_amount_on_date('RENT_DAILY_ECONOMY', '2024-01-01');
```

### Campaigns
```sql
-- Find applicable campaigns
SELECT * FROM get_applicable_campaigns(
  customer_id,
  vehicle_id,
  start_date,
  rental_days,
  promo_code
);

-- Calculate discount
SELECT calculate_campaign_discount(campaign_id, booking_id);
```

### Accounting
```sql
-- Get account balance
SELECT get_account_balance('1103'::UUID, CURRENT_DATE);

-- Get next document number
SELECT get_next_transaction_number('INVOICE');
-- Returns: INV-000001
```

---

## 📋 Important Account Codes

### Assets
- `1101` - Cash on Hand
- `1102` - Bank - Current Account
- `1103` - Accounts Receivable - Customers
- `1201` - Vehicles - Fleet

### Liabilities
- `2101` - Accounts Payable - Suppliers
- `2102` - Security Deposit Liability
- `2103` - VAT Payable

### Revenue
- `4101` - Rental Revenue - Vehicles
- `4102` - Service Revenue - Add-ons
- `4104` - Damage Recovery Revenue

### Expenses
- `5101` - Vehicle Maintenance Expense
- `5102` - Fuel Expense
- `5103` - Insurance Expense
- `5201` - Salaries and Wages

---

## 📈 Reporting Views

### Trial Balance
```sql
SELECT * FROM trial_balance
ORDER BY account_code;
```

### Account Ledger
```sql
SELECT * FROM account_ledger_detail
WHERE account_code = '1103'
  AND transaction_date >= '2024-01-01'
ORDER BY transaction_date;
```

### Active Campaigns
```sql
SELECT * FROM active_campaigns_summary;
```

### Campaign Performance
```sql
SELECT * FROM campaign_performance
ORDER BY total_usage DESC;
```

---

## 🧪 Test Commands

### Verify Setup
```sql
-- Table count
SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';
-- Expected: 27

-- Check balance
SELECT
  SUM(debit_amount) as debits,
  SUM(credit_amount) as credits,
  SUM(debit_amount) - SUM(credit_amount) as diff
FROM ledger;
-- Expected: diff = 0
```

### Run Complete Test
```bash
psql "postgres://your-neon-connection" -f test_complete_workflow.sql
```

---

## 🔐 Transaction Types

| Code | Name | Prefix | Category |
|------|------|--------|----------|
| INVOICE | Sales Invoice | INV- | SALES |
| BILL | Purchase Bill | BILL- | PURCHASES |
| RECEIPT | Cash/Bank Receipt | RCPT- | RECEIPTS |
| PAYMENT | Cash/Bank Payment | PAY- | PAYMENTS |
| JOURNAL | Journal Voucher | JV- | JOURNAL |
| DEBIT_NOTE | Debit Note | DN- | PURCHASES |
| CREDIT_NOTE | Credit Note | CN- | SALES |
| CONTRA | Contra Entry | CONTRA- | JOURNAL |
| DEPOSIT | Security Deposit | DEP- | RECEIPTS |
| REFUND | Deposit Refund | REF- | PAYMENTS |

---

## 💰 Charge Categories

| Category | Count | Examples |
|----------|-------|----------|
| RENTAL | 12 | Daily/Weekly/Monthly rates per vehicle category |
| INSURANCE | 6 | Basic, CDW, Premium for different vehicle types |
| ADDON | 4 | GPS, Child Seat, Additional Driver, Insurance Upgrade |
| DELIVERY | 3 | Pick-up/Drop-off fees |
| TAX | 1 | VAT 5% |
| SERVICE | 13 | Processing, Knowledge Fee, etc. |
| FINE_FEE | 5 | Late fees, black points, etc. |
| VIOLATION | 3 | Speeding, parking, etc. |
| FUEL | 5 | Fuel charges |
| CLEANING | 3 | Cleaning charges |
| DAMAGE | 2 | Repair charges |

---

## 🎯 Sample Campaigns

| Code | Name | Type | Discount |
|------|------|------|----------|
| SUMMER2025 | Summer Sale 2025 | DISCOUNT | 15% |
| WEEKLY_BONUS | Weekly Rental Bonus | BONUS_DAYS | +1 free day |
| MONTHLY30 | Monthly Discount 30% | DISCOUNT | 30% |
| WEEKEND_ECONOMY | Weekend Special Economy | DISCOUNT | 20% |
| WELCOME_NEW | New Customer Welcome | DISCOUNT | 10% |
| CORPORATE_VIP | Corporate VIP Program | DISCOUNT | 25% |
| RAMADAN2025 | Ramadan Special 2025 | DISCOUNT | 20% |
| UAE_NATIONAL_DAY | UAE National Day Sale | DISCOUNT | 50% |
| LUXURY_UPGRADE | Luxury Upgrade 50% Off | DISCOUNT | 50% |
| EARLY_BIRD_30 | Early Bird 30-Day Advance | DISCOUNT | 15% |

---

## 🔄 Data Flow

```
BOOKING → AGREEMENT → INVOICE → PAYMENT
   ↓          ↓          ↓         ↓
CHARGES   HANDOVER   LEDGER    LEDGER
   ↓          ↓
CAMPAIGNS  RETURN
            ↓
         DAMAGES/FINES
```

---

## 📝 Common Queries

### Get Available Vehicles
```sql
SELECT make, model, plate_number, daily_rate, weekly_rate
FROM vehicles
WHERE status = 'AVAILABLE'
  AND is_active = TRUE
ORDER BY category, daily_rate;
```

### Active Agreements
```sql
SELECT
  ra.agreement_number,
  c.first_name || ' ' || c.last_name as customer,
  v.make || ' ' || v.model as vehicle,
  ra.start_date,
  ra.expected_return_date,
  ra.total_charges
FROM rental_agreements ra
JOIN customers c ON c.id = ra.customer_id
JOIN vehicles v ON v.id = ra.vehicle_id
WHERE ra.status = 'ACTIVE'
ORDER BY ra.start_date;
```

### Unpaid Invoices
```sql
SELECT
  i.invoice_number,
  c.first_name || ' ' || c.last_name as customer,
  i.due_date,
  i.balance_due,
  CASE
    WHEN i.due_date < CURRENT_DATE THEN 'OVERDUE'
    ELSE 'DUE'
  END as status
FROM invoices i
JOIN customers c ON c.id = i.customer_id
WHERE i.status IN ('PENDING', 'SENT', 'OVERDUE')
  AND i.balance_due > 0
ORDER BY i.due_date;
```

### Customer Outstanding Balance
```sql
SELECT
  c.first_name || ' ' || c.last_name as customer,
  get_account_balance(
    (SELECT id FROM accounts WHERE account_code = '1103'),
    CURRENT_DATE
  ) as total_receivable
FROM customers c;
```

---

## 🚨 Accounting Entry Templates

### 1. Invoice Entry
```sql
-- DR: A/R, CR: Revenue + VAT
INSERT INTO ledger (transaction_type_id, transaction_number, account_id, debit_amount, credit_amount, ...)
VALUES
  (invoice_type_id, 'INV-000001', ar_account_id, 813.75, 0, ...),
  (invoice_type_id, 'INV-000001', revenue_account_id, 0, 775.00, ...),
  (invoice_type_id, 'INV-000001', vat_account_id, 0, 38.75, ...);
```

### 2. Payment Entry
```sql
-- DR: Bank, CR: A/R
INSERT INTO ledger (transaction_type_id, transaction_number, account_id, debit_amount, credit_amount, ...)
VALUES
  (receipt_type_id, 'RCPT-000001', bank_account_id, 813.75, 0, ...),
  (receipt_type_id, 'RCPT-000001', ar_account_id, 0, 813.75, ...);
```

### 3. Security Deposit
```sql
-- DR: Bank, CR: Liability
INSERT INTO ledger (transaction_type_id, transaction_number, account_id, debit_amount, credit_amount, ...)
VALUES
  (deposit_type_id, 'DEP-000001', bank_account_id, 162.75, 0, ...),
  (deposit_type_id, 'DEP-000001', deposit_liability_id, 0, 162.75, ...);
```

---

## 📚 Documentation Files

| File | Purpose |
|------|---------|
| `DATABASE_SETUP_COMPLETE.md` | Complete overview and next steps |
| `QUICK_REFERENCE.md` | This file - quick lookups |
| `DATABASE.md` | Design philosophy and concepts |
| `ACCOUNTING_SYSTEM_GUIDE.md` | Accounting details with examples |
| `COMPLETE_SETUP_ORDER.md` | Migration guide |
| `CAMPAIGNS_GUIDE.md` | Campaign system usage |

---

## 🔗 Useful Links

- Neon Dashboard: https://console.neon.tech
- PostgreSQL Docs: https://www.postgresql.org/docs/
- Prisma Docs: https://www.prisma.io/docs

---

*Quick Reference Card - Keep this handy!*
*Last Updated: 2025-12-05*
