-- =====================================================
-- REVISED ACCOUNTING TABLES
-- =====================================================
-- Proper double-entry bookkeeping with account groups
-- and comprehensive ledger system
-- =====================================================

-- =====================================================
-- 1. ACCOUNTS - Chart of Accounts
-- =====================================================

DROP TABLE IF EXISTS transaction_lines CASCADE;
DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;

CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,

    -- Account Classification
    account_class VARCHAR(50) NOT NULL, -- 'GROUP' or 'INDIVIDUAL'
    account_type VARCHAR(50) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'

    -- Hierarchy (for GROUP accounts)
    parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0, -- 0 = root, 1 = main group, 2 = sub-group, etc.

    -- Financial Statement Position
    report_section VARCHAR(100), -- 'CURRENT_ASSETS', 'FIXED_ASSETS', 'CURRENT_LIABILITIES', etc.
    display_order INTEGER, -- Order in financial reports

    -- Account Behavior
    normal_balance VARCHAR(10) DEFAULT 'DEBIT', -- 'DEBIT' or 'CREDIT'
    is_control_account BOOLEAN DEFAULT FALSE, -- Summary account (like "Accounts Receivable")
    is_bank_account BOOLEAN DEFAULT FALSE, -- Used for bank reconciliation
    is_system_account BOOLEAN DEFAULT FALSE, -- Created by system, cannot delete

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    opening_balance DECIMAL(15, 2) DEFAULT 0.00,
    opening_balance_date DATE,

    -- Metadata
    description TEXT,
    notes TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_account_class CHECK (account_class IN ('GROUP', 'INDIVIDUAL')),
    CONSTRAINT check_account_type CHECK (account_type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    CONSTRAINT check_normal_balance CHECK (normal_balance IN ('DEBIT', 'CREDIT')),
    CONSTRAINT check_group_no_parent CHECK (
        (account_class = 'GROUP' AND level = 0 AND parent_account_id IS NULL) OR
        (account_class = 'GROUP' AND level > 0) OR
        (account_class = 'INDIVIDUAL')
    )
);

-- Indexes
CREATE INDEX idx_accounts_code ON accounts(account_code);
CREATE INDEX idx_accounts_type ON accounts(account_type);
CREATE INDEX idx_accounts_class ON accounts(account_class);
CREATE INDEX idx_accounts_parent ON accounts(parent_account_id);
CREATE INDEX idx_accounts_active ON accounts(is_active);

-- Trigger
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 2. TRANSACTION_TYPES - Document Types
-- =====================================================

CREATE TABLE transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    type_category VARCHAR(50) NOT NULL, -- 'SALES', 'PURCHASES', 'RECEIPTS', 'PAYMENTS', 'JOURNAL'

    -- Configuration
    affects_inventory BOOLEAN DEFAULT FALSE,
    requires_approval BOOLEAN DEFAULT FALSE,
    auto_post BOOLEAN DEFAULT TRUE, -- Automatically post to ledger

    -- Numbering
    number_prefix VARCHAR(10), -- e.g., 'INV-', 'BILL-', 'RCPT-'
    next_number INTEGER DEFAULT 1,

    -- Metadata
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT check_type_category CHECK (
        type_category IN ('SALES', 'PURCHASES', 'RECEIPTS', 'PAYMENTS', 'JOURNAL', 'ADJUSTMENT')
    )
);

-- Indexes
CREATE INDEX idx_transaction_types_code ON transaction_types(type_code);
CREATE INDEX idx_transaction_types_category ON transaction_types(type_category);

