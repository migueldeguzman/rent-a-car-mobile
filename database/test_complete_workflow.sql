-- =====================================================
-- COMPLETE WORKFLOW TEST
-- =====================================================
-- This script demonstrates the full rental workflow:
-- 1. Create sample company, vehicles, customer
-- 2. Create booking
-- 3. Convert to rental agreement
-- 4. Generate invoice
-- 5. Create accounting entries
-- =====================================================

\echo '====================================================='
\echo 'VESLA RENT A CAR - WORKFLOW TEST'
\echo '====================================================='

-- =====================================================
-- STEP 1: Create Sample Company
-- =====================================================

\echo ''
\echo 'Step 1: Creating sample company...'

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

-- =====================================================
-- STEP 2: Create Sample Vehicles
-- =====================================================

\echo ''
\echo 'Step 2: Creating sample vehicles...'

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
RETURNING id, make, model, plate_number, daily_rate, weekly_rate, monthly_rate;

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
RETURNING id, make, model, plate_number, daily_rate, weekly_rate, monthly_rate;

-- =====================================================
-- STEP 3: Create Test Customer
-- =====================================================

\echo ''
\echo 'Step 3: Creating test customer...'

INSERT INTO customers (
  first_name, last_name, nationality,
  id_type, id_number,
  id_issued_at, id_expiry_date,
  license_number,
  license_issued_at, license_issue_date, license_expiry_date,
  mobile_number, email, password_hash, role
)
VALUES (
  'Boniswa', 'Khumalo', 'South Africa',
  'PASSPORT', 'A12345678',
  'South Africa', '2027-12-31',
  'DL123456',
  'South Africa', '2024-01-01', '2027-01-01',
  '+971501234567', 'boniswa@example.com',
  '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890',
  'CUSTOMER'
)
RETURNING id, first_name, last_name, email, mobile_number;

-- =====================================================
-- STEP 4: Create Booking (7-day rental)
-- =====================================================

\echo ''
\echo 'Step 4: Creating booking (7-day rental)...'

WITH booking_data AS (
  INSERT INTO bookings (
    customer_id,
    vehicle_id,
    company_id,
    start_date,
    end_date,
    rental_period_type,
    rental_days,
    payment_method,
    notes,
    terms_accepted,
    status
  )
  SELECT
    c.id,
    v.id,
    co.id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    'WEEKLY',
    7,
    'CREDIT_CARD',
    'Weekly rental with GPS',
    TRUE,
    'CONFIRMED'
  FROM customers c
  CROSS JOIN vehicles v
  CROSS JOIN companies co
  WHERE c.email = 'boniswa@example.com'
    AND v.plate_number = '98309-G'
    AND co.branch_name = 'RAS AL KHOR'
  LIMIT 1
  RETURNING id, customer_id, vehicle_id, company_id, rental_days, status
)
SELECT
  b.id as booking_id,
  b.rental_days,
  b.status,
  v.make || ' ' || v.model as vehicle,
  v.weekly_rate as base_weekly_rate
FROM booking_data b
JOIN vehicles v ON v.id = b.vehicle_id;

-- Add GPS addon
INSERT INTO booking_addons (
  booking_id,
  addon_id,
  addon_name,
  daily_rate,
  quantity,
  total_amount
)
SELECT
  id,
  'gps',
  'GPS Navigation',
  25.00,
  1,
  25.00 * 7
FROM bookings
WHERE status = 'CONFIRMED'
ORDER BY created_at DESC
LIMIT 1;

-- =====================================================
-- STEP 5: Convert Booking to Rental Agreement
-- =====================================================

\echo ''
\echo 'Step 5: Converting booking to rental agreement...'

