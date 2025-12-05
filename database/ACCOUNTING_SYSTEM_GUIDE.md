# Accounting System - Complete Guide

## Overview

Professional double-entry bookkeeping system following standard ERP accounting principles with account groups, transaction types, and a comprehensive ledger.

---

## Revised Structure (3 Tables)

### **Old Structure (4 tables) ❌**
```
accounts → transactions → transaction_lines → payments
```

### **New Structure (3 tables) ✅**
```
accounts (with GROUP/INDIVIDUAL) → transaction_types → ledger
```

---

## Table 1: ACCOUNTS - Chart of Accounts

### **Two Account Classes**

#### **GROUP Accounts** - Section Headers
**Purpose:** Organize financial reports, group related accounts

**Examples:**
```
1000 - ASSETS (Level 0 - Root)
  ├── 1100 - Current Assets (Level 1 - Main Group)
  └── 1200 - Fixed Assets (Level 1 - Main Group)

2000 - LIABILITIES (Level 0 - Root)
  ├── 2100 - Current Liabilities (Level 1)
  └── 2200 - Long-term Liabilities (Level 1)

4000 - REVENUE (Level 0 - Root)
  ├── 4100 - Operating Revenue (Level 1)
  └── 4200 - Other Revenue (Level 1)
```

**Characteristics:**
- Cannot post transactions to GROUP accounts
- Used only for financial statement organization
- Hierarchical structure (parent → child)
- Appear as headers in reports

---

#### **INDIVIDUAL Accounts** - Actual Accounts
**Purpose:** Where actual transactions are posted

**Examples:**
```
Under Current Assets (1100):
  ├── 1101 - Cash on Hand
  ├── 1102 - Bank - Current Account
  ├── 1103 - Accounts Receivable - Customers
  └── 1104 - Prepaid Expenses

Under Fixed Assets (1200):
  ├── 1201 - Vehicles - Fleet
  ├── 1202 - Accumulated Depreciation - Vehicles
  └── 1203 - Office Equipment

Under Current Liabilities (2100):
  ├── 2101 - Accounts Payable - Suppliers
  ├── 2102 - Security Deposit Liability
  ├── 2103 - VAT Payable
  └── 2104 - Salaries Payable
```

**Characteristics:**
- All transactions posted here
- Must belong to a GROUP account
- Shown under their parent group in reports
- Have opening balances

---

### **Account Structure**

```sql
CREATE TABLE accounts (
    id UUID PRIMARY KEY,
    account_code VARCHAR(50) UNIQUE,     -- '1101', '4102'
    account_name VARCHAR(255),            -- 'Cash on Hand', 'Rental Revenue'

    -- Classification
    account_class VARCHAR(50),            -- 'GROUP' or 'INDIVIDUAL'
    account_type VARCHAR(50),             -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'

    -- Hierarchy
    parent_account_id UUID,               -- Links to parent GROUP
    level INTEGER,                        -- 0=root, 1=main, 2=individual

    -- Behavior
    normal_balance VARCHAR(10),           -- 'DEBIT' or 'CREDIT'
    is_bank_account BOOLEAN,              -- For bank reconciliation
    is_control_account BOOLEAN,           -- Summary account

    -- Status
    is_active BOOLEAN,
    opening_balance DECIMAL(15, 2)
);
```

---

### **Pre-loaded Chart of Accounts**

**Root Groups (5):**
- 1000 - ASSETS
- 2000 - LIABILITIES
- 3000 - EQUITY
- 4000 - REVENUE
- 5000 - EXPENSES

**Main Groups (10):**
- 1100 - Current Assets
- 1200 - Fixed Assets
- 2100 - Current Liabilities
- 2200 - Long-term Liabilities
- 4100 - Operating Revenue
- 4200 - Other Revenue
- 5100 - Operating Expenses
- 5200 - Administrative Expenses

**Individual Accounts (25):**

