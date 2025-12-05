-- =====================================================
-- CAMPAIGNS & PROMOTIONS SYSTEM
-- =====================================================
-- Flexible discount/promotion system for seasonal pricing
-- Supports: percentage discounts, fixed discounts, bonus days,
--           free add-ons, waived fees, and more
-- =====================================================

-- =====================================================
-- CAMPAIGNS TABLE (Master Promotions)
-- =====================================================

CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_code VARCHAR(50) NOT NULL UNIQUE,
    campaign_name VARCHAR(255) NOT NULL,
    campaign_type VARCHAR(50) NOT NULL, -- 'DISCOUNT', 'BONUS_DAYS', 'FREE_ADDON', 'WAIVE_FEE', 'BUNDLED', 'LOYALTY'
    description TEXT,

    -- Campaign Period
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,

    -- Booking Period (when customer can book, not necessarily rental period)
    booking_start_date DATE,
    booking_end_date DATE,

    -- Target Criteria
    applies_to VARCHAR(50) DEFAULT 'ALL', -- 'ALL', 'VEHICLE_CATEGORY', 'SPECIFIC_VEHICLE', 'CUSTOMER_SEGMENT', 'RENTAL_DURATION'
    target_categories JSONB, -- ['ECONOMY', 'STANDARD'] or null for all
    target_vehicles JSONB, -- [vehicle_ids] or null for all
    target_customer_segments JSONB, -- ['CORPORATE', 'VIP', 'NEW_CUSTOMER'] or null for all
    min_rental_days INTEGER, -- Minimum days to qualify
    max_rental_days INTEGER, -- Maximum days (null = no limit)

    -- Discount Configuration
    discount_type VARCHAR(50), -- 'PERCENTAGE', 'FIXED_AMOUNT', 'FREE_DAYS', 'CUSTOM'
    discount_value DECIMAL(10, 2), -- Percentage (e.g., 20.00) or Amount (e.g., 100.00)
    max_discount_amount DECIMAL(10, 2), -- Cap on total discount (prevents abuse)

    -- Free Days Configuration
    free_days_count INTEGER, -- e.g., "Rent 7 days, get 2 free"
    free_days_trigger_count INTEGER, -- e.g., Trigger after 7 days

    -- Add-on Benefits
    free_addons JSONB, -- ['ADDON_GPS', 'ADDON_CHILD_SEAT'] charge codes
    waived_fees JSONB, -- ['DELIVERY_DUBAI_DAILY', 'ADDITIONAL_DRIVER'] charge codes

    -- Usage Limits
    total_usage_limit INTEGER, -- Max total uses (null = unlimited)
    usage_limit_per_customer INTEGER DEFAULT 1, -- Max uses per customer
    current_usage_count INTEGER DEFAULT 0, -- Track total uses

    -- Priority (when multiple campaigns apply)
    priority INTEGER DEFAULT 1, -- Higher number = higher priority
    stackable BOOLEAN DEFAULT FALSE, -- Can combine with other campaigns

    -- Promo Code
    requires_promo_code BOOLEAN DEFAULT FALSE,
    promo_code VARCHAR(50) UNIQUE, -- Optional promo code (e.g., "SUMMER2025")

    -- Terms & Conditions
    terms_and_conditions TEXT,
    exclusions TEXT,

    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    auto_apply BOOLEAN DEFAULT FALSE, -- Automatically apply without promo code

    -- Audit
    created_by UUID REFERENCES customers(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_campaigns_active ON campaigns(is_active, start_date, end_date);
CREATE INDEX idx_campaigns_promo_code ON campaigns(promo_code) WHERE promo_code IS NOT NULL;
CREATE INDEX idx_campaigns_type ON campaigns(campaign_type);
CREATE INDEX idx_campaigns_dates ON campaigns(start_date, end_date);

-- Trigger for auto-updating timestamps
CREATE TRIGGER update_campaigns_updated_at BEFORE UPDATE ON campaigns
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- CAMPAIGN USAGE TRACKING
-- =====================================================

CREATE TABLE campaign_usage (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    agreement_id UUID REFERENCES rental_agreements(id) ON DELETE SET NULL,

    -- Discount Applied
    discount_amount DECIMAL(10, 2) NOT NULL,
    original_amount DECIMAL(10, 2) NOT NULL,
    final_amount DECIMAL(10, 2) NOT NULL,

    -- Promo Code Used
    promo_code_used VARCHAR(50),

    -- Usage Details
    applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- Prevent duplicate usage
    UNIQUE(campaign_id, customer_id, booking_id)
);

-- Indexes
CREATE INDEX idx_campaign_usage_campaign ON campaign_usage(campaign_id);
CREATE INDEX idx_campaign_usage_customer ON campaign_usage(customer_id);
CREATE INDEX idx_campaign_usage_booking ON campaign_usage(booking_id);

-- =====================================================
-- BUNDLED OFFERS (Multi-component campaigns)
-- =====================================================

CREATE TABLE campaign_bundles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    bundle_component_type VARCHAR(50) NOT NULL, -- 'VEHICLE_CATEGORY', 'ADDON', 'INSURANCE_UPGRADE'
    component_value JSONB NOT NULL, -- Configuration for this component
    discount_percentage DECIMAL(5, 2), -- Discount on this component
    is_required BOOLEAN DEFAULT TRUE, -- Must select this component
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaign_bundles_campaign ON campaign_bundles(campaign_id);

-- =====================================================
-- SAMPLE CAMPAIGNS
-- =====================================================

INSERT INTO campaigns (
    campaign_code,
    campaign_name,
    campaign_type,
    description,
    start_date,
    end_date,
    applies_to,
    discount_type,
    discount_value,
    auto_apply,
    terms_and_conditions
) VALUES

-- =====================================================
-- 1. SUMMER SALE 2025
-- =====================================================
(
    'SUMMER2025',
    'Summer Sale - 20% Off All Rentals',
    'DISCOUNT',
    'Get 20% off on all vehicle categories during summer months',
    '2025-06-01',
    '2025-08-31',
    'ALL',
    'PERCENTAGE',
    20.00,
    TRUE, -- Auto-apply
    'Valid for new bookings during June-August 2025. Cannot be combined with other offers. Minimum 3-day rental required.'
),

-- =====================================================
-- 2. WEEKLY RENTAL BONUS
-- =====================================================
(
    'WEEKLY_BONUS',
    'Rent 7 Days, Get 2 Free',
    'BONUS_DAYS',
    'Extended weekly rentals get 2 bonus days free',
    '2025-01-01',
    '2025-12-31',
    'ALL',
    'FREE_DAYS',
    NULL,
    TRUE, -- Auto-apply
    'Book 7 days minimum to receive 2 additional days free. Total 9 days for the price of 7.'
),

-- =====================================================
-- 3. MONTHLY RENTAL DISCOUNT
-- =====================================================
(
    'MONTHLY30',
    'Monthly Rental - 30% Off',
    'DISCOUNT',
    'Long-term monthly rentals get special discount',
    '2025-01-01',
    '2025-12-31',
    'RENTAL_DURATION',
    'PERCENTAGE',
    30.00,
    TRUE, -- Auto-apply
    'Valid for rentals of 30 days or more. Discount applies to rental rate only, not add-ons or fees.'
),

-- =====================================================
-- 4. ECONOMY WEEKEND SPECIAL
-- =====================================================
(
    'WEEKEND_ECONOMY',
    'Weekend Special - Economy Cars',
    'DISCOUNT',
    'Fixed 150 AED discount on weekend economy car rentals',
    '2025-01-01',
    '2025-12-31',
    'VEHICLE_CATEGORY',
    'FIXED_AMOUNT',
    150.00,
    FALSE, -- Requires promo code
    'Use promo code WEEKEND at checkout. Valid for Friday-Sunday pickups only. Economy vehicles only.'
),

-- =====================================================
-- 5. NEW CUSTOMER WELCOME
-- =====================================================
(
    'WELCOME_NEW',
    'New Customer - 15% Off First Rental',
    'DISCOUNT',
    'First-time customers get 15% discount',
    '2025-01-01',
    '2025-12-31',
    'CUSTOMER_SEGMENT',
    'PERCENTAGE',
    15.00,
    TRUE, -- Auto-apply
    'Valid for first rental only. One-time use per customer. Discount applied automatically at checkout.'
),

-- =====================================================
-- 6. CORPORATE LOYALTY PROGRAM
-- =====================================================
(
    'CORPORATE_VIP',
    'Corporate VIP - 25% Off + Free GPS',
    'BUNDLED',
    'Corporate customers get discount plus free add-ons',
    '2025-01-01',
    '2025-12-31',
    'CUSTOMER_SEGMENT',
    'PERCENTAGE',
    25.00,
    TRUE, -- Auto-apply
    'Exclusive for verified corporate accounts. Free GPS included with every rental. Free delivery within Dubai.'
),

-- =====================================================
-- 7. RAMADAN SPECIAL
-- =====================================================
(
    'RAMADAN2025',
    'Ramadan Kareem - 20% Off + Waived Delivery',
    'BUNDLED',
    'Special Ramadan promotion with discount and free delivery',
    '2025-03-01',
    '2025-03-30',
    'ALL',
    'PERCENTAGE',
    20.00,
    FALSE, -- Requires promo code
    'Use promo code RAMADAN2025. Delivery fee waived for all rentals. Valid during Ramadan month only.'
),

-- =====================================================
-- 8. NATIONAL DAY PROMO
-- =====================================================
(
    'UAE_NATIONAL_DAY',
    'UAE National Day - 49 AED Discount',
    'DISCOUNT',
    'Celebrate UAE National Day with special discount',
    '2025-11-28',
    '2025-12-05',
    'ALL',
    'FIXED_AMOUNT',
    49.00,
    TRUE, -- Auto-apply
    'Limited time offer. 49 AED discount on all rentals during UAE National Day week.'
),

-- =====================================================
-- 9. LUXURY UPGRADE DEAL
-- =====================================================
(
    'LUXURY_UPGRADE',
    'Upgrade to Luxury - Pay Standard Price',
    'DISCOUNT',
    'Book a luxury vehicle at standard category pricing',
    '2025-01-15',
    '2025-02-15',
    'VEHICLE_CATEGORY',
    'CUSTOM',
    NULL,
    FALSE, -- Requires promo code
    'Use promo code LUXUPGRADE. Rent any luxury vehicle for the price of a standard category. Limited availability.'
),

-- =====================================================
-- 10. EARLY BIRD BOOKING
-- =====================================================
(
    'EARLY_BIRD_30',
    'Early Bird - Book 30 Days Advance, Save 10%',
    'DISCOUNT',
    'Book 30 days in advance for extra savings',
    '2025-01-01',
    '2025-12-31',
    'ALL',
    'PERCENTAGE',
    10.00,
    TRUE, -- Auto-apply
    'Booking must be made at least 30 days before rental start date. Discount applied automatically.'
);

-- =====================================================
-- Update specific campaigns with additional configurations
-- =====================================================

-- Economy Weekend: Target only ECONOMY category
UPDATE campaigns
SET target_categories = '["ECONOMY"]'::JSONB,
    promo_code = 'WEEKEND',
    min_rental_days = 2
WHERE campaign_code = 'WEEKEND_ECONOMY';

-- Weekly Bonus: Set free days configuration
UPDATE campaigns
SET free_days_count = 2,
    free_days_trigger_count = 7,
    min_rental_days = 7
WHERE campaign_code = 'WEEKLY_BONUS';

-- Monthly Discount: Minimum 30 days
UPDATE campaigns
SET min_rental_days = 30
WHERE campaign_code = 'MONTHLY30';

-- New Customer: Target only new customers
UPDATE campaigns
SET target_customer_segments = '["NEW_CUSTOMER"]'::JSONB,
    usage_limit_per_customer = 1
WHERE campaign_code = 'WELCOME_NEW';

-- Corporate VIP: Set free add-ons and waived fees
UPDATE campaigns
SET target_customer_segments = '["CORPORATE", "VIP"]'::JSONB,
    free_addons = '["ADDON_GPS"]'::JSONB,
    waived_fees = '["DELIVERY_DUBAI", "DELIVERY_DUBAI_DAILY"]'::JSONB
WHERE campaign_code = 'CORPORATE_VIP';

-- Ramadan: Set promo code and waived fees
UPDATE campaigns
SET promo_code = 'RAMADAN2025',
    waived_fees = '["DELIVERY_DUBAI_DAILY", "DELIVERY_OUTSIDE_DUBAI"]'::JSONB
WHERE campaign_code = 'RAMADAN2025';

-- Luxury Upgrade: Target luxury category
UPDATE campaigns
SET target_categories = '["LUXURY"]'::JSONB,
    promo_code = 'LUXUPGRADE',
    total_usage_limit = 50 -- Limited availability
WHERE campaign_code = 'LUXURY_UPGRADE';

-- Early Bird: Set booking period requirement
UPDATE campaigns
SET booking_start_date = '2025-01-01',
    booking_end_date = '2025-12-31'
WHERE campaign_code = 'EARLY_BIRD_30';

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to get applicable campaigns for a booking
CREATE OR REPLACE FUNCTION get_applicable_campaigns(
    p_customer_id UUID,
    p_vehicle_id UUID,
    p_start_date DATE,
    p_rental_days INTEGER,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS TABLE (
    campaign_id UUID,
    campaign_code VARCHAR,
    campaign_name VARCHAR,
    campaign_type VARCHAR,
    discount_type VARCHAR,
    discount_value DECIMAL,
    priority INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.campaign_code,
        c.campaign_name,
        c.campaign_type,
        c.discount_type,
        c.discount_value,
        c.priority
    FROM campaigns c
    LEFT JOIN vehicles v ON v.id = p_vehicle_id
    WHERE
        -- Campaign is active
        c.is_active = TRUE

        -- Within campaign period
        AND p_start_date BETWEEN c.start_date AND c.end_date

        -- Promo code match (if required)
        AND (
            c.requires_promo_code = FALSE
            OR (c.requires_promo_code = TRUE AND c.promo_code = p_promo_code)
        )

        -- Rental duration requirements
        AND (c.min_rental_days IS NULL OR p_rental_days >= c.min_rental_days)
        AND (c.max_rental_days IS NULL OR p_rental_days <= c.max_rental_days)

        -- Category targeting
        AND (
            c.applies_to = 'ALL'
            OR (c.applies_to = 'VEHICLE_CATEGORY' AND c.target_categories @> to_jsonb(ARRAY[v.category]))
            OR (c.applies_to = 'SPECIFIC_VEHICLE' AND c.target_vehicles @> to_jsonb(ARRAY[p_vehicle_id::TEXT]))
        )

        -- Usage limits
        AND (c.total_usage_limit IS NULL OR c.current_usage_count < c.total_usage_limit)

        -- Customer usage limit
        AND (
            SELECT COUNT(*)
            FROM campaign_usage cu
            WHERE cu.campaign_id = c.id AND cu.customer_id = p_customer_id
        ) < c.usage_limit_per_customer

    ORDER BY c.priority DESC, c.discount_value DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate campaign discount
CREATE OR REPLACE FUNCTION calculate_campaign_discount(
    p_campaign_id UUID,
    p_original_amount DECIMAL
)
RETURNS DECIMAL AS $$
DECLARE
    v_discount_type VARCHAR;
    v_discount_value DECIMAL;
    v_max_discount DECIMAL;
    v_calculated_discount DECIMAL;
BEGIN
    SELECT discount_type, discount_value, max_discount_amount
    INTO v_discount_type, v_discount_value, v_max_discount
    FROM campaigns
    WHERE id = p_campaign_id;

    IF v_discount_type = 'PERCENTAGE' THEN
        v_calculated_discount := p_original_amount * (v_discount_value / 100);
    ELSIF v_discount_type = 'FIXED_AMOUNT' THEN
        v_calculated_discount := v_discount_value;
    ELSE
        v_calculated_discount := 0;
    END IF;

    -- Apply max discount cap if set
    IF v_max_discount IS NOT NULL AND v_calculated_discount > v_max_discount THEN
        v_calculated_discount := v_max_discount;
    END IF;

    -- Cannot exceed original amount
    IF v_calculated_discount > p_original_amount THEN
        v_calculated_discount := p_original_amount;
    END IF;

    RETURN v_calculated_discount;
END;
$$ LANGUAGE plpgsql;

-- Function to record campaign usage
CREATE OR REPLACE FUNCTION record_campaign_usage(
    p_campaign_id UUID,
    p_customer_id UUID,
    p_booking_id UUID,
    p_discount_amount DECIMAL,
    p_original_amount DECIMAL,
    p_promo_code VARCHAR DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    -- Insert usage record
    INSERT INTO campaign_usage (
        campaign_id,
        customer_id,
        booking_id,
        discount_amount,
        original_amount,
        final_amount,
        promo_code_used
    ) VALUES (
        p_campaign_id,
        p_customer_id,
        p_booking_id,
        p_discount_amount,
        p_original_amount,
        p_original_amount - p_discount_amount,
        p_promo_code
    );

    -- Increment campaign usage count
    UPDATE campaigns
    SET current_usage_count = current_usage_count + 1
    WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- VIEWS FOR REPORTING
-- =====================================================

-- Active Campaigns Summary
CREATE VIEW active_campaigns_summary AS
SELECT
    c.campaign_code,
    c.campaign_name,
    c.campaign_type,
    c.start_date,
    c.end_date,
    c.discount_type,
    c.discount_value,
    c.current_usage_count,
    c.total_usage_limit,
    CASE
        WHEN c.total_usage_limit IS NULL THEN 'Unlimited'
        ELSE ROUND((c.current_usage_count::DECIMAL / c.total_usage_limit) * 100, 2)::TEXT || '%'
    END as usage_percentage,
    c.promo_code,
    c.auto_apply
FROM campaigns c
WHERE c.is_active = TRUE
  AND CURRENT_DATE BETWEEN c.start_date AND c.end_date
ORDER BY c.priority DESC;

-- Campaign Performance Report
CREATE VIEW campaign_performance AS
SELECT
    c.campaign_code,
    c.campaign_name,
    c.campaign_type,
    COUNT(cu.id) as total_uses,
    COUNT(DISTINCT cu.customer_id) as unique_customers,
    SUM(cu.discount_amount) as total_discount_given,
    SUM(cu.original_amount) as total_original_revenue,
    SUM(cu.final_amount) as total_actual_revenue,
    ROUND(AVG(cu.discount_amount), 2) as avg_discount_per_booking
FROM campaigns c
LEFT JOIN campaign_usage cu ON cu.campaign_id = c.id
GROUP BY c.id, c.campaign_code, c.campaign_name, c.campaign_type
ORDER BY total_discount_given DESC;

-- =====================================================
-- END OF CAMPAIGNS SCHEMA
-- =====================================================
