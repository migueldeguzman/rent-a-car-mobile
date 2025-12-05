-- =====================================================
-- CHARGE TYPES MASTER TABLE
-- =====================================================
-- Centralized pricing for all additional charges
-- Allows dynamic pricing changes without code deployment
-- Tracks price history with effective dates
-- =====================================================

CREATE TABLE charge_types (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charge_code VARCHAR(50) NOT NULL UNIQUE,
    charge_name VARCHAR(255) NOT NULL,
    charge_category VARCHAR(50) NOT NULL, -- 'RENTAL', 'INSURANCE', 'ADDON', 'DELIVERY', 'TAX', 'FINE_FEE', 'DAMAGE', 'SERVICE', 'VIOLATION', 'FUEL', 'CLEANING'
    amount DECIMAL(10, 2) NOT NULL,
    calculation_type VARCHAR(50) DEFAULT 'FIXED', -- 'FIXED', 'PER_DAY', 'PER_KM', 'PERCENTAGE', 'PER_UNIT'
    is_taxable BOOLEAN DEFAULT TRUE,
    is_active BOOLEAN DEFAULT TRUE,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    effective_to DATE,
    description TEXT,
    terms_and_conditions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index for active charges lookup
CREATE INDEX idx_charge_types_active ON charge_types(is_active, effective_from, effective_to);
CREATE INDEX idx_charge_types_category ON charge_types(charge_category);
CREATE INDEX idx_charge_types_code ON charge_types(charge_code);

-- Trigger for auto-updating timestamps
CREATE TRIGGER update_charge_types_updated_at BEFORE UPDATE ON charge_types
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- INITIAL CHARGE TYPES DATA (from agreement)
-- =====================================================

INSERT INTO charge_types (charge_code, charge_name, charge_category, amount, calculation_type, description) VALUES

-- =====================================================
-- RENTAL RATES (Main Revenue)
-- =====================================================

-- Base Rental Rates (examples - should be vehicle-specific in production)
('RENT_DAILY_ECONOMY', 'Daily Rental - Economy', 'RENTAL', 100.00, 'PER_DAY', 'Daily rate for economy vehicles (e.g., Nissan Sunny)'),
('RENT_WEEKLY_ECONOMY', 'Weekly Rental - Economy', 'RENTAL', 600.00, 'FIXED', 'Weekly rate for economy vehicles (7 days)'),
('RENT_MONTHLY_ECONOMY', 'Monthly Rental - Economy', 'RENTAL', 1800.00, 'FIXED', 'Monthly rate for economy vehicles (30 days)'),

('RENT_DAILY_STANDARD', 'Daily Rental - Standard', 'RENTAL', 150.00, 'PER_DAY', 'Daily rate for standard vehicles'),
('RENT_WEEKLY_STANDARD', 'Weekly Rental - Standard', 'RENTAL', 900.00, 'FIXED', 'Weekly rate for standard vehicles (7 days)'),
('RENT_MONTHLY_STANDARD', 'Monthly Rental - Standard', 'RENTAL', 2700.00, 'FIXED', 'Monthly rate for standard vehicles (30 days)'),

('RENT_DAILY_SUV', 'Daily Rental - SUV', 'RENTAL', 200.00, 'PER_DAY', 'Daily rate for SUV vehicles'),
('RENT_WEEKLY_SUV', 'Weekly Rental - SUV', 'RENTAL', 1200.00, 'FIXED', 'Weekly rate for SUV vehicles (7 days)'),
('RENT_MONTHLY_SUV', 'Monthly Rental - SUV', 'RENTAL', 3600.00, 'FIXED', 'Monthly rate for SUV vehicles (30 days)'),

('RENT_DAILY_LUXURY', 'Daily Rental - Luxury', 'RENTAL', 300.00, 'PER_DAY', 'Daily rate for luxury vehicles'),
('RENT_WEEKLY_LUXURY', 'Weekly Rental - Luxury', 'RENTAL', 1800.00, 'FIXED', 'Weekly rate for luxury vehicles (7 days)'),
('RENT_MONTHLY_LUXURY', 'Monthly Rental - Luxury', 'RENTAL', 5400.00, 'FIXED', 'Monthly rate for luxury vehicles (30 days)'),

-- =====================================================
-- INSURANCE & COVERAGE
-- =====================================================

-- Insurance Types
('INSURANCE_BASIC_SEDAN', 'Basic Insurance Excess - Sedan', 'INSURANCE', 2000.00, 'FIXED', 'Insurance excess for sedan/hatchback with basic coverage'),
('INSURANCE_BASIC_SUV', 'Basic Insurance Excess - Compact SUV', 'INSURANCE', 3000.00, 'FIXED', 'Insurance excess for compact SUV with basic coverage'),
('INSURANCE_BASIC_7SEATER', 'Basic Insurance Excess - 7 Seater', 'INSURANCE', 4000.00, 'FIXED', 'Insurance excess for 7-seater vehicles with basic coverage'),

('INSURANCE_CDW_DAILY', 'CDW Insurance (Full Coverage) - Daily', 'INSURANCE', 50.00, 'PER_DAY', 'Collision Damage Waiver - full coverage per day'),
('INSURANCE_SCDW_DAILY', 'Super CDW Insurance - Daily', 'INSURANCE', 75.00, 'PER_DAY', 'Super Collision Damage Waiver - premium coverage per day'),

('SECURITY_DEPOSIT_PERCENTAGE', 'Security Deposit Rate', 'INSURANCE', 20.00, 'PERCENTAGE', 'Security deposit as % of total rental with VAT (20%)'),

-- =====================================================
-- ADD-ON SERVICES
-- =====================================================

('ADDON_GPS', 'GPS Navigation System', 'ADDON', 25.00, 'PER_DAY', 'GPS navigation device rental'),
('ADDON_CHILD_SEAT', 'Child Safety Seat', 'ADDON', 30.00, 'PER_DAY', 'Child car seat rental'),
('ADDON_ADDITIONAL_DRIVER', 'Additional Driver', 'ADDON', 50.00, 'PER_DAY', 'Additional driver authorization'),
('ADDON_INSURANCE_UPGRADE', 'Premium Insurance Upgrade', 'ADDON', 75.00, 'PER_DAY', 'Upgrade to premium insurance coverage'),

-- =====================================================
-- DELIVERY & COLLECTION
-- =====================================================

('DELIVERY_DUBAI', 'Delivery Within Dubai', 'DELIVERY', 0.00, 'FIXED', 'Free delivery for monthly contracts in Dubai'),
('DELIVERY_DUBAI_DAILY', 'Delivery Within Dubai (Daily/Weekly)', 'DELIVERY', 50.00, 'FIXED', 'Delivery fee for daily/weekly contracts based on location'),
('DELIVERY_OUTSIDE_DUBAI', 'Delivery Outside Dubai', 'DELIVERY', 100.00, 'FIXED', 'Delivery fee for areas outside Dubai'),

-- =====================================================
-- TAX & REGULATORY
-- =====================================================

('VAT_RATE', 'Value Added Tax Rate', 'TAX', 5.00, 'PERCENTAGE', 'UAE VAT rate (5%)'),

-- Fine-Related Fees
('KNOWLEDGE_FEE', 'Dubai Police/RTA Knowledge Fee', 'FINE_FEE', 20.00, 'FIXED', 'Added to all traffic fines'),
('SERVICE_FEE', 'Vesla Rent a Car Service Fee', 'FINE_FEE', 30.00, 'FIXED', 'Processing fee for traffic fines'),
('BLACK_POINT_FEE', 'Black Point Charge', 'FINE_FEE', 250.00, 'PER_UNIT', '250 AED per black point'),
('CONFISCATION_PRO_FEE', 'Vehicle Confiscation PRO Fee', 'FINE_FEE', 2000.00, 'FIXED', 'Public Relations Officer fee for vehicle confiscation'),
('UNDERAGE_CLAIMS_FEE', 'Underage Driver Claims Fee', 'FINE_FEE', 1000.00, 'FIXED', 'For drivers under 25 or license < 1 year'),

-- Toll & Road Charges
('SALIK_PEAK', 'Salik Peak Hours', 'SERVICE', 7.00, 'FIXED', 'Per Salik gate pass during peak hours'),
('SALIK_OFFPEAK', 'Salik Off-Peak Hours', 'SERVICE', 5.00, 'FIXED', 'Per Salik gate pass during off-peak hours'),
('SALIK_ADMIN', 'Salik Administration Fee', 'SERVICE', 30.00, 'FIXED', 'Admin fee per Salik usage'),
('DARB_TOLL', 'Darb Toll Charge', 'SERVICE', 5.00, 'FIXED', 'Per Darb toll gate pass'),
('PARKING_SERVICE', 'Parking Service Charge', 'SERVICE', 30.00, 'FIXED', 'Admin fee for parking charges'),

-- Vehicle-Related Charges
('TINTED_WINDOWS', 'Tinted Windows Violation', 'VIOLATION', 500.00, 'FIXED', 'Unauthorized window tinting'),
('SMOKING_CHARGE', 'Smoking Inside Vehicle', 'VIOLATION', 500.00, 'FIXED', 'Smoking strictly forbidden'),
('KEY_LOST', 'Lost Key Charge', 'SERVICE', 1200.00, 'FIXED', 'Replacement key cost'),
('SPARE_KEY_COLLECTION', 'Spare Key for Forced Collection', 'SERVICE', 1200.00, 'FIXED', 'Spare key + VAT when car forcefully collected'),

-- Cleaning Charges
('CLEANING_EXTERIOR', 'Exterior Cleaning', 'CLEANING', 50.00, 'FIXED', 'Cleaning outside of vehicle'),
('CLEANING_INTERIOR', 'Interior Vacuuming', 'CLEANING', 50.00, 'FIXED', 'Interior vacuum cleaning'),
('DETAILING', 'Interior Detailing', 'CLEANING', 500.00, 'FIXED', 'Full interior detailing service'),

-- Fuel Charges (based on fuel level at return)
('FUEL_0_25', 'Fuel Charge 0-25%', 'FUEL', 200.00, 'FIXED', 'Fuel refill for 0-25% level'),
('FUEL_25_50', 'Fuel Charge 25-50%', 'FUEL', 150.00, 'FIXED', 'Fuel refill for 25-50% level'),
('FUEL_50_75', 'Fuel Charge 50-75%', 'FUEL', 100.00, 'FIXED', 'Fuel refill for 50-75% level'),
('FUEL_75_99', 'Fuel Charge 75-99%', 'FUEL', 50.00, 'FIXED', 'Fuel refill for 75-99% level'),
('FUEL_SERVICE_FEE', 'Fuel Service Charge', 'FUEL', 30.00, 'FIXED', 'Service fee for fuel refill'),

-- Service & Maintenance
('OIL_SERVICE_OVERDUE', 'Overdue Oil Service', 'SERVICE', 1000.00, 'FIXED', 'Operating vehicle beyond service-due kilometer without notification'),
('PARKING_CENTER_FEE', 'Service Center Parking Fee', 'SERVICE', 30.00, 'FIXED', 'Parking fee when car is in service center'),
('LATE_PAYMENT_FEE', 'Late Payment Fee', 'SERVICE', 200.00, 'FIXED', 'Monthly late payment charge for outstanding amounts'),
('ADMIN_CASE_FEE', 'Administration Case Fee', 'SERVICE', 5000.00, 'FIXED', 'Admin fee for legal cases or reports'),
('ILLEGAL_USE_PENALTY', 'Illegal Car Use Penalty', 'VIOLATION', 3000.00, 'FIXED', 'Penalty for illegal car lift services, banned items, or improper use'),

-- Damage & Repair
('NO_POLICE_REPORT', 'No Police Report Penalty', 'DAMAGE', 4000.00, 'FIXED', 'Charged when police report not provided for damages'),
('SELF_REPAIR_PENALTY', 'Self-Repair Penalty', 'DAMAGE', 5000.00, 'FIXED', 'Penalty if hirer repairs car themselves'),

-- Excess Mileage
('EXCESS_KM', 'Excess Kilometer Charge', 'SERVICE', 1.00, 'PER_KM', '1 AED per extra kilometer'),

-- Additional Driver
('ADDITIONAL_DRIVER', 'Additional Driver Fee', 'SERVICE', 100.00, 'FIXED', 'Fee for adding second driver to agreement'),

-- Delivery & Collection
('FORCED_COLLECTION', 'Forced Vehicle Collection', 'SERVICE', 1200.00, 'FIXED', 'Recovery fee for forceful collection + all charges'),

-- Grace Period
('GRACE_PERIOD_HOURS', 'Grace Period Duration', 'SERVICE', 2.00, 'PER_UNIT', '2-hour grace period for all contracts (stored as hours, not charge)');

-- =====================================================
-- CHARGE HISTORY TABLE (Price Change Tracking)
-- =====================================================

CREATE TABLE charge_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    charge_type_id UUID NOT NULL REFERENCES charge_types(id) ON DELETE CASCADE,
    old_amount DECIMAL(10, 2) NOT NULL,
    new_amount DECIMAL(10, 2) NOT NULL,
    changed_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    change_reason TEXT,
    effective_from DATE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_charge_history_type ON charge_history(charge_type_id);
CREATE INDEX idx_charge_history_date ON charge_history(effective_from);

-- =====================================================
-- UPDATE EXISTING TABLES TO USE CHARGE TYPES
-- =====================================================

-- Add charge_type_id to agreement_line_items
ALTER TABLE agreement_line_items
ADD COLUMN charge_type_id UUID REFERENCES charge_types(id) ON DELETE SET NULL;

CREATE INDEX idx_agreement_line_items_charge_type ON agreement_line_items(charge_type_id);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get current charge amount
CREATE OR REPLACE FUNCTION get_charge_amount(charge_code_param VARCHAR)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    charge_amount DECIMAL(10, 2);
BEGIN
    SELECT amount INTO charge_amount
    FROM charge_types
    WHERE charge_code = charge_code_param
      AND is_active = TRUE
      AND effective_from <= CURRENT_DATE
      AND (effective_to IS NULL OR effective_to >= CURRENT_DATE)
    LIMIT 1;

    RETURN COALESCE(charge_amount, 0.00);
END;
$$ LANGUAGE plpgsql;

-- Function to get charge amount on specific date
CREATE OR REPLACE FUNCTION get_charge_amount_on_date(charge_code_param VARCHAR, date_param DATE)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    charge_amount DECIMAL(10, 2);
BEGIN
    SELECT amount INTO charge_amount
    FROM charge_types
    WHERE charge_code = charge_code_param
      AND is_active = TRUE
      AND effective_from <= date_param
      AND (effective_to IS NULL OR effective_to >= date_param)
    ORDER BY effective_from DESC
    LIMIT 1;

    RETURN COALESCE(charge_amount, 0.00);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- USAGE EXAMPLES
-- =====================================================

-- Get current black point charge
-- SELECT get_charge_amount('BLACK_POINT_FEE'); -- Returns 250.00

-- Get knowledge fee on specific agreement date
-- SELECT get_charge_amount_on_date('KNOWLEDGE_FEE', '2025-12-05'); -- Returns 20.00

-- Calculate total fine with fees
-- SELECT
--     fine_amount +
--     get_charge_amount('KNOWLEDGE_FEE') +
--     get_charge_amount('SERVICE_FEE') +
--     (black_points * get_charge_amount('BLACK_POINT_FEE'))
-- FROM traffic_fines WHERE fine_number = 'FINE123';

-- =====================================================
-- PRICE CHANGE AUDIT TRIGGER
-- =====================================================

CREATE OR REPLACE FUNCTION log_charge_price_change()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.amount != NEW.amount THEN
        INSERT INTO charge_history (
            charge_type_id,
            old_amount,
            new_amount,
            changed_by,
            effective_from
        ) VALUES (
            NEW.id,
            OLD.amount,
            NEW.amount,
            NEW.updated_at::VARCHAR::UUID, -- You'll need to pass user ID in update
            NEW.effective_from
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER charge_price_change_audit AFTER UPDATE ON charge_types
    FOR EACH ROW EXECUTE FUNCTION log_charge_price_change();

-- =====================================================
-- END OF CHARGE TYPES SCHEMA
-- =====================================================