WITH agreement_data AS (
  INSERT INTO rental_agreements (
    agreement_number,
    booking_id,
    customer_id,
    vehicle_id,
    company_id,
    start_date,
    expected_return_date,
    handover_date,
    handover_km,
    handover_fuel_percentage,
    rent_amount,
    scdw_amount,
    delivery_charges,
    additional_driver_fee,
    subtotal,
    vat_rate,
    vat_amount,
    total_charges,
    security_deposit,
    status,
    insurance_type,
    insurance_excess_amount
  )
  SELECT
    'RASMLY' || TO_CHAR(CURRENT_DATE, 'YYMMDD') || '-' || LPAD(NEXTVAL('agreement_number_seq')::TEXT, 3, '0'),
    b.id,
    b.customer_id,
    b.vehicle_id,
    b.company_id,
    b.start_date,
    b.end_date,
    CURRENT_TIMESTAMP,
    v.current_km,
    100.00,
    v.weekly_rate, -- 600.00
    0.00,
    0.00,
    175.00, -- GPS addon: 25 * 7 days
    v.weekly_rate + 175.00, -- 775.00
    5.00,
    (v.weekly_rate + 175.00) * 0.05, -- 38.75
    (v.weekly_rate + 175.00) * 1.05, -- 813.75
    (v.weekly_rate + 175.00) * 1.05 * 0.20, -- 162.75 (20% deposit)
    'ACTIVE',
    'BASIC',
    v.insurance_excess_amount
  FROM bookings b
  JOIN vehicles v ON v.id = b.vehicle_id
  WHERE b.status = 'CONFIRMED'
  ORDER BY b.created_at DESC
  LIMIT 1
  RETURNING
    id,
    agreement_number,
    rent_amount,
    additional_driver_fee,
    subtotal,
    vat_amount,
    total_charges,
    security_deposit,
    status
)
SELECT
  agreement_number,
  rent_amount as rental_charge,
  additional_driver_fee as gps_addon,
  subtotal,
  vat_amount,
  total_charges,
  security_deposit,
  status
FROM agreement_data;

-- Create sequence for agreement numbers if not exists
DO $$
BEGIN
  CREATE SEQUENCE IF NOT EXISTS agreement_number_seq START 1;
EXCEPTION
  WHEN duplicate_table THEN
    NULL;
END $$;

-- Update booking status
UPDATE bookings
SET status = 'AGREEMENT_CREATED'
WHERE status = 'CONFIRMED';

-- =====================================================
-- STEP 6: Generate Monthly Invoice
-- =====================================================

\echo ''
\echo 'Step 6: Generating monthly invoice...'

WITH invoice_data AS (
  INSERT INTO invoices (
    invoice_number,
    agreement_id,
    customer_id,
    invoice_date,
    due_date,
    billing_period_start,
    billing_period_end,
    subtotal,
    vat_rate,
    vat_amount,
    total_amount,
    balance_due,
    status
  )
  SELECT
    get_next_transaction_number('INVOICE'),
    ra.id,
    ra.customer_id,
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '15 days',
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 month',
    ra.subtotal,
    ra.vat_rate,
    ra.vat_amount,
    ra.total_charges,
    ra.total_charges,
    'PENDING'
  FROM rental_agreements ra
  WHERE ra.status = 'ACTIVE'
  ORDER BY ra.created_at DESC
  LIMIT 1
  RETURNING
    id,
    invoice_number,
    invoice_date,
    due_date,
    subtotal,
    vat_amount,
    total_amount,
    status
)
SELECT
  invoice_number,
  invoice_date,
  due_date,
  subtotal,
  vat_amount,
  total_amount,
  status
FROM invoice_data;

-- Add invoice line items
INSERT INTO invoice_line_items (
  invoice_id,
  description,
  quantity,
  unit_price,
  total_amount,
  line_type
)
SELECT
  i.id,
  'Vehicle Rental - ' || v.make || ' ' || v.model || ' (Weekly)',
  1,
  ra.rent_amount,
  ra.rent_amount,
  'RENTAL'
FROM invoices i
JOIN rental_agreements ra ON ra.id = i.agreement_id
JOIN vehicles v ON v.id = ra.vehicle_id
WHERE i.status = 'PENDING'
ORDER BY i.created_at DESC
LIMIT 1;

INSERT INTO invoice_line_items (
  invoice_id,
  description,
  quantity,
  unit_price,
  total_amount,
  line_type
)
SELECT
  i.id,
  'GPS Navigation (7 days)',
  7,
  25.00,
  175.00,
  'ADDON'