-- Trigger
CREATE TRIGGER update_transaction_types_updated_at BEFORE UPDATE ON transaction_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert standard transaction types
INSERT INTO transaction_types (type_code, type_name, type_category, number_prefix, description) VALUES
('INVOICE', 'Sales Invoice', 'SALES', 'INV-', 'Customer invoice for rental services'),
('BILL', 'Purchase Bill', 'PURCHASES', 'BILL-', 'Supplier bill for expenses'),
('RECEIPT', 'Cash/Bank Receipt', 'RECEIPTS', 'RCPT-', 'Money received from customer'),
('PAYMENT', 'Cash/Bank Payment', 'PAYMENTS', 'PAY-', 'Money paid to supplier or expense'),
('JOURNAL', 'Journal Voucher', 'JOURNAL', 'JV-', 'Manual journal entry'),
('DEBIT_NOTE', 'Debit Note', 'PURCHASES', 'DN-', 'Debit note to supplier'),
('CREDIT_NOTE', 'Credit Note', 'SALES', 'CN-', 'Credit note to customer'),
('CONTRA', 'Contra Entry', 'JOURNAL', 'CONTRA-', 'Bank to bank or cash to cash transfer'),
('DEPOSIT', 'Security Deposit', 'RECEIPTS', 'DEP-', 'Security deposit received'),
('REFUND', 'Deposit Refund', 'PAYMENTS', 'REF-', 'Security deposit refunded');

-- =====================================================
-- 3. LEDGER - Complete Transaction Ledger
-- =====================================================

CREATE TABLE ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Transaction Identification
    transaction_type_id UUID NOT NULL REFERENCES transaction_types(id) ON DELETE RESTRICT,
    transaction_number VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,

    -- Accounting Details
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit_amount DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount DECIMAL(15, 2) DEFAULT 0.00,

    -- Reference (Links to source documents)
    reference_type VARCHAR(50), -- 'RENTAL_AGREEMENT', 'INVOICE', 'BOOKING', 'DAMAGE', 'FINE'
    reference_id UUID, -- ID of the source document
    reference_number VARCHAR(100), -- Human-readable reference (e.g., Agreement Number)

    -- Party Information
    party_type VARCHAR(50), -- 'CUSTOMER', 'SUPPLIER', 'EMPLOYEE', 'OTHER'
    party_id UUID, -- Foreign key to customers, suppliers, etc.
    party_name VARCHAR(255), -- Denormalized for reporting

    -- Description
    description TEXT,
    narration TEXT, -- Detailed explanation

    -- Reconciliation (for bank accounts)
    is_reconciled BOOLEAN DEFAULT FALSE,
    reconciled_date DATE,
    bank_statement_date DATE,

    -- Status
    status VARCHAR(50) DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'
    posted_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    posted_at TIMESTAMP,

    -- Reversal
    is_reversal BOOLEAN DEFAULT FALSE,
    reversed_ledger_id UUID REFERENCES ledger(id) ON DELETE SET NULL,
    reversal_date DATE,
    reversal_reason TEXT,

    -- Audit
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CONSTRAINT check_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0) OR
        (debit_amount = 0 AND credit_amount = 0 AND is_reversal = TRUE)
    ),
    CONSTRAINT check_status CHECK (status IN ('DRAFT', 'POSTED', 'CANCELLED', 'REVERSED'))
);

-- Indexes for performance
CREATE INDEX idx_ledger_transaction_type ON ledger(transaction_type_id);
CREATE INDEX idx_ledger_transaction_number ON ledger(transaction_number);
CREATE INDEX idx_ledger_transaction_date ON ledger(transaction_date);
CREATE INDEX idx_ledger_account ON ledger(account_id);
CREATE INDEX idx_ledger_reference ON ledger(reference_type, reference_id);
CREATE INDEX idx_ledger_party ON ledger(party_type, party_id);
CREATE INDEX idx_ledger_status ON ledger(status);
CREATE INDEX idx_ledger_reconciled ON ledger(is_reconciled) WHERE is_bank_account = TRUE;

-- Composite index for common queries
CREATE INDEX idx_ledger_account_date ON ledger(account_id, transaction_date);

-- Trigger
CREATE TRIGGER update_ledger_updated_at BEFORE UPDATE ON ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL CHART OF ACCOUNTS
-- =====================================================

