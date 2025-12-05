-- Create ONLY the new rental app tables (not conflicting with existing web-erp tables)
-- This works alongside existing: companies, customers, vehicles, bookings, invoices

-- Enable UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Helper function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Additional Drivers (NEW)
CREATE TABLE IF NOT EXISTS additional_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to existing users table
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    nationality VARCHAR(100) NOT NULL,
    id_type VARCHAR(50) NOT NULL,
    id_number VARCHAR(100) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    mobile_number VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Rental Agreements (NEW)
CREATE TABLE IF NOT EXISTS rental_agreements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_number VARCHAR(100) NOT NULL UNIQUE,
    booking_id UUID, -- Reference to existing bookings
    vehicle_id UUID, -- Reference to existing vehicles
    user_id UUID, -- Reference to existing users (customer)

    start_date DATE NOT NULL,
    expected_return_date DATE NOT NULL,
    actual_return_date DATE,

    -- Handover details
    handover_date TIMESTAMP,
    handover_km INTEGER,
    handover_fuel_percentage DECIMAL(5, 2),

    -- Return details
    return_km INTEGER,
    return_fuel_percentage DECIMAL(5, 2),

    -- Financial
    rent_amount DECIMAL(10, 2) NOT NULL,
    total_charges DECIMAL(10, 2) NOT NULL,
    security_deposit DECIMAL(10, 2),

    status VARCHAR(50) DEFAULT 'DRAFT',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Booking Add-ons (NEW)
CREATE TABLE IF NOT EXISTS booking_addons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    booking_id UUID, -- Reference to existing bookings
    addon_name VARCHAR(255) NOT NULL,
    daily_rate DECIMAL(10, 2) NOT NULL,
    quantity INTEGER DEFAULT 1,
    total_amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Agreement Line Items (NEW)
CREATE TABLE IF NOT EXISTS agreement_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE CASCADE,
    charge_code VARCHAR(50),
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Vehicle Damages (NEW)
CREATE TABLE IF NOT EXISTS vehicle_damages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE SET NULL,
    vehicle_id UUID, -- Reference to existing vehicles
    damage_date DATE NOT NULL,
    description TEXT NOT NULL,
    estimated_cost DECIMAL(10, 2),
    actual_cost DECIMAL(10, 2),
    status VARCHAR(50) DEFAULT 'REPORTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Traffic Fines (NEW)
CREATE TABLE IF NOT EXISTS traffic_fines (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE SET NULL,
    vehicle_id UUID, -- Reference to existing vehicles
    fine_date DATE NOT NULL,
    violation_type VARCHAR(255) NOT NULL,
    fine_amount DECIMAL(10, 2) NOT NULL,
    paid BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Charge Types (NEW)
CREATE TABLE IF NOT EXISTS charge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charge_code VARCHAR(50) NOT NULL UNIQUE,
    charge_name VARCHAR(255) NOT NULL,
    charge_category VARCHAR(50) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    calculation_type VARCHAR(50) DEFAULT 'FIXED',
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Charge History (NEW)
CREATE TABLE IF NOT EXISTS charge_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charge_type_id UUID REFERENCES charge_types(id) ON DELETE CASCADE,
    old_amount DECIMAL(10, 2),
    new_amount DECIMAL(10, 2) NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    changed_by UUID, -- Reference to users
    reason TEXT
);

-- Campaigns (NEW)
CREATE TABLE IF NOT EXISTS campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(50) NOT NULL UNIQUE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL,

    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    discount_type VARCHAR(50),
    discount_value DECIMAL(10, 2),

    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Usage (NEW)
CREATE TABLE IF NOT EXISTS campaign_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    booking_id UUID, -- Reference to existing bookings
    user_id UUID, -- Reference to existing users
    discount_applied DECIMAL(10, 2),
    used_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Campaign Bundles (NEW)
CREATE TABLE IF NOT EXISTS campaign_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID REFERENCES campaigns(id) ON DELETE CASCADE,
    item_type VARCHAR(50),
    item_id VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Accounts (NEW - Accounting)
CREATE TABLE IF NOT EXISTS accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_code VARCHAR(50) NOT NULL UNIQUE,
    account_name VARCHAR(255) NOT NULL,
    account_class VARCHAR(50) NOT NULL,
    account_type VARCHAR(50) NOT NULL,
    parent_account_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    level INTEGER DEFAULT 0,
    normal_balance VARCHAR(10) DEFAULT 'DEBIT',
    is_active BOOLEAN DEFAULT TRUE,
    opening_balance DECIMAL(15, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Transaction Types (NEW - Accounting)
CREATE TABLE IF NOT EXISTS transaction_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type_code VARCHAR(50) NOT NULL UNIQUE,
    type_name VARCHAR(100) NOT NULL,
    type_category VARCHAR(50) NOT NULL,
    number_prefix VARCHAR(10),
    next_number INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Ledger (NEW - Accounting)
CREATE TABLE IF NOT EXISTS ledger (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_type_id UUID REFERENCES transaction_types(id) ON DELETE RESTRICT,
    transaction_number VARCHAR(100) NOT NULL,
    transaction_date DATE NOT NULL,
    account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
    debit_amount DECIMAL(15, 2) DEFAULT 0.00,
    credit_amount DECIMAL(15, 2) DEFAULT 0.00,
    reference_type VARCHAR(50),
    reference_id UUID,
    description TEXT,
    status VARCHAR(50) DEFAULT 'POSTED',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Activity Log (NEW)
CREATE TABLE IF NOT EXISTS activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID, -- Reference to existing users
    action VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100),
    entity_id UUID,
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_rental_agreements_status ON rental_agreements(status);
CREATE INDEX IF NOT EXISTS idx_charge_types_category ON charge_types(charge_category);
CREATE INDEX IF NOT EXISTS idx_campaigns_active ON campaigns(is_active);
CREATE INDEX IF NOT EXISTS idx_ledger_account ON ledger(account_id);
CREATE INDEX IF NOT EXISTS idx_ledger_transaction_date ON ledger(transaction_date);

-- Create triggers
DROP TRIGGER IF EXISTS update_rental_agreements_updated_at ON rental_agreements;
CREATE TRIGGER update_rental_agreements_updated_at BEFORE UPDATE ON rental_agreements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_charge_types_updated_at ON charge_types;
CREATE TRIGGER update_charge_types_updated_at BEFORE UPDATE ON charge_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_campaigns_updated_at ON campaigns;
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts;
CREATE TRIGGER update_accounts_updated_at BEFORE UPDATE ON accounts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_transaction_types_updated_at ON transaction_types;
CREATE TRIGGER update_transaction_types_updated_at BEFORE UPDATE ON transaction_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_ledger_updated_at ON ledger;
CREATE TRIGGER update_ledger_updated_at BEFORE UPDATE ON ledger
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