FROM invoices i
WHERE i.status = 'PENDING'
ORDER BY i.created_at DESC
LIMIT 1;

-- =====================================================
-- STEP 7: Create Accounting Entries
-- =====================================================

\echo ''
\echo 'Step 7: Creating accounting entries...'

-- Get transaction type ID
DO $$
DECLARE
  v_invoice_type_id UUID;
  v_receipt_type_id UUID;
  v_deposit_type_id UUID;
  v_latest_invoice_id UUID;
  v_latest_agreement_id UUID;
  v_customer_id UUID;
  v_total_amount DECIMAL(15, 2);
  v_vat_amount DECIMAL(15, 2);
  v_subtotal DECIMAL(15, 2);
  v_security_deposit DECIMAL(15, 2);
  v_invoice_number VARCHAR(100);
  v_agreement_number VARCHAR(100);
  v_customer_name VARCHAR(255);
  v_ar_account_id UUID;
  v_revenue_account_id UUID;
  v_vat_account_id UUID;
  v_bank_account_id UUID;
  v_deposit_liability_id UUID;
BEGIN
  -- Get transaction type IDs
  SELECT id INTO v_invoice_type_id FROM transaction_types WHERE type_code = 'INVOICE';
  SELECT id INTO v_receipt_type_id FROM transaction_types WHERE type_code = 'RECEIPT';
  SELECT id INTO v_deposit_type_id FROM transaction_types WHERE type_code = 'DEPOSIT';

  -- Get account IDs
  SELECT id INTO v_ar_account_id FROM accounts WHERE account_code = '1103';
  SELECT id INTO v_revenue_account_id FROM accounts WHERE account_code = '4101';
  SELECT id INTO v_vat_account_id FROM accounts WHERE account_code = '2103';
  SELECT id INTO v_bank_account_id FROM accounts WHERE account_code = '1102';
  SELECT id INTO v_deposit_liability_id FROM accounts WHERE account_code = '2102';

  -- Get latest invoice details
  SELECT
    i.id,
    i.invoice_number,
    i.total_amount,
    i.vat_amount,
    i.subtotal,
    ra.id,
    ra.agreement_number,
    ra.security_deposit,
    ra.customer_id,
    c.first_name || ' ' || c.last_name
  INTO
    v_latest_invoice_id,
    v_invoice_number,
    v_total_amount,
    v_vat_amount,
    v_subtotal,
    v_latest_agreement_id,
    v_agreement_number,
    v_security_deposit,
    v_customer_id,
    v_customer_name
  FROM invoices i
  JOIN rental_agreements ra ON ra.id = i.agreement_id
  JOIN customers c ON c.id = ra.customer_id
  WHERE i.status = 'PENDING'
  ORDER BY i.created_at DESC
  LIMIT 1;

  -- Entry 1: Invoice (DR: A/R, CR: Revenue + VAT)
  INSERT INTO ledger (
    transaction_type_id,
    transaction_number,
    transaction_date,
    account_id,
    debit_amount,
    credit_amount,
    reference_type,
    reference_id,
    reference_number,
    party_type,
    party_id,
    party_name,
    description,
    status
  ) VALUES
  -- Debit: Accounts Receivable
  (
    v_invoice_type_id,
    v_invoice_number,
    CURRENT_DATE,
    v_ar_account_id,
    v_total_amount,
    0.00,
    'INVOICE',
    v_latest_invoice_id,
    v_invoice_number,
    'CUSTOMER',
    v_customer_id,
    v_customer_name,
    'Invoice for rental agreement ' || v_agreement_number,
    'POSTED'
  ),
  -- Credit: Rental Revenue
  (
    v_invoice_type_id,
    v_invoice_number,
    CURRENT_DATE,
    v_revenue_account_id,
    0.00,
    v_subtotal,
    'INVOICE',
    v_latest_invoice_id,
    v_invoice_number,
    'CUSTOMER',
    v_customer_id,
    v_customer_name,
    'Rental revenue for agreement ' || v_agreement_number,
    'POSTED'
  ),
  -- Credit: VAT Payable
  (
    v_invoice_type_id,
    v_invoice_number,
    CURRENT_DATE,
    v_vat_account_id,
    0.00,
    v_vat_amount,
    'INVOICE',
    v_latest_invoice_id,
    v_invoice_number,
    'CUSTOMER',
    v_customer_id,
    v_customer_name,
    'VAT on invoice ' || v_invoice_number,
    'POSTED'
  );

  -- Entry 2: Security Deposit Received (DR: Bank, CR: Deposit Liability)
  INSERT INTO ledger (
    transaction_type_id,
    transaction_number,
    transaction_date,
    account_id,
    debit_amount,
    credit_amount,
    reference_type,
    reference_id,
    reference_number,
    party_type,
    party_id,
    party_name,
    description,
    status
  ) VALUES
  -- Debit: Bank
  (
    v_deposit_type_id,
    get_next_transaction_number('DEPOSIT'),
    CURRENT_DATE,
    v_bank_account_id,
    v_security_deposit,
    0.00,
    'RENTAL_AGREEMENT',
    v_latest_agreement_id,
    v_agreement_number,
    'CUSTOMER',
    v_customer_id,
    v_customer_name,
    'Security deposit received for agreement ' || v_agreement_number,
    'POSTED'
  ),
  -- Credit: Security Deposit Liability
  (
    v_deposit_type_id,
    get_next_transaction_number('DEPOSIT') || '-CR',
    CURRENT_DATE,
    v_deposit_liability_id,
    0.00,
    v_security_deposit,
    'RENTAL_AGREEMENT',
    v_latest_agreement_id,
    v_agreement_number,
    'CUSTOMER',
    v_customer_id,
    v_customer_name,
    'Security deposit liability for agreement ' || v_agreement_number,
    'POSTED'
  );

  RAISE NOTICE 'Accounting entries created successfully!';