-- ROOT GROUPS (Level 0)
INSERT INTO accounts (account_code, account_name, account_class, account_type, level, normal_balance, is_system_account, display_order) VALUES
('1000', 'ASSETS', 'GROUP', 'ASSET', 0, 'DEBIT', TRUE, 1),
('2000', 'LIABILITIES', 'GROUP', 'LIABILITY', 0, 'CREDIT', TRUE, 2),
('3000', 'EQUITY', 'GROUP', 'EQUITY', 0, 'CREDIT', TRUE, 3),
('4000', 'REVENUE', 'GROUP', 'REVENUE', 0, 'CREDIT', TRUE, 4),
('5000', 'EXPENSES', 'GROUP', 'EXPENSE', 0, 'DEBIT', TRUE, 5);

-- ASSET GROUPS (Level 1)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, report_section, normal_balance, is_system_account, display_order)
SELECT
    '1100', 'Current Assets', 'GROUP', 'ASSET',
    id, 1, 'CURRENT_ASSETS', 'DEBIT', TRUE, 11
FROM accounts WHERE account_code = '1000'
UNION ALL SELECT
    '1200', 'Fixed Assets', 'GROUP', 'ASSET',
    id, 1, 'FIXED_ASSETS', 'DEBIT', TRUE, 12
FROM accounts WHERE account_code = '1000';

-- LIABILITY GROUPS (Level 1)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, report_section, normal_balance, is_system_account, display_order)
SELECT
    '2100', 'Current Liabilities', 'GROUP', 'LIABILITY',
    id, 1, 'CURRENT_LIABILITIES', 'CREDIT', TRUE, 21
FROM accounts WHERE account_code = '2000'
UNION ALL SELECT
    '2200', 'Long-term Liabilities', 'GROUP', 'LIABILITY',
    id, 1, 'LONGTERM_LIABILITIES', 'CREDIT', TRUE, 22
FROM accounts WHERE account_code = '2000';

-- REVENUE GROUPS (Level 1)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, report_section, normal_balance, is_system_account, display_order)
SELECT
    '4100', 'Operating Revenue', 'GROUP', 'REVENUE',
    id, 1, 'OPERATING_REVENUE', 'CREDIT', TRUE, 41
FROM accounts WHERE account_code = '4000'
UNION ALL SELECT
    '4200', 'Other Revenue', 'GROUP', 'REVENUE',
    id, 1, 'OTHER_REVENUE', 'CREDIT', TRUE, 42
FROM accounts WHERE account_code = '4000';

-- EXPENSE GROUPS (Level 1)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, report_section, normal_balance, is_system_account, display_order)
SELECT
    '5100', 'Operating Expenses', 'GROUP', 'EXPENSE',
    id, 1, 'OPERATING_EXPENSES', 'DEBIT', TRUE, 51
FROM accounts WHERE account_code = '5000'
UNION ALL SELECT
    '5200', 'Administrative Expenses', 'GROUP', 'EXPENSE',
    id, 1, 'ADMIN_EXPENSES', 'DEBIT', TRUE, 52
FROM accounts WHERE account_code = '5000';

-- INDIVIDUAL ACCOUNTS - ASSETS
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_bank_account, is_system_account, description)
SELECT
    '1101', 'Cash on Hand', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', FALSE, TRUE, 'Petty cash and cash in office'
FROM accounts WHERE account_code = '1100'
UNION ALL SELECT
    '1102', 'Bank - Current Account', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', TRUE, TRUE, 'Main operating bank account'
FROM accounts WHERE account_code = '1100'
UNION ALL SELECT
    '1103', 'Accounts Receivable - Customers', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', FALSE, TRUE, 'Money owed by customers for rentals'
FROM accounts WHERE account_code = '1100'
UNION ALL SELECT
    '1104', 'Prepaid Expenses', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', FALSE, TRUE, 'Advance payments for insurance, rent, etc.'
FROM accounts WHERE account_code = '1100';

-- Vehicles (Fixed Asset)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_system_account, description)
SELECT
    '1201', 'Vehicles - Fleet', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', TRUE, 'Rental vehicle fleet inventory'
FROM accounts WHERE account_code = '1200'
UNION ALL SELECT
    '1202', 'Accumulated Depreciation - Vehicles', 'INDIVIDUAL', 'ASSET',
    id, 2, 'CREDIT', TRUE, 'Contra-asset: accumulated depreciation on vehicles'