**Assets (7):**
- 1101 - Cash on Hand
- 1102 - Bank - Current Account
- 1103 - Accounts Receivable - Customers
- 1104 - Prepaid Expenses
- 1201 - Vehicles - Fleet
- 1202 - Accumulated Depreciation - Vehicles
- 1203 - Office Equipment

**Liabilities (4):**
- 2101 - Accounts Payable - Suppliers
- 2102 - Security Deposit Liability
- 2103 - VAT Payable
- 2104 - Salaries Payable

**Equity (3):**
- 3001 - Owner's Capital
- 3002 - Retained Earnings
- 3003 - Current Year Profit/Loss

**Revenue (4):**
- 4101 - Rental Revenue - Vehicles
- 4102 - Service Revenue - Add-ons
- 4103 - Late Fees Revenue
- 4104 - Damage Recovery Revenue

**Expenses (7):**
- 5101 - Vehicle Maintenance Expense
- 5102 - Fuel Expense
- 5103 - Insurance Expense
- 5104 - Depreciation Expense - Vehicles
- 5201 - Salaries and Wages
- 5202 - Rent Expense
- 5203 - Utilities Expense
- 5204 - Office Supplies

---

## Table 2: TRANSACTION_TYPES - Document Types

### **Purpose**
Define different types of business documents (Invoice, Bill, Receipt, etc.)

### **Structure**

```sql
CREATE TABLE transaction_types (
    id UUID PRIMARY KEY,
    type_code VARCHAR(50) UNIQUE,        -- 'INVOICE', 'BILL', 'RECEIPT'
    type_name VARCHAR(100),               -- 'Sales Invoice', 'Purchase Bill'
    type_category VARCHAR(50),            -- 'SALES', 'PURCHASES', 'RECEIPTS', 'PAYMENTS', 'JOURNAL'

    -- Configuration
    number_prefix VARCHAR(10),            -- 'INV-', 'BILL-', 'RCPT-'
    next_number INTEGER,                  -- Auto-incrementing number

    -- Metadata
    description TEXT,
    is_active BOOLEAN
);
```

### **Pre-loaded Transaction Types (10)**

| Type Code | Type Name | Category | Prefix | Description |
|-----------|-----------|----------|--------|-------------|
| INVOICE | Sales Invoice | SALES | INV- | Customer invoice for rental |
| BILL | Purchase Bill | PURCHASES | BILL- | Supplier bill for expenses |
| RECEIPT | Cash/Bank Receipt | RECEIPTS | RCPT- | Money received from customer |
| PAYMENT | Cash/Bank Payment | PAYMENTS | PAY- | Money paid to supplier |
| JOURNAL | Journal Voucher | JOURNAL | JV- | Manual journal entry |
| DEBIT_NOTE | Debit Note | PURCHASES | DN- | Debit note to supplier |
| CREDIT_NOTE | Credit Note | SALES | CN- | Credit note to customer |
| CONTRA | Contra Entry | JOURNAL | CONTRA- | Bank/cash transfer |
| DEPOSIT | Security Deposit | RECEIPTS | DEP- | Security deposit received |
| REFUND | Deposit Refund | PAYMENTS | REF- | Security deposit refunded |

### **Auto-Numbering**

```sql
-- Get next transaction number
SELECT get_next_transaction_number('INVOICE');
-- Returns: INV-000001

-- Next call returns: INV-000002
-- Next call returns: INV-000003
```

---

## Table 3: LEDGER - Complete Transaction Ledger

### **Purpose**
Single table containing ALL accounting transactions (replaces transaction_lines + payments)

### **Structure**