END $$;

-- =====================================================
-- STEP 8: Verify Accounting Balance
-- =====================================================

\echo ''
\echo 'Step 8: Verifying accounting entries (Debits = Credits)...'

SELECT
  'LEDGER BALANCE CHECK' as verification,
  SUM(debit_amount) as total_debits,
  SUM(credit_amount) as total_credits,
  SUM(debit_amount) - SUM(credit_amount) as difference,
  CASE
    WHEN SUM(debit_amount) = SUM(credit_amount) THEN '✓ BALANCED'
    ELSE '✗ UNBALANCED'
  END as status
FROM ledger
WHERE status = 'POSTED';

-- =====================================================
-- STEP 9: Display Trial Balance
-- =====================================================

\echo ''
\echo 'Step 9: Displaying trial balance...'

SELECT
  account_code,
  account_name,
  account_type,
  total_debit,
  total_credit,
  balance,
  normal_balance
FROM trial_balance
ORDER BY account_code;

-- =====================================================
-- STEP 10: Display Account Ledger Details
-- =====================================================

\echo ''
\echo 'Step 10: Displaying account ledger details...'

SELECT
  transaction_date,
  transaction_type,
  transaction_number,
  account_code,
  account_name,
  debit_amount,
  credit_amount,
  party_name,
  description,
  status
FROM account_ledger_detail
ORDER BY transaction_date DESC, transaction_number;

\echo ''
\echo '====================================================='
\echo 'WORKFLOW TEST COMPLETE!'
\echo '====================================================='
\echo ''
\echo 'Summary:'
\echo '- Created 1 company (Vesla Rent A Car)'
\echo '- Created 2 vehicles (NISSAN SUNNY, TOYOTA LAND CRUISER)'
\echo '- Created 1 customer (Boniswa Khumalo)'
\echo '- Created 1 booking (7-day weekly rental with GPS)'
\echo '- Converted to rental agreement'
\echo '- Generated invoice'
\echo '- Created accounting entries (invoice + security deposit)'
\echo '- Verified accounting balance (debits = credits)'
\echo ''
\echo 'Next: Review trial_balance view for account balances'
\echo '====================================================='