FROM accounts WHERE account_code = '1200'
UNION ALL SELECT
    '1203', 'Office Equipment', 'INDIVIDUAL', 'ASSET',
    id, 2, 'DEBIT', TRUE, 'Computers, furniture, etc.'
FROM accounts WHERE account_code = '1200';

-- INDIVIDUAL ACCOUNTS - LIABILITIES
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_system_account, description)
SELECT
    '2101', 'Accounts Payable - Suppliers', 'INDIVIDUAL', 'LIABILITY',
    id, 2, 'CREDIT', TRUE, 'Money owed to suppliers'
FROM accounts WHERE account_code = '2100'
UNION ALL SELECT
    '2102', 'Security Deposit Liability', 'INDIVIDUAL', 'LIABILITY',
    id, 2, 'CREDIT', TRUE, 'Customer security deposits held'
FROM accounts WHERE account_code = '2100'
UNION ALL SELECT
    '2103', 'VAT Payable', 'INDIVIDUAL', 'LIABILITY',
    id, 2, 'CREDIT', TRUE, 'Value Added Tax collected (5%)'
FROM accounts WHERE account_code = '2100'
UNION ALL SELECT
    '2104', 'Salaries Payable', 'INDIVIDUAL', 'LIABILITY',
    id, 2, 'CREDIT', TRUE, 'Accrued salaries and wages'
FROM accounts WHERE account_code = '2100';

-- INDIVIDUAL ACCOUNTS - EQUITY
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_system_account, description)
SELECT
    '3001', 'Owner''s Capital', 'INDIVIDUAL', 'EQUITY',
    id, 2, 'CREDIT', TRUE, 'Initial capital investment'
FROM accounts WHERE account_code = '3000'
UNION ALL SELECT
    '3002', 'Retained Earnings', 'INDIVIDUAL', 'EQUITY',
    id, 2, 'CREDIT', TRUE, 'Cumulative profits retained in business'
FROM accounts WHERE account_code = '3000'
UNION ALL SELECT
    '3003', 'Current Year Profit/Loss', 'INDIVIDUAL', 'EQUITY',
    id, 2, 'CREDIT', TRUE, 'Profit or loss for current fiscal year'
FROM accounts WHERE account_code = '3000';

-- INDIVIDUAL ACCOUNTS - REVENUE
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_system_account, description)
SELECT
    '4101', 'Rental Revenue - Vehicles', 'INDIVIDUAL', 'REVENUE',
    id, 2, 'CREDIT', TRUE, 'Revenue from vehicle rentals'
FROM accounts WHERE account_code = '4100'
UNION ALL SELECT
    '4102', 'Service Revenue - Add-ons', 'INDIVIDUAL', 'REVENUE',
    id, 2, 'CREDIT', TRUE, 'Revenue from GPS, insurance, etc.'
FROM accounts WHERE account_code = '4100'
UNION ALL SELECT
    '4103', 'Late Fees Revenue', 'INDIVIDUAL', 'REVENUE',
    id, 2, 'CREDIT', TRUE, 'Revenue from late payment fees'
FROM accounts WHERE account_code = '4100'
UNION ALL SELECT
    '4104', 'Damage Recovery Revenue', 'INDIVIDUAL', 'REVENUE',
    id, 2, 'CREDIT', TRUE, 'Revenue from vehicle damage charges'
FROM accounts WHERE account_code = '4100';

-- INDIVIDUAL ACCOUNTS - EXPENSES
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance, is_system_account, description)
SELECT
    '5101', 'Vehicle Maintenance Expense', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Regular maintenance and repairs'
FROM accounts WHERE account_code = '5100'
UNION ALL SELECT
    '5102', 'Fuel Expense', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Fuel costs for vehicles'
FROM accounts WHERE account_code = '5100'
UNION ALL SELECT
    '5103', 'Insurance Expense', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Vehicle insurance premiums'