```sql
CREATE TABLE ledger (
    id UUID PRIMARY KEY,

    -- What type of document
    transaction_type_id UUID,             -- References transaction_types
    transaction_number VARCHAR(100),      -- 'INV-000001'
    transaction_date DATE,                -- When transaction occurred

    -- Which account
    account_id UUID,                      -- References accounts (INDIVIDUAL only)

    -- Debit or Credit
    debit_amount DECIMAL(15, 2),          -- 0 if credit
    credit_amount DECIMAL(15, 2),         -- 0 if debit

    -- Links to source document
    reference_type VARCHAR(50),           -- 'RENTAL_AGREEMENT', 'INVOICE', 'BOOKING'
    reference_id UUID,                    -- ID of source document
    reference_number VARCHAR(100),        -- Human-readable reference

    -- Party info (who is this transaction with)
    party_type VARCHAR(50),               -- 'CUSTOMER', 'SUPPLIER'
    party_id UUID,                        -- ID of customer/supplier
    party_name VARCHAR(255),              -- Name for reporting

    -- Description
    description TEXT,                     -- Short description
    narration TEXT,                       -- Detailed explanation

    -- Bank reconciliation
    is_reconciled BOOLEAN,
    reconciled_date DATE,

    -- Status
    status VARCHAR(50),                   -- 'POSTED', 'DRAFT', 'CANCELLED'

    -- Reversal support
    is_reversal BOOLEAN,
    reversed_ledger_id UUID,
    reversal_reason TEXT
);
```

---

## How It Works

### **Example 1: Customer Rental Invoice**

**Scenario:** Customer rents Nissan Sunny for 7 days = 700 AED + 35 AED VAT = 735 AED

**Accounting Entry:**

```
Transaction Type: INVOICE
Transaction Number: INV-000001
Date: 2025-06-15
Reference: Rental Agreement RASMLY250800211-1
Party: Customer (Boniswa Khumalo)
```

**Ledger Entries (2 rows):**

| Account | Account Name | Debit | Credit | Description |
|---------|--------------|-------|--------|-------------|
| 1103 | Accounts Receivable - Customers | 735.00 | 0.00 | Invoice INV-000001 |
| 4101 | Rental Revenue - Vehicles | 0.00 | 700.00 | 7 days rental |
| 2103 | VAT Payable | 0.00 | 35.00 | VAT 5% |

**SQL:**
```sql
-- Get transaction number
SELECT get_next_transaction_number('INVOICE'); -- Returns: INV-000001

-- Insert ledger entries
INSERT INTO ledger (transaction_type_id, transaction_number, transaction_date, account_id, debit_amount, credit_amount, reference_type, reference_id, reference_number, party_type, party_id, party_name, description, status)
VALUES
-- Debit: Accounts Receivable
(
  (SELECT id FROM transaction_types WHERE type_code = 'INVOICE'),
  'INV-000001',
  '2025-06-15',
  (SELECT id FROM accounts WHERE account_code = '1103'),
  735.00,
  0.00,
  'RENTAL_AGREEMENT',
  'agreement-uuid',
  'RASMLY250800211-1',
  'CUSTOMER',
  'customer-uuid',
  'Boniswa Khumalo',
  'Rental invoice for Nissan Sunny',
  'POSTED'
),
-- Credit: Rental Revenue
(
  (SELECT id FROM transaction_types WHERE type_code = 'INVOICE'),
  'INV-000001',
  '2025-06-15',
  (SELECT id FROM accounts WHERE account_code = '4101'),
  0.00,
  700.00,
  'RENTAL_AGREEMENT',
  'agreement-uuid',
  'RASMLY250800211-1',
  'CUSTOMER',
  'customer-uuid',
  'Boniswa Khumalo',
  'Rental revenue - 7 days @ 100 AED/day',
  'POSTED'
),
-- Credit: VAT Payable
(
  (SELECT id FROM transaction_types WHERE type_code = 'INVOICE'),
  'INV-000001',
  '2025-06-15',
  (SELECT id FROM accounts WHERE account_code = '2103'),
  0.00,
  35.00,
  'RENTAL_AGREEMENT',
  'agreement-uuid',
  'RASMLY250800211-1',
  'CUSTOMER',
  'customer-uuid',
  'Boniswa Khumalo',
  'VAT 5% on rental',
  'POSTED'
);
```

---

### **Example 2: Customer Payment Received**

**Scenario:** Customer pays 735 AED cash for invoice

**Accounting Entry:**

