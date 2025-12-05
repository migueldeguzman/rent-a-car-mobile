-- =====================================================
-- MASTER MIGRATION FILE
-- =====================================================
-- Run all migrations in correct order
-- Usage: psql "postgres://your-neon-connection" -f run_all_migrations.sql
-- =====================================================

\echo '====================================================='
\echo 'VESLA RENT A CAR - COMPLETE DATABASE SETUP'
\echo '====================================================='
\echo ''
\echo 'This will create all tables, functions, and views.'
\echo 'Estimated time: 2-3 minutes'
\echo ''
\echo '====================================================='
\echo 'Step 1/4: Creating Core Schema...'
\echo '====================================================='

\i neon-schema.sql

\echo ''
\echo '====================================================='
\echo 'Step 2/4: Creating Charge Types System...'
\echo '====================================================='

\i charge_types_table.sql

\echo ''
\echo '====================================================='
\echo 'Step 3/4: Creating Campaigns System...'
\echo '====================================================='

\i campaigns_table.sql

\echo ''
\echo '====================================================='
\echo 'Step 4/4: Creating Revised Accounting System...'
\echo '====================================================='

\i accounting_tables_revised.sql

\echo ''
\echo '====================================================='
\echo 'SETUP COMPLETE!'
\echo '====================================================='
\echo ''
\echo 'Verification:'
\echo '-------------'

-- Count tables
SELECT COUNT(*) as total_tables, 'TOTAL TABLES (Expected: 27)' as description
FROM information_schema.tables
WHERE table_schema = 'public';

-- Count charge types
SELECT COUNT(*) as total_charge_types, 'TOTAL CHARGE TYPES (Expected: 57)' as description
FROM charge_types;

-- Count campaigns
SELECT COUNT(*) as total_campaigns, 'TOTAL CAMPAIGNS (Expected: 10)' as description
FROM campaigns;

-- Count accounts
SELECT COUNT(*) as total_accounts, 'TOTAL ACCOUNTS (Expected: 40)' as description
FROM accounts;

-- Count transaction types
SELECT COUNT(*) as total_transaction_types, 'TOTAL TRANSACTION TYPES (Expected: 10)' as description
FROM transaction_types;

-- Count functions
SELECT COUNT(*) as total_functions, 'TOTAL FUNCTIONS (Expected: 9)' as description
FROM information_schema.routines
WHERE routine_schema = 'public' AND routine_type = 'FUNCTION';

-- Count views
SELECT COUNT(*) as total_views, 'TOTAL VIEWS (Expected: 4)' as description
FROM information_schema.views
WHERE table_schema = 'public';

\echo ''
\echo '====================================================='
\echo 'Next Steps:'
\echo '1. Update backend .env: DATABASE_URL=your-neon-connection'
\echo '2. Create backend services: charge, campaign, pricing, accounting'
\echo '3. Test database connection'
\echo '4. Insert sample data (companies, vehicles, customers)'
\echo '====================================================='