FROM accounts WHERE account_code = '5100'
UNION ALL SELECT
    '5104', 'Depreciation Expense - Vehicles', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Monthly depreciation of vehicle fleet'
FROM accounts WHERE account_code = '5100'
UNION ALL SELECT
    '5201', 'Salaries and Wages', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Staff salaries and wages'
FROM accounts WHERE account_code = '5200'
UNION ALL SELECT
    '5202', 'Rent Expense', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Office and facility rent'
FROM accounts WHERE account_code = '5200'
UNION ALL SELECT
    '5203', 'Utilities Expense', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Electricity, water, internet'
FROM accounts WHERE account_code = '5200'
UNION ALL SELECT
    '5204', 'Office Supplies', 'INDIVIDUAL', 'EXPENSE',
    id, 2, 'DEBIT', TRUE, 'Stationery and office consumables'
FROM accounts WHERE account_code = '5200';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get account balance
CREATE OR REPLACE FUNCTION get_account_balance(
    p_account_id UUID,
    p_as_of_date DATE DEFAULT CURRENT_DATE
)
RETURNS DECIMAL(15, 2) AS $$
DECLARE
    v_total_debit DECIMAL(15, 2);
    v_total_credit DECIMAL(15, 2);
    v_normal_balance VARCHAR(10);
    v_opening_balance DECIMAL(15, 2);
    v_balance DECIMAL(15, 2);
BEGIN
    -- Get account normal balance and opening balance
    SELECT normal_balance, COALESCE(opening_balance, 0)
    INTO v_normal_balance, v_opening_balance
    FROM accounts
    WHERE id = p_account_id;

    -- Get total debits and credits
    SELECT
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM ledger
    WHERE account_id = p_account_id
      AND transaction_date <= p_as_of_date
      AND status = 'POSTED';

    -- Calculate balance based on normal balance
    IF v_normal_balance = 'DEBIT' THEN
        v_balance := v_opening_balance + v_total_debit - v_total_credit;
    ELSE
        v_balance := v_opening_balance + v_total_credit - v_total_debit;
    END IF;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Function to get next transaction number
CREATE OR REPLACE FUNCTION get_next_transaction_number(p_type_code VARCHAR)
RETURNS VARCHAR AS $$
DECLARE
    v_prefix VARCHAR;
    v_next_num INTEGER;
    v_transaction_number VARCHAR;
BEGIN
    SELECT number_prefix, next_number
    INTO v_prefix, v_next_num
    FROM transaction_types
    WHERE type_code = p_type_code;

    v_transaction_number := v_prefix || LPAD(v_next_num::TEXT, 6, '0');

    -- Increment next number
    UPDATE transaction_types
    SET next_number = next_number + 1
    WHERE type_code = p_type_code;

    RETURN v_transaction_number;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Trial Balance
CREATE VIEW trial_balance AS
SELECT
    a.account_code,
    a.account_name,
    a.account_type,
    COALESCE(SUM(l.debit_amount), 0) as total_debit,
    COALESCE(SUM(l.credit_amount), 0) as total_credit,
    get_account_balance(a.id) as balance,
    a.normal_balance
FROM accounts a
LEFT JOIN ledger l ON l.account_id = a.id AND l.status = 'POSTED'
WHERE a.account_class = 'INDIVIDUAL'
  AND a.is_active = TRUE
GROUP BY a.id, a.account_code, a.account_name, a.account_type, a.normal_balance
ORDER BY a.account_code;

-- Account Ledger (detailed transactions)
CREATE VIEW account_ledger_detail AS
SELECT
    l.id,
    l.transaction_date,
    tt.type_name as transaction_type,
    l.transaction_number,
    a.account_code,
    a.account_name,
    l.debit_amount,
    l.credit_amount,
    l.description,
    l.party_name,
    l.reference_number,
    l.status
FROM ledger l
JOIN accounts a ON a.id = l.account_id
JOIN transaction_types tt ON tt.id = l.transaction_type_id
ORDER BY l.transaction_date DESC, l.transaction_number;

-- =====================================================
-- END OF REVISED ACCOUNTING TABLES
-- =====================================================