```
Transaction Type: RECEIPT
Transaction Number: RCPT-000001
Date: 2025-06-15
Reference: Invoice INV-000001
Party: Customer (Boniswa Khumalo)
```

**Ledger Entries (2 rows):**

| Account | Account Name | Debit | Credit | Description |
|---------|--------------|-------|--------|-------------|
| 1101 | Cash on Hand | 735.00 | 0.00 | Payment received |
| 1103 | Accounts Receivable - Customers | 0.00 | 735.00 | Payment for INV-000001 |

**Effect:**
- Cash increases (DEBIT)
- Accounts Receivable decreases (CREDIT)
- Customer's outstanding balance cleared

---

### **Example 3: Security Deposit Received**

**Scenario:** Customer pays 147 AED security deposit

**Accounting Entry:**

```
Transaction Type: DEPOSIT
Transaction Number: DEP-000001
Date: 2025-06-15
Reference: Agreement RASMLY250800211-1
Party: Customer (Boniswa Khumalo)
```

**Ledger Entries (2 rows):**

| Account | Account Name | Debit | Credit | Description |
|---------|--------------|-------|--------|-------------|
| 1102 | Bank - Current Account | 147.00 | 0.00 | Security deposit received |
| 2102 | Security Deposit Liability | 0.00 | 147.00 | Deposit held for customer |

**Effect:**
- Bank balance increases (DEBIT)
- Liability increases (CREDIT) - we owe this back

---

### **Example 4: Security Deposit Refund**

**Scenario:** Vehicle returned with no damages, refund 147 AED

**Accounting Entry:**

```
Transaction Type: REFUND
Transaction Number: REF-000001
Date: 2025-06-22
Reference: Agreement RASMLY250800211-1
Party: Customer (Boniswa Khumalo)
```

**Ledger Entries (2 rows):**

| Account | Account Name | Debit | Credit | Description |
|---------|--------------|-------|--------|-------------|
| 2102 | Security Deposit Liability | 147.00 | 0.00 | Refunding security deposit |
| 1102 | Bank - Current Account | 0.00 | 147.00 | Refund paid to customer |

**Effect:**
- Liability decreases (DEBIT) - no longer owe customer
- Bank balance decreases (CREDIT)

---

### **Example 5: Vehicle Maintenance Bill**

**Scenario:** Paid 500 AED for vehicle service

**Accounting Entry:**

```
Transaction Type: BILL
Transaction Number: BILL-000001
Date: 2025-06-16
Reference: Service Invoice from Al Futtaim Motors
Party: Supplier (Al Futtaim Motors)
```

**Ledger Entries (2 rows):**

| Account | Account Name | Debit | Credit | Description |
|---------|--------------|-------|--------|-------------|
| 5101 | Vehicle Maintenance Expense | 500.00 | 0.00 | Service for plate 98309-G |
| 1102 | Bank - Current Account | 0.00 | 500.00 | Payment to Al Futtaim |

**Effect:**
- Expense increases (DEBIT) - reduces profit
- Bank balance decreases (CREDIT)

---

## Financial Reports

### **Trial Balance**

Shows all accounts with their balances

```sql
SELECT * FROM trial_balance;
```

**Output:**
```
Account Code | Account Name                    | Debit    | Credit   | Balance
-------------|---------------------------------|----------|----------|----------
1101         | Cash on Hand                    | 735.00   | 0.00     | 735.00
1102         | Bank - Current Account          | 147.00   | 647.00   | -500.00
1103         | Accounts Receivable - Customers | 735.00   | 735.00   | 0.00
2102         | Security Deposit Liability      | 147.00   | 147.00   | 0.00
2103         | VAT Payable                     | 0.00     | 35.00    | 35.00
4101         | Rental Revenue - Vehicles       | 0.00     | 700.00   | 700.00
5101         | Vehicle Maintenance Expense     | 500.00   | 0.00     | 500.00
-------------|---------------------------------|----------|----------|----------
TOTALS                                          | 2264.00  | 2264.00  |
```

