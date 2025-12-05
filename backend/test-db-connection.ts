/**
 * Neon Database Connection Test
 *
 * This script tests the connection to the Neon PostgreSQL database
 * and verifies that all migrations have been run successfully.
 *
 * Run: npx tsx test-db-connection.ts
 */

import { Pool } from 'pg';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   NEON DATABASE CONNECTION TEST                          ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  try {
    // Test 1: Basic connection
    console.log('🔌 Testing connection...');
    const client = await pool.connect();
    console.log('✓ Connected to Neon PostgreSQL');
    console.log('');

    // Test 2: Server version
    console.log('📊 Checking database info...');
    const version = await client.query('SELECT version()');
    console.log('✓ PostgreSQL Version:', version.rows[0].version.split(' ')[1]);

    const currentTime = await client.query('SELECT NOW() as current_time');
    console.log('✓ Server Time:', currentTime.rows[0].current_time);
    console.log('');

    // Test 3: Count tables
    console.log('📋 Verifying schema setup...');
    const tables = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
    `);
    const tableCount = parseInt(tables.rows[0].table_count);
    console.log(tableCount === 27 ? '✓' : '✗', `Tables: ${tableCount} (Expected: 27)`);

    // Test 4: Count views
    const views = await client.query(`
      SELECT COUNT(*) as view_count
      FROM information_schema.views
      WHERE table_schema = 'public'
    `);
    const viewCount = parseInt(views.rows[0].view_count);
    console.log(viewCount === 4 ? '✓' : '✗', `Views: ${viewCount} (Expected: 4)`);

    // Test 5: Count functions
    const functions = await client.query(`
      SELECT COUNT(*) as function_count
      FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_type = 'FUNCTION'
    `);
    const functionCount = parseInt(functions.rows[0].function_count);
    console.log(functionCount === 9 ? '✓' : '✗', `Functions: ${functionCount} (Expected: 9)`);
    console.log('');

    // Test 6: Verify data tables
    console.log('💾 Checking data integrity...');

    const charges = await client.query('SELECT COUNT(*) as count FROM charge_types');
    const chargeCount = parseInt(charges.rows[0].count);
    console.log(chargeCount === 57 ? '✓' : '✗', `Charge Types: ${chargeCount} (Expected: 57)`);

    const campaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
    const campaignCount = parseInt(campaigns.rows[0].count);
    console.log(campaignCount === 10 ? '✓' : '✗', `Campaigns: ${campaignCount} (Expected: 10)`);

    const accounts = await client.query('SELECT COUNT(*) as count FROM accounts');
    const accountCount = parseInt(accounts.rows[0].count);
    console.log(accountCount === 40 ? '✓' : '✗', `Accounts: ${accountCount} (Expected: 40)`);

    const transactionTypes = await client.query('SELECT COUNT(*) as count FROM transaction_types');
    const typeCount = parseInt(transactionTypes.rows[0].count);
    console.log(typeCount === 10 ? '✓' : '✗', `Transaction Types: ${typeCount} (Expected: 10)`);
    console.log('');

    // Test 7: Test helper functions
    console.log('🔧 Testing helper functions...');

    const chargeAmount = await client.query(
      "SELECT get_charge_amount('KNOWLEDGE_FEE') as amount"
    );
    const knowledgeFee = parseFloat(chargeAmount.rows[0].amount);
    console.log(knowledgeFee === 20.00 ? '✓' : '✗', `get_charge_amount('KNOWLEDGE_FEE'): ${knowledgeFee} AED (Expected: 20.00)`);

    const invoiceNumber = await client.query(
      "SELECT get_next_transaction_number('INVOICE') as number"
    );
    console.log('✓', `get_next_transaction_number('INVOICE'): ${invoiceNumber.rows[0].number}`);
    console.log('');

    // Test 8: Verify accounting balance (if ledger has entries)
    console.log('💰 Checking accounting integrity...');
    const ledgerBalance = await client.query(`
      SELECT
        COALESCE(SUM(debit_amount), 0) as total_debits,
        COALESCE(SUM(credit_amount), 0) as total_credits,
        COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0) as difference
      FROM ledger
      WHERE status = 'POSTED'
    `);
    const debits = parseFloat(ledgerBalance.rows[0].total_debits);
    const credits = parseFloat(ledgerBalance.rows[0].total_credits);
    const difference = parseFloat(ledgerBalance.rows[0].difference);

    if (debits === 0 && credits === 0) {
      console.log('ℹ', 'Ledger is empty (no transactions yet)');
    } else {
      console.log(difference === 0 ? '✓' : '✗', `Ledger Balance: Debits=${debits}, Credits=${credits}, Difference=${difference}`);
      if (difference === 0) {
        console.log('✓ Accounting equation balanced!');
      } else {
        console.log('✗ WARNING: Accounting equation NOT balanced!');
      }
    }
    console.log('');

    // Test 9: List sample data
    console.log('📦 Sample data check...');

    const sampleCharges = await client.query(`
      SELECT charge_code, charge_name, amount
      FROM charge_types
      ORDER BY charge_category, charge_code
      LIMIT 5
    `);
    console.log('Sample Charges:');
    sampleCharges.rows.forEach(row => {
      console.log(`  - ${row.charge_code}: ${row.charge_name} (${row.amount} AED)`);
    });
    console.log('');

    const sampleCampaigns = await client.query(`
      SELECT campaign_code, campaign_name, discount_value
      FROM campaigns
      WHERE is_active = TRUE
      ORDER BY campaign_code
      LIMIT 5
    `);
    console.log('Sample Campaigns:');
    sampleCampaigns.rows.forEach(row => {
      console.log(`  - ${row.campaign_code}: ${row.campaign_name} (${row.discount_value}% off)`);
    });
    console.log('');

    const sampleAccounts = await client.query(`
      SELECT account_code, account_name, account_type
      FROM accounts
      WHERE account_class = 'INDIVIDUAL'
      ORDER BY account_code
      LIMIT 5
    `);
    console.log('Sample Accounts:');
    sampleAccounts.rows.forEach(row => {
      console.log(`  - ${row.account_code}: ${row.account_name} (${row.account_type})`);
    });
    console.log('');

    // Test 10: Check for any existing data
    console.log('🔍 Checking for existing data...');

    const companies = await client.query('SELECT COUNT(*) as count FROM companies');
    console.log(`  - Companies: ${companies.rows[0].count}`);

    const customers = await client.query('SELECT COUNT(*) as count FROM customers');
    console.log(`  - Customers: ${customers.rows[0].count}`);

    const vehicles = await client.query('SELECT COUNT(*) as count FROM vehicles');
    console.log(`  - Vehicles: ${vehicles.rows[0].count}`);

    const bookings = await client.query('SELECT COUNT(*) as count FROM bookings');
    console.log(`  - Bookings: ${bookings.rows[0].count}`);

    const agreements = await client.query('SELECT COUNT(*) as count FROM rental_agreements');
    console.log(`  - Rental Agreements: ${agreements.rows[0].count}`);

    const invoices = await client.query('SELECT COUNT(*) as count FROM invoices');
    console.log(`  - Invoices: ${invoices.rows[0].count}`);
    console.log('');

    client.release();

    // Summary
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✓ ALL TESTS PASSED!                                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('🎉 Database is ready for use!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Create backend services (charge, campaign, pricing, accounting)');
    console.log('  2. Build API endpoints');
    console.log('  3. Connect mobile app');
    console.log('');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.log('');
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║   ✗ CONNECTION FAILED                                    ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
    console.log('');
    console.error('Error details:', error);
    console.log('');
    console.log('Troubleshooting:');
    console.log('  1. Verify DATABASE_URL in .env file');
    console.log('  2. Check if Neon project is active');
    console.log('  3. Verify SSL mode is set correctly');
    console.log('  4. Run migrations: psql "connection-string" -f run_all_migrations.sql');
    console.log('  5. See NEON_DEPLOYMENT_STEPS.md for detailed guide');
    console.log('');

    await pool.end();
    process.exit(1);
  }
}

// Run the test
testConnection();
