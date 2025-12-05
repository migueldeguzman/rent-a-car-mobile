-- Load all initial data for rental app

-- CHARGE TYPES (57 types)
INSERT INTO charge_types (charge_code, charge_name, charge_category, amount, calculation_type, is_taxable) VALUES
-- Rental Rates (12)
('RENT_DAILY_ECONOMY', 'Daily Rental - Economy', 'RENTAL', 100.00, 'PER_DAY', TRUE),
('RENT_WEEKLY_ECONOMY', 'Weekly Rental - Economy', 'RENTAL', 600.00, 'FIXED', TRUE),
('RENT_MONTHLY_ECONOMY', 'Monthly Rental - Economy', 'RENTAL', 1800.00, 'FIXED', TRUE),
('RENT_DAILY_STANDARD', 'Daily Rental - Standard', 'RENTAL', 150.00, 'PER_DAY', TRUE),
('RENT_WEEKLY_STANDARD', 'Weekly Rental - Standard', 'RENTAL', 900.00, 'FIXED', TRUE),
('RENT_MONTHLY_STANDARD', 'Monthly Rental - Standard', 'RENTAL', 2700.00, 'FIXED', TRUE),
('RENT_DAILY_LUXURY', 'Daily Rental - Luxury', 'RENTAL', 300.00, 'PER_DAY', TRUE),
('RENT_WEEKLY_LUXURY', 'Weekly Rental - Luxury', 'RENTAL', 1800.00, 'FIXED', TRUE),
('RENT_MONTHLY_LUXURY', 'Monthly Rental - Luxury', 'RENTAL', 5400.00, 'FIXED', TRUE),
('RENT_DAILY_SUV', 'Daily Rental - SUV', 'RENTAL', 200.00, 'PER_DAY', TRUE),
('RENT_WEEKLY_SUV', 'Weekly Rental - SUV', 'RENTAL', 1200.00, 'FIXED', TRUE),
('RENT_MONTHLY_SUV', 'Monthly Rental - SUV', 'RENTAL', 3600.00, 'FIXED', TRUE),

-- Insurance (6)
('INSURANCE_BASIC_SEDAN', 'Basic Insurance Excess - Sedan', 'INSURANCE', 2000.00, 'FIXED', FALSE),
('INSURANCE_BASIC_SUV', 'Basic Insurance Excess - SUV', 'INSURANCE', 3000.00, 'FIXED', FALSE),
('INSURANCE_BASIC_LUXURY', 'Basic Insurance Excess - Luxury', 'INSURANCE', 5000.00, 'FIXED', FALSE),
('INSURANCE_CDW_SEDAN', 'CDW Insurance - Sedan', 'INSURANCE', 1000.00, 'FIXED', FALSE),
('INSURANCE_CDW_SUV', 'CDW Insurance - SUV', 'INSURANCE', 1500.00, 'FIXED', FALSE),
('INSURANCE_CDW_LUXURY', 'CDW Insurance - Luxury', 'INSURANCE', 2500.00, 'FIXED', FALSE),

-- Add-ons (4)
('ADDON_GPS', 'GPS Navigation System', 'ADDON', 25.00, 'PER_DAY', TRUE),
('ADDON_CHILD_SEAT', 'Child Safety Seat', 'ADDON', 30.00, 'PER_DAY', TRUE),
('ADDON_ADDITIONAL_DRIVER', 'Additional Driver', 'ADDON', 50.00, 'PER_DAY', TRUE),
('ADDON_INSURANCE_UPGRADE', 'Premium Insurance Upgrade', 'ADDON', 75.00, 'PER_DAY', TRUE),

-- Delivery (3)
('DELIVERY_AIRPORT', 'Airport Delivery/Pickup', 'DELIVERY', 150.00, 'FIXED', TRUE),
('DELIVERY_CITY', 'City Delivery/Pickup', 'DELIVERY', 100.00, 'FIXED', TRUE),
('DELIVERY_INTERCITY', 'Intercity Delivery', 'DELIVERY', 300.00, 'FIXED', TRUE),

-- Tax (1)
('VAT_RATE', 'Value Added Tax Rate', 'TAX', 5.00, 'PERCENTAGE', FALSE),

