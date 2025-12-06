-- =====================================================
-- VESLA RENT A CAR - NEON DATABASE SCHEMA
-- =====================================================
-- This schema captures the complete rental agreement workflow:
-- Booking → Rental Agreement → Monthly Invoicing → Accounting Entries
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Companies (branches of Vesla Group)
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    branch_name VARCHAR(255) NOT NULL, -- e.g., "RAS AL KHOR"
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100) DEFAULT 'United Arab Emirates',
    phone VARCHAR(20),
    email VARCHAR(255),
    license_number VARCHAR(100),
    trade_license_expiry DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Customers (HIRER from agreement)
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    id_type VARCHAR(50) NOT NULL, -- 'PASSPORT' or 'EMIRATES_ID'
    id_number VARCHAR(100) NOT NULL,
    id_issued_at VARCHAR(100),
    id_expiry_date DATE,
    license_number VARCHAR(100) NOT NULL,
    license_issued_at VARCHAR(100),
    license_issue_date DATE,
    license_expiry_date DATE,
    drivers_id VARCHAR(100), -- Driver License ID/Number (for all customers)
    emirates_id VARCHAR(100), -- Emirates ID (only for UAE residents, NULL for tourists)
    is_tourist BOOLEAN DEFAULT FALSE, -- TRUE if tourist (passport holder), FALSE if UAE resident
    company_name VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    mobile_number VARCHAR(20) NOT NULL,
    landline_number VARCHAR(20),
    email VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'CUSTOMER',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Additional Drivers (SECOND DRIVER from agreement)
CREATE TABLE additional_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    id_type VARCHAR(50) NOT NULL,
    id_number VARCHAR(100) NOT NULL,
    id_issued_at VARCHAR(100),
    id_expiry_date DATE,
    license_number VARCHAR(100) NOT NULL,
    license_issued_at VARCHAR(100),
    license_issue_date DATE,
    license_expiry_date DATE,
    company_name VARCHAR(255),
    address TEXT,
    mobile_number VARCHAR(20),
    landline_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicles
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
    make VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    color VARCHAR(50) NOT NULL,
    plate_number VARCHAR(50) NOT NULL UNIQUE,
    vin VARCHAR(100),
    vehicle_type VARCHAR(50) NOT NULL, -- 'SEDAN', 'HATCHBACK', 'COMPACT_SUV', '7_SEATER'
    category VARCHAR(50) NOT NULL, -- 'ECONOMY', 'STANDARD', 'LUXURY', 'SUV'
    insurance_type VARCHAR(50) NOT NULL DEFAULT 'BASIC', -- 'BASIC', 'CDW', 'FULL'
    insurance_excess_amount DECIMAL(10, 2) DEFAULT 2000.00,
    daily_rate DECIMAL(10, 2) NOT NULL,
    weekly_rate DECIMAL(10, 2),
    monthly_rate DECIMAL(10, 2),
    fuel_capacity INTEGER,
    current_km INTEGER DEFAULT 0,
    service_due_km INTEGER,
    last_service_km INTEGER,
    last_service_date DATE,
    status VARCHAR(50) DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RENTED', 'MAINTENANCE', 'OUT_OF_SERVICE'
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- BOOKING TABLES
-- =====================================================

-- Bookings (Initial reservation before agreement)
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id VARCHAR(100) UNIQUE, -- External booking reference
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP NOT NULL,
    rental_period_type VARCHAR(50) NOT NULL, -- 'DAILY', 'WEEKLY', 'MONTHLY'
    rental_days INTEGER NOT NULL,
    payment_method VARCHAR(50) NOT NULL, -- 'CASH', 'CREDIT_CARD', 'DEBIT_CARD', 'BANK_TRANSFER'
    notes TEXT,
    terms_accepted BOOLEAN DEFAULT FALSE,
    terms_accepted_at TIMESTAMP,
    notification_preferences JSONB, -- { "email": true, "sms": false }
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'CONFIRMED', 'AGREEMENT_CREATED', 'CANCELLED'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking Add-ons
CREATE TABLE booking_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    addon_id VARCHAR(50) NOT NULL,
    addon_name VARCHAR(100) NOT NULL,
    daily_rate DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- RENTAL AGREEMENT TABLES
