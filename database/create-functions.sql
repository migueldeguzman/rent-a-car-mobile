-- Helper Functions for Rental App

-- 1. Get current charge amount
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

-- 2. Get charge amount on specific date
CREATE OR REPLACE FUNCTION get_charge_amount_on_date(
    charge_code_param VARCHAR,
    date_param DATE
)
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
    LIMIT 1;
    RETURN COALESCE(charge_amount, 0.00);
END;
$$ LANGUAGE plpgsql;

-- 3. Get account balance
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
    SELECT normal_balance, COALESCE(opening_balance, 0)
    INTO v_normal_balance, v_opening_balance
    FROM accounts
    WHERE id = p_account_id;

    SELECT
        COALESCE(SUM(debit_amount), 0),
        COALESCE(SUM(credit_amount), 0)
    INTO v_total_debit, v_total_credit
    FROM ledger
    WHERE account_id = p_account_id
      AND transaction_date <= p_as_of_date
      AND status = 'POSTED';

    IF v_normal_balance = 'DEBIT' THEN
        v_balance := v_opening_balance + v_total_debit - v_total_credit;
    ELSE
        v_balance := v_opening_balance + v_total_credit - v_total_debit;
    END IF;

    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- 4. Get next transaction number
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

    UPDATE transaction_types
    SET next_number = next_number + 1
    WHERE type_code = p_type_code;

    RETURN v_transaction_number;
END;
$$ LANGUAGE plpgsql;

-- 5. Calculate rental price
CREATE OR REPLACE FUNCTION calculate_rental_price(
    p_vehicle_category VARCHAR,
    p_days INTEGER,
    p_rental_mode VARCHAR DEFAULT 'DAILY'
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_daily_rate DECIMAL(10, 2);
    v_weekly_rate DECIMAL(10, 2);
    v_monthly_rate DECIMAL(10, 2);
    v_total DECIMAL(10, 2);
    v_weeks INTEGER;
    v_months INTEGER;
    v_remaining_days INTEGER;
BEGIN
    -- Get rates based on category
    v_daily_rate := get_charge_amount('RENT_DAILY_' || UPPER(p_vehicle_category));
    v_weekly_rate := get_charge_amount('RENT_WEEKLY_' || UPPER(p_vehicle_category));
    v_monthly_rate := get_charge_amount('RENT_MONTHLY_' || UPPER(p_vehicle_category));

    IF p_rental_mode = 'MONTHLY' AND p_days >= 30 THEN
        v_months := p_days / 30;
        v_remaining_days := p_days % 30;
        v_total := (v_months * v_monthly_rate) + (v_remaining_days * v_daily_rate);
    ELSIF p_rental_mode = 'WEEKLY' AND p_days >= 7 THEN
        v_weeks := p_days / 7;
        v_remaining_days := p_days % 7;
        v_total := (v_weeks * v_weekly_rate) + (v_remaining_days * v_daily_rate);
    ELSE
        v_total := p_days * v_daily_rate;
    END IF;

    RETURN v_total;
END;
$$ LANGUAGE plpgsql;

-- 6. Calculate VAT
CREATE OR REPLACE FUNCTION calculate_vat(p_subtotal DECIMAL)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    v_vat_rate DECIMAL(5, 2);
BEGIN
    v_vat_rate := get_charge_amount('VAT_RATE');
    RETURN ROUND(p_subtotal * (v_vat_rate / 100), 2);
END;
$$ LANGUAGE plpgsql;