**Accounting Equation Check:** Debits = Credits ✓

---

### **Profit & Loss Statement**

Shows revenue and expenses

```sql
SELECT
  a.account_code,
  a.account_name,
  SUM(CASE WHEN a.normal_balance = 'CREDIT' THEN l.credit_amount - l.debit_amount
           ELSE l.debit_amount - l.credit_amount END) as amount
FROM accounts a
JOIN ledger l ON l.account_id = a.id
WHERE a.account_type IN ('REVENUE', 'EXPENSE')
  AND l.status = 'POSTED'
  AND l.transaction_date BETWEEN '2025-01-01' AND '2025-12-31'
GROUP BY a.account_code, a.account_name, a.account_type, a.normal_balance
ORDER BY a.account_type, a.account_code;
```

**Output:**
```
Revenue:
  4101 - Rental Revenue - Vehicles      700.00
  4102 - Service Revenue - Add-ons      175.00
  4103 - Late Fees Revenue               50.00
                                     ----------
  Total Revenue:                        925.00

Expenses:
  5101 - Vehicle Maintenance Expense    500.00
  5102 - Fuel Expense                   200.00
  5103 - Insurance Expense              150.00
  5201 - Salaries and Wages           2,000.00
  5202 - Rent Expense                 1,000.00
                                     ----------
  Total Expenses:                     3,850.00

Net Profit/(Loss):                   -2,925.00 (Loss)
```

---

### **Balance Sheet**

Shows assets, liabilities, and equity

```sql
SELECT
  a.account_type,
  a.account_code,
  a.account_name,
  get_account_balance(a.id) as balance
FROM accounts a
WHERE a.account_class = 'INDIVIDUAL'
  AND a.account_type IN ('ASSET', 'LIABILITY', 'EQUITY')
  AND a.is_active = TRUE
ORDER BY a.account_type, a.account_code;
```

---

## Helper Functions

### **1. Get Account Balance**

```sql
SELECT get_account_balance(
  (SELECT id FROM accounts WHERE account_code = '1102'), -- Bank account
  '2025-06-30' -- As of date
);
```

Returns current balance for account as of specific date.

---

### **2. Get Next Transaction Number**

```sql
SELECT get_next_transaction_number('INVOICE');
-- Returns: INV-000001

SELECT get_next_transaction_number('RECEIPT');
-- Returns: RCPT-000001
```

Auto-increments for each transaction type.

---

## Key Differences from Old System

### **Old System (4 tables) ❌**

**accounts:**
- Flat structure, no groups
- Basic account list

**transactions (header):**
- Generic transaction header
- No document type classification

**transaction_lines (details):**
- Debit/credit entries
- Limited metadata

**payments:**
- Separate table for payments
- Disconnected from ledger

**Problems:**
- No financial statement organization
- No document type management
- Payment tracking separate
- Complex queries for reports

---

### **New System (3 tables) ✅**

**accounts:**
- Hierarchical (GROUP + INDIVIDUAL)
- Financial report structure built-in
- Parent-child relationships

**transaction_types:**
- Pre-defined document types
- Auto-numbering per type
- Category classification

**ledger:**
- Single unified ledger
- All transactions in one place
- Complete transaction context
- Party information included
- Reconciliation support
- Reversal support

**Benefits:**
- Professional financial statements
- Standard accounting practices
- Easy report generation
- Single source of truth
- Better audit trail
- Compliance-ready

---

## Migration Path

**From old system:**

1. Drop old tables:
```sql
DROP TABLE transaction_lines;
DROP TABLE transactions;
DROP TABLE payments;
DROP TABLE accounts;
```

2. Run new schema:
```bash
psql "connection-string" -f accounting_tables_revised.sql
```

3. Pre-loaded data includes:
   - 5 root account groups
   - 10 main account groups
   - 25 individual accounts
   - 10 transaction types

**Ready to use immediately!**

---

*Accounting System Guide v1.0*
*Last Updated: 2025-12-05*