-- =====================================================

-- Rental Agreements (Converted from bookings)
CREATE TABLE rental_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_number VARCHAR(100) NOT NULL UNIQUE, -- e.g., "RASMLY250800211-1"
    booking_id UUID UNIQUE REFERENCES bookings(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,

    -- Agreement Dates
    start_date TIMESTAMP NOT NULL,
    expected_return_date TIMESTAMP NOT NULL,
    actual_return_date TIMESTAMP,

    -- Vehicle Details at Handover (OUT DETAIL)
    handover_date TIMESTAMP,
    handover_km INTEGER,
    handover_fuel_percentage DECIMAL(5, 2), -- e.g., 62.5
    handover_fuel_level VARCHAR(10), -- e.g., "5/8"
    handover_notes TEXT,
    handover_video_url VARCHAR(500), -- Video evidence of vehicle condition

    -- Vehicle Details at Return (IN DETAIL)
    return_date TIMESTAMP,
    return_km INTEGER,
    return_fuel_percentage DECIMAL(5, 2),
    return_fuel_level VARCHAR(10),
    return_notes TEXT,
    return_video_url VARCHAR(500),

    -- Financial Details
    rent_amount DECIMAL(10, 2) NOT NULL,
    scdw_amount DECIMAL(10, 2) DEFAULT 0,
    fuel_charges DECIMAL(10, 2) DEFAULT 0,
    mileage_charges DECIMAL(10, 2) DEFAULT 0,
    fines_amount DECIMAL(10, 2) DEFAULT 0,
    fines_surcharge DECIMAL(10, 2) DEFAULT 0,
    tolls_amount DECIMAL(10, 2) DEFAULT 0,
    tolls_surcharge DECIMAL(10, 2) DEFAULT 0,
    darb_tolls DECIMAL(10, 2) DEFAULT 0,
    darb_tolls_surcharge DECIMAL(10, 2) DEFAULT 0,
    delivery_charges DECIMAL(10, 2) DEFAULT 0,
    processing_fee DECIMAL(10, 2) DEFAULT 0,
    additional_driver_fee DECIMAL(10, 2) DEFAULT 0,
    excess_insurance_charges DECIMAL(10, 2) DEFAULT 0,
    parking_charges DECIMAL(10, 2) DEFAULT 0,
    parking_surcharge DECIMAL(10, 2) DEFAULT 0,
    labour_charges DECIMAL(10, 2) DEFAULT 0,
    security_deposit_waiver DECIMAL(10, 2) DEFAULT 0,
    non_compliance_charges DECIMAL(10, 2) DEFAULT 0,
    oil_due_charges DECIMAL(10, 2) DEFAULT 0,
    excess_charges DECIMAL(10, 2) DEFAULT 0,
    discount_amount DECIMAL(10, 2) DEFAULT 0,

    -- Totals
    subtotal DECIMAL(10, 2) NOT NULL,
    vat_rate DECIMAL(5, 2) DEFAULT 5.00,
    vat_amount DECIMAL(10, 2) NOT NULL,
    total_charges DECIMAL(10, 2) NOT NULL,

    -- Deposits and Payments
    security_deposit DECIMAL(10, 2) DEFAULT 0,
    deposit_paid DECIMAL(10, 2) DEFAULT 0,
    amount_received DECIMAL(10, 2) DEFAULT 0,
    balance_due DECIMAL(10, 2) DEFAULT 0,

    -- Agreement Status
    status VARCHAR(50) DEFAULT 'DRAFT', -- 'DRAFT', 'SIGNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'
    pdf_url VARCHAR(500), -- Generated PDF agreement
    signature_url VARCHAR(500), -- Customer signature image
    signed_at TIMESTAMP,

    -- Insurance Details
    insurance_type VARCHAR(50) NOT NULL DEFAULT 'BASIC',
    insurance_excess_amount DECIMAL(10, 2),
    underage_driver BOOLEAN DEFAULT FALSE, -- Under 25 or license < 1 year

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agreement Additional Drivers (links to additional_drivers table)
CREATE TABLE agreement_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
    driver_id UUID NOT NULL REFERENCES additional_drivers(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(agreement_id, driver_id)
);

-- Agreement Line Items (detailed breakdown of charges)
CREATE TABLE agreement_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
    item_type VARCHAR(100) NOT NULL, -- 'RENT', 'ADDON', 'FEE', 'CHARGE', 'DISCOUNT'
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Damages (recorded at return)
CREATE TABLE vehicle_damages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID NOT NULL REFERENCES rental_agreements(id) ON DELETE CASCADE,
    damage_type VARCHAR(100) NOT NULL, -- 'SCRATCH', 'DENT', 'CRACK', 'MECHANICAL', 'INTERIOR'
    damage_location VARCHAR(255) NOT NULL, -- 'FRONT_BUMPER', 'DOOR_LEFT', etc.
    description TEXT,
    severity VARCHAR(50), -- 'MINOR', 'MODERATE', 'MAJOR'
    repair_cost DECIMAL(10, 2),
    photo_urls JSONB, -- Array of damage photo URLs
    police_report_number VARCHAR(100),
    police_report_url VARCHAR(500),
    at_fault BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Traffic Fines
CREATE TABLE traffic_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE SET NULL,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
    fine_number VARCHAR(100) UNIQUE NOT NULL,
    fine_type VARCHAR(100) NOT NULL, -- 'SPEEDING', 'PARKING', 'RED_LIGHT', etc.
    fine_amount DECIMAL(10, 2) NOT NULL,
    knowledge_fee DECIMAL(10, 2) DEFAULT 20.00, -- Dubai Police/RTA fee
    service_fee DECIMAL(10, 2) DEFAULT 30.00, -- Vesla service fee
    total_amount DECIMAL(10, 2) NOT NULL,
    black_points INTEGER DEFAULT 0,
    black_points_charge DECIMAL(10, 2) DEFAULT 0, -- 250 AED per point
    issue_date DATE NOT NULL,
    due_date DATE,
    payment_date DATE,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'NOTIFIED', 'PAID', 'OVERDUE'
    notified_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INVOICING TABLES
-- =====================================================

-- Invoices (generated monthly from active agreements)
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(100) NOT NULL UNIQUE,
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    invoice_date DATE NOT NULL,
    due_date DATE NOT NULL,
    billing_period_start DATE NOT NULL,
    billing_period_end DATE NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    vat_rate DECIMAL(5, 2) DEFAULT 5.00,
    vat_amount DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    balance_due DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- 'PENDING', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'
    pdf_url VARCHAR(500),
    sent_at TIMESTAMP,
    paid_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoice Line Items
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(255) NOT NULL,
    quantity INTEGER DEFAULT 1,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(10, 2) NOT NULL,
    line_type VARCHAR(50), -- 'RENTAL', 'ADDON', 'DEPOSIT', 'REFUND'
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- ACCOUNTING TABLES (ERP Integration)
-- =====================================================

-- Chart of Accounts
CREATE TABLE accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_type VARCHAR(50) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
    parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Journal Entries (double-entry bookkeeping)
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(100) NOT NULL UNIQUE,
    transaction_date DATE NOT NULL,
    reference_type VARCHAR(50), -- 'INVOICE', 'PAYMENT', 'DEPOSIT', 'REFUND'
    reference_id UUID, -- ID of invoice, payment, etc.
    description TEXT,
    total_debit DECIMAL(10, 2) NOT NULL,
    total_credit DECIMAL(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'POSTED', -- 'DRAFT', 'POSTED', 'REVERSED'
    posted_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    posted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT balanced_transaction CHECK (total_debit = total_credit)
);

-- Transaction Lines (individual debit/credit entries)
CREATE TABLE transaction_lines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
    debit_amount DECIMAL(10, 2) DEFAULT 0,
    credit_amount DECIMAL(10, 2) DEFAULT 0,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0)
    )
);