-- Service Fees (13)
('PROCESSING_FEE', 'Processing Fee', 'SERVICE', 50.00, 'FIXED', TRUE),
('ADMIN_FEE', 'Administration Fee', 'SERVICE', 30.00, 'FIXED', TRUE),
('CANCELLATION_FEE', 'Cancellation Fee', 'SERVICE', 200.00, 'FIXED', FALSE),
('MODIFICATION_FEE', 'Booking Modification Fee', 'SERVICE', 100.00, 'FIXED', TRUE),
('EXTENSION_FEE', 'Contract Extension Fee', 'SERVICE', 75.00, 'FIXED', TRUE),
('KNOWLEDGE_FEE', 'Knowledge and Innovation Fee', 'SERVICE', 20.00, 'FIXED', TRUE),
('TOURISM_FEE', 'Tourism Dirham Fee', 'SERVICE', 10.00, 'PER_DAY', TRUE),
('RTA_FEE', 'RTA Registration Fee', 'SERVICE', 150.00, 'FIXED', FALSE),
('INSURANCE_REGISTRATION', 'Insurance Registration', 'SERVICE', 100.00, 'FIXED', FALSE),
('SALIK_TAG', 'Salik Tag Rental', 'SERVICE', 5.00, 'PER_DAY', FALSE),
('PARKING_FEE', 'Airport Parking Fee', 'SERVICE', 50.00, 'FIXED', TRUE),
('TOLLS_ADVANCE', 'Toll Charges Advance', 'SERVICE', 100.00, 'FIXED', FALSE),
('DOCUMENT_FEE', 'Documentation Fee', 'SERVICE', 25.00, 'FIXED', TRUE),

-- Fines and Fees (5)
('LATE_RETURN_FEE', 'Late Return Fee', 'FINE_FEE', 100.00, 'PER_HOUR', TRUE),
('BLACK_POINTS_FEE', 'Black Points Handling Fee', 'FINE_FEE', 300.00, 'FIXED', FALSE),
('ADMIN_FINE_FEE', 'Administrative Fine Fee', 'FINE_FEE', 150.00, 'FIXED', FALSE),
('LOST_KEY_FEE', 'Lost Key Replacement', 'FINE_FEE', 500.00, 'FIXED', TRUE),
('LOST_DOCUMENTS_FEE', 'Lost Documents Fee', 'FINE_FEE', 1000.00, 'FIXED', TRUE),

-- Violations (3)
('SPEEDING_FINE', 'Speeding Violation', 'VIOLATION', 300.00, 'FIXED', FALSE),
('PARKING_VIOLATION', 'Parking Violation', 'VIOLATION', 200.00, 'FIXED', FALSE),
('RED_LIGHT_VIOLATION', 'Red Light Violation', 'VIOLATION', 1000.00, 'FIXED', FALSE),

-- Fuel (5)
('FUEL_CHARGE_SHORT', 'Fuel Shortage Charge', 'FUEL', 50.00, 'PER_LITER', TRUE),
('FUEL_SERVICE_FEE', 'Fuel Service Fee', 'FUEL', 100.00, 'FIXED', TRUE),
('FUEL_REFILL', 'Fuel Refill Charge', 'FUEL', 200.00, 'FIXED', TRUE),
('FUEL_SURCHARGE', 'Fuel Price Surcharge', 'FUEL', 10.00, 'PER_DAY', TRUE),
('FUEL_DAMAGE', 'Wrong Fuel Type Damage', 'FUEL', 2000.00, 'FIXED', FALSE),

-- Cleaning (3)
('CLEANING_STANDARD', 'Standard Cleaning', 'CLEANING', 100.00, 'FIXED', TRUE),
('CLEANING_DEEP', 'Deep Cleaning', 'CLEANING', 300.00, 'FIXED', TRUE),
('CLEANING_ODOR', 'Odor Removal', 'CLEANING', 500.00, 'FIXED', TRUE),

-- Damage (2)
('DAMAGE_MINOR', 'Minor Damage Repair', 'DAMAGE', 500.00, 'FIXED', TRUE),
('DAMAGE_MAJOR', 'Major Damage Repair', 'DAMAGE', 2000.00, 'FIXED', TRUE)

ON CONFLICT (charge_code) DO NOTHING;

-- CAMPAIGNS (10)
INSERT INTO campaigns (campaign_code, campaign_name, campaign_type, start_date, end_date, discount_type, discount_value) VALUES
('SUMMER2025', 'Summer Sale 2025', 'DISCOUNT', '2025-06-01', '2025-08-31', 'PERCENTAGE', 15.00),
('WEEKLY_BONUS', 'Weekly Rental Bonus', 'BONUS_DAYS', '2025-01-01', '2025-12-31', 'FREE_DAYS', 1.00),
('MONTHLY30', 'Monthly Discount 30%', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 30.00),
('WEEKEND_ECONOMY', 'Weekend Special Economy', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 20.00),
('WELCOME_NEW', 'New Customer Welcome', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 10.00),
('CORPORATE_VIP', 'Corporate VIP Program', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 25.00),
('RAMADAN2025', 'Ramadan Special 2025', 'DISCOUNT', '2025-02-28', '2025-03-30', 'PERCENTAGE', 20.00),
('UAE_NATIONAL_DAY', 'UAE National Day Sale', 'DISCOUNT', '2025-11-25', '2025-12-05', 'PERCENTAGE', 50.00),
('LUXURY_UPGRADE', 'Luxury Upgrade 50% Off', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 50.00),
('EARLY_BIRD_30', 'Early Bird 30-Day Advance', 'DISCOUNT', '2025-01-01', '2025-12-31', 'PERCENTAGE', 15.00)

ON CONFLICT (campaign_code) DO NOTHING;

-- Continue in next part...
