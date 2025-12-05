/**
 * Complete Workflow Test
 *
 * This script tests the complete rental workflow from booking to accounting
 *
 * Usage:
 *   node test-workflow.js "postgres://connection-string-here"
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Colors
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  log('✗ Connection string required!', 'red');
  console.log('Usage: node test-workflow.js "postgres://connection-string"');
  process.exit(1);
}

async function testWorkflow() {
  log('═══════════════════════════════════════', 'bright');
  log('COMPLETE WORKFLOW TEST', 'bright');
  log('═══════════════════════════════════════', 'bright');
  console.log('');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    log('✓ Connected to database', 'green');
    console.log('');

    // Read and execute the SQL test file
    const sqlPath = path.join(__dirname, 'test_complete_workflow.sql');

    if (!fs.existsSync(sqlPath)) {
      log('✗ test_complete_workflow.sql not found!', 'red');
      process.exit(1);
    }

    log('Running complete workflow test...', 'cyan');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    // Execute the SQL (this will create sample data and test the workflow)
    await client.query(sql);

    log('✓ Workflow test completed', 'green');
    console.log('');

    // Verify results
    log('═══════════════════════════════════════', 'bright');
    log('VERIFICATION', 'bright');
    log('═══════════════════════════════════════', 'bright');
    console.log('');

    // Check if sample data was created
    const companies = await client.query('SELECT COUNT(*) as count FROM companies');
    log(`Companies: ${companies.rows[0].count}`, 'cyan');

    const vehicles = await client.query('SELECT COUNT(*) as count FROM vehicles');
    log(`Vehicles: ${vehicles.rows[0].count}`, 'cyan');

    const customers = await client.query('SELECT COUNT(*) as count FROM customers');
    log(`Customers: ${customers.rows[0].count}`, 'cyan');

    const bookings = await client.query('SELECT COUNT(*) as count FROM bookings');
    log(`Bookings: ${bookings.rows[0].count}`, 'cyan');

    const agreements = await client.query('SELECT COUNT(*) as count FROM rental_agreements');
    log(`Rental Agreements: ${agreements.rows[0].count}`, 'cyan');

    const invoices = await client.query('SELECT COUNT(*) as count FROM invoices');
    log(`Invoices: ${invoices.rows[0].count}`, 'cyan');

    console.log('');

    // Check accounting balance
    const balance = await client.query(`
      SELECT
        COALESCE(SUM(debit_amount), 0) as debits,
        COALESCE(SUM(credit_amount), 0) as credits,
        COALESCE(SUM(debit_amount) - SUM(credit_amount), 0) as difference
      FROM ledger
      WHERE status = 'POSTED'
    `);

    const debits = parseFloat(balance.rows[0].debits);
    const credits = parseFloat(balance.rows[0].credits);
    const diff = parseFloat(balance.rows[0].difference);

    log('Accounting Balance Check:', 'bright');
    log(`  Debits:  ${debits.toFixed(2)} AED`, 'cyan');
    log(`  Credits: ${credits.toFixed(2)} AED`, 'cyan');
    log(`  Difference: ${diff.toFixed(2)} AED`, 'cyan');

    if (diff === 0 && debits > 0) {
      log('  ✓ BALANCED', 'green');
    } else if (debits === 0) {
      log('  ℹ No transactions yet', 'yellow');
    } else {
      log('  ✗ NOT BALANCED!', 'red');
    }

    console.log('');

    // Show trial balance
    const trialBalance = await client.query(`
      SELECT
        account_code,
        account_name,
        total_debit,
        total_credit,
        balance
      FROM trial_balance
      WHERE total_debit > 0 OR total_credit > 0
      ORDER BY account_code
    `);

    if (trialBalance.rows.length > 0) {
      log('Trial Balance:', 'bright');
      log('─────────────────────────────────────────────────', 'cyan');
      log('Code  | Account Name                | Debit    | Credit   | Balance', 'cyan');
      log('─────────────────────────────────────────────────', 'cyan');

      trialBalance.rows.forEach(row => {
        const code = row.account_code.padEnd(6);
        const name = row.account_name.substring(0, 24).padEnd(26);
        const debit = parseFloat(row.total_debit).toFixed(2).padStart(8);
        const credit = parseFloat(row.total_credit).toFixed(2).padStart(8);
        const balance = parseFloat(row.balance).toFixed(2).padStart(8);
        console.log(`${code}| ${name}| ${debit} | ${credit} | ${balance}`);
      });

      log('─────────────────────────────────────────────────', 'cyan');
    }

    console.log('');

    // Summary
    log('═══════════════════════════════════════', 'bright');
    log('TEST COMPLETE', 'bright');
    log('═══════════════════════════════════════', 'bright');
    console.log('');

    if (diff === 0 && debits > 0) {
      log('🎉 All tests passed! Database is working correctly.', 'green');
      log('', 'reset');
      log('Next steps:', 'cyan');
      log('  1. Configure backend/.env with DATABASE_URL', 'cyan');
      log('  2. Run: cd backend && npm install pg dotenv', 'cyan');
      log('  3. Run: cd backend && npx tsx test-db-connection.ts', 'cyan');
    } else {
      log('⚠️  Tests completed with warnings. Review output above.', 'yellow');
    }

    console.log('');

    await client.end();
    process.exit(0);

  } catch (error) {
    log('✗ Test failed!', 'red');
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

testWorkflow();