-- Payments
CREATE TABLE payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    payment_number VARCHAR(100) NOT NULL UNIQUE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE RESTRICT,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE RESTRICT,
    payment_date DATE NOT NULL,
    payment_method VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'COMPLETED', -- 'PENDING', 'COMPLETED', 'FAILED', 'REFUNDED'
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- AUDIT AND TRACKING TABLES
-- =====================================================

-- Activity Log (audit trail)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    entity_type VARCHAR(100) NOT NULL, -- 'BOOKING', 'AGREEMENT', 'INVOICE', etc.
    entity_id UUID NOT NULL,
    action VARCHAR(50) NOT NULL, -- 'CREATED', 'UPDATED', 'DELETED', 'SIGNED', 'PAID'
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(50),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Customers
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_mobile ON customers(mobile_number);
CREATE INDEX idx_customers_id_number ON customers(id_number);
CREATE INDEX idx_customers_drivers_id ON customers(drivers_id);
CREATE INDEX idx_customers_emirates_id ON customers(emirates_id);
CREATE INDEX idx_customers_is_tourist ON customers(is_tourist);

-- Vehicles
CREATE INDEX idx_vehicles_plate_number ON vehicles(plate_number);
CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_company ON vehicles(company_id);

-- Bookings
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_vehicle ON bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(start_date, end_date);

