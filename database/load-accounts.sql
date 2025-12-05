-- Load Chart of Accounts (40 accounts) and Transaction Types (10 types)

-- ROOT GROUPS (5)
INSERT INTO accounts (account_code, account_name, account_class, account_type, level, normal_balance) VALUES
('1000', 'ASSETS', 'GROUP', 'ASSET', 0, 'DEBIT'),
('2000', 'LIABILITIES', 'GROUP', 'LIABILITY', 0, 'CREDIT'),
('3000', 'EQUITY', 'GROUP', 'EQUITY', 0, 'CREDIT'),
('4000', 'REVENUE', 'GROUP', 'REVENUE', 0, 'CREDIT'),
('5000', 'EXPENSES', 'GROUP', 'EXPENSE', 0, 'DEBIT')
ON CONFLICT (account_code) DO NOTHING;

-- ASSET SUB-GROUPS (2)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '1100', 'Current Assets', 'GROUP', 'ASSET', id, 1, 'DEBIT' FROM accounts WHERE account_code = '1000'
UNION ALL SELECT '1200', 'Fixed Assets', 'GROUP', 'ASSET', id, 1, 'DEBIT' FROM accounts WHERE account_code = '1000'
ON CONFLICT (account_code) DO NOTHING;

-- LIABILITY SUB-GROUPS (2)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '2100', 'Current Liabilities', 'GROUP', 'LIABILITY', id, 1, 'CREDIT' FROM accounts WHERE account_code = '2000'
UNION ALL SELECT '2200', 'Long-term Liabilities', 'GROUP', 'LIABILITY', id, 1, 'CREDIT' FROM accounts WHERE account_code = '2000'
ON CONFLICT (account_code) DO NOTHING;

-- REVENUE SUB-GROUPS (2)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '4100', 'Operating Revenue', 'GROUP', 'REVENUE', id, 1, 'CREDIT' FROM accounts WHERE account_code = '4000'
UNION ALL SELECT '4200', 'Other Revenue', 'GROUP', 'REVENUE', id, 1, 'CREDIT' FROM accounts WHERE account_code = '4000'
ON CONFLICT (account_code) DO NOTHING;

-- EXPENSE SUB-GROUPS (2)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '5100', 'Operating Expenses', 'GROUP', 'EXPENSE', id, 1, 'DEBIT' FROM accounts WHERE account_code = '5000'
UNION ALL SELECT '5200', 'Administrative Expenses', 'GROUP', 'EXPENSE', id, 1, 'DEBIT' FROM accounts WHERE account_code = '5000'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - CURRENT ASSETS (4)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '1101', 'Cash on Hand', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1100'
UNION ALL SELECT '1102', 'Bank - Current Account', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1100'
UNION ALL SELECT '1103', 'Accounts Receivable - Customers', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1100'
UNION ALL SELECT '1104', 'Prepaid Expenses', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1100'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - FIXED ASSETS (3)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '1201', 'Vehicles - Fleet', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1200'
UNION ALL SELECT '1202', 'Accumulated Depreciation - Vehicles', 'INDIVIDUAL', 'ASSET', id, 2, 'CREDIT' FROM accounts WHERE account_code = '1200'
UNION ALL SELECT '1203', 'Office Equipment', 'INDIVIDUAL', 'ASSET', id, 2, 'DEBIT' FROM accounts WHERE account_code = '1200'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - CURRENT LIABILITIES (4)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '2101', 'Accounts Payable - Suppliers', 'INDIVIDUAL', 'LIABILITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '2100'
UNION ALL SELECT '2102', 'Security Deposit Liability', 'INDIVIDUAL', 'LIABILITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '2100'
UNION ALL SELECT '2103', 'VAT Payable', 'INDIVIDUAL', 'LIABILITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '2100'
UNION ALL SELECT '2104', 'Salaries Payable', 'INDIVIDUAL', 'LIABILITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '2100'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - EQUITY (3)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '3001', 'Owner''s Capital', 'INDIVIDUAL', 'EQUITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '3000'
UNION ALL SELECT '3002', 'Retained Earnings', 'INDIVIDUAL', 'EQUITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '3000'
UNION ALL SELECT '3003', 'Current Year Profit/Loss', 'INDIVIDUAL', 'EQUITY', id, 2, 'CREDIT' FROM accounts WHERE account_code = '3000'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - REVENUE (4)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '4101', 'Rental Revenue - Vehicles', 'INDIVIDUAL', 'REVENUE', id, 2, 'CREDIT' FROM accounts WHERE account_code = '4100'
UNION ALL SELECT '4102', 'Service Revenue - Add-ons', 'INDIVIDUAL', 'REVENUE', id, 2, 'CREDIT' FROM accounts WHERE account_code = '4100'
UNION ALL SELECT '4103', 'Late Fees Revenue', 'INDIVIDUAL', 'REVENUE', id, 2, 'CREDIT' FROM accounts WHERE account_code = '4100'
UNION ALL SELECT '4104', 'Damage Recovery Revenue', 'INDIVIDUAL', 'REVENUE', id, 2, 'CREDIT' FROM accounts WHERE account_code = '4100'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - OPERATING EXPENSES (4)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '5101', 'Vehicle Maintenance Expense', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5100'
UNION ALL SELECT '5102', 'Fuel Expense', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5100'
UNION ALL SELECT '5103', 'Insurance Expense', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5100'
UNION ALL SELECT '5104', 'Depreciation Expense - Vehicles', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5100'
ON CONFLICT (account_code) DO NOTHING;

-- INDIVIDUAL ACCOUNTS - ADMIN EXPENSES (4)
INSERT INTO accounts (account_code, account_name, account_class, account_type, parent_account_id, level, normal_balance)
SELECT '5201', 'Salaries and Wages', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5200'
UNION ALL SELECT '5202', 'Rent Expense', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5200'
UNION ALL SELECT '5203', 'Utilities Expense', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5200'
UNION ALL SELECT '5204', 'Office Supplies', 'INDIVIDUAL', 'EXPENSE', id, 2, 'DEBIT' FROM accounts WHERE account_code = '5200'
ON CONFLICT (account_code) DO NOTHING;

-- TRANSACTION TYPES (10)
INSERT INTO transaction_types (type_code, type_name, type_category, number_prefix) VALUES
('INVOICE', 'Sales Invoice', 'SALES', 'INV-'),
('BILL', 'Purchase Bill', 'PURCHASES', 'BILL-'),
('RECEIPT', 'Cash/Bank Receipt', 'RECEIPTS', 'RCPT-'),
('PAYMENT', 'Cash/Bank Payment', 'PAYMENTS', 'PAY-'),
('JOURNAL', 'Journal Voucher', 'JOURNAL', 'JV-'),
('DEBIT_NOTE', 'Debit Note', 'PURCHASES', 'DN-'),
('CREDIT_NOTE', 'Credit Note', 'SALES', 'CN-'),
('CONTRA', 'Contra Entry', 'JOURNAL', 'CONTRA-'),
('DEPOSIT', 'Security Deposit', 'RECEIPTS', 'DEP-'),
('REFUND', 'Deposit Refund', 'PAYMENTS', 'REF-')
ON CONFLICT (type_code) DO NOTHING;