-- Rental Agreements
CREATE INDEX idx_agreements_number ON rental_agreements(agreement_number);
CREATE INDEX idx_agreements_customer ON rental_agreements(customer_id);
CREATE INDEX idx_agreements_vehicle ON rental_agreements(vehicle_id);
CREATE INDEX idx_agreements_status ON rental_agreements(status);
CREATE INDEX idx_agreements_booking ON rental_agreements(booking_id);

-- Invoices
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_customer ON invoices(customer_id);
CREATE INDEX idx_invoices_agreement ON invoices(agreement_id);
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_due_date ON invoices(due_date);

-- Transactions
CREATE INDEX idx_transactions_number ON transactions(transaction_number);
CREATE INDEX idx_transactions_date ON transactions(transaction_date);
CREATE INDEX idx_transactions_reference ON transactions(reference_type, reference_id);

-- Traffic Fines
CREATE INDEX idx_fines_agreement ON traffic_fines(agreement_id);
CREATE INDEX idx_fines_customer ON traffic_fines(customer_id);
CREATE INDEX idx_fines_status ON traffic_fines(status);

-- Activity Log
CREATE INDEX idx_activity_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_user ON activity_log(user_id);
CREATE INDEX idx_activity_date ON activity_log(created_at);

-- =====================================================
-- INITIAL DATA - CHART OF ACCOUNTS
-- =====================================================

INSERT INTO accounts (account_code, account_name, account_type) VALUES
-- Assets
('1100', 'Cash/Bank', 'ASSET'),
('1200', 'Accounts Receivable - Customers', 'ASSET'),
('1500', 'Vehicles (Asset)', 'ASSET'),

-- Liabilities
('2100', 'Accounts Payable', 'LIABILITY'),
('2200', 'Security Deposit Liability', 'LIABILITY'),
('2300', 'VAT Payable', 'LIABILITY'),

-- Revenue
('4100', 'Rental Revenue - Vehicles', 'REVENUE'),
('4200', 'Service Revenue - Add-ons', 'REVENUE'),

-- Expenses
('5100', 'Vehicle Maintenance', 'EXPENSE'),
('5200', 'Insurance Expense', 'EXPENSE');

-- =====================================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =====================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rental_agreements_updated_at BEFORE UPDATE ON rental_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transactions_updated_at BEFORE UPDATE ON transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- END OF SCHEMA
-- =====================================================
