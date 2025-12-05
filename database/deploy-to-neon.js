/**
 * Neon Database Deployment Script
 *
 * This script deploys the complete database schema to Neon PostgreSQL
 * using Node.js (no psql required)
 *
 * Usage:
 *   node deploy-to-neon.js "postgres://connection-string-here"
 *
 * Or set DATABASE_URL environment variable:
 *   set DATABASE_URL=postgres://connection
 *   node deploy-to-neon.js
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

// Color output helpers
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✓ ${message}`, 'green');
}

function logError(message) {
  log(`✗ ${message}`, 'red');
}

function logInfo(message) {
  log(`ℹ ${message}`, 'cyan');
}

function logWarning(message) {
  log(`⚠ ${message}`, 'yellow');
}

// Get connection string from argument or environment
const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  logError('Connection string required!');
  console.log('');
  console.log('Usage:');
  console.log('  node deploy-to-neon.js "postgres://your-connection-string"');
  console.log('');
  console.log('Or set environment variable:');
  console.log('  set DATABASE_URL=postgres://your-connection-string');
  console.log('  node deploy-to-neon.js');
  process.exit(1);
}

// Migration files in order
const migrations = [
  'neon-schema.sql',
  'charge_types_table.sql',
  'campaigns_table.sql',
  'accounting_tables_revised.sql'
];

async function runMigration(client, filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`Migration file not found: ${filename}`);
  }

  log(`\nRunning: ${filename}`, 'bright');

  const sql = fs.readFileSync(filepath, 'utf8');

  // Split by semicolons but be careful with function definitions
  // For simplicity, we'll execute the entire file as one statement
  try {
    await client.query(sql);
    logSuccess(`Completed: ${filename}`);
  } catch (error) {
    // If full file fails, try splitting by semicolons
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (let i = 0; i < statements.length; i++) {
      try {
        await client.query(statements[i]);
      } catch (err) {
        // Skip comments and empty statements
        if (!statements[i].startsWith('--') && statements[i].trim().length > 10) {
          logWarning(`Statement ${i + 1}/${statements.length} failed: ${err.message}`);
        }
      }
    }
    logSuccess(`Completed: ${filename} (with warnings)`);
  }
}

async function verify(client) {
  log('\n═══════════════════════════════════════', 'bright');
  log('VERIFYING DEPLOYMENT', 'bright');
  log('═══════════════════════════════════════', 'bright');

  // Check tables
  const tables = await client.query(`
    SELECT COUNT(*) as count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `);
  const tableCount = parseInt(tables.rows[0].count);
  if (tableCount === 27) {
    logSuccess(`Tables: ${tableCount} (Expected: 27)`);
  } else {
    logWarning(`Tables: ${tableCount} (Expected: 27)`);
  }

  // Check views
  const views = await client.query(`
    SELECT COUNT(*) as count
    FROM information_schema.views
    WHERE table_schema = 'public'
  `);
  const viewCount = parseInt(views.rows[0].count);
  if (viewCount === 4) {
    logSuccess(`Views: ${viewCount} (Expected: 4)`);
  } else {
    logWarning(`Views: ${viewCount} (Expected: 4)`);
  }

  // Check functions
  const functions = await client.query(`
    SELECT COUNT(*) as count
    FROM information_schema.routines
    WHERE routine_schema = 'public'
      AND routine_type = 'FUNCTION'
  `);
  const functionCount = parseInt(functions.rows[0].count);
  if (functionCount === 9) {
    logSuccess(`Functions: ${functionCount} (Expected: 9)`);
  } else {
    logWarning(`Functions: ${functionCount} (Expected: 9)`);
  }

  // Check charge types
  const charges = await client.query('SELECT COUNT(*) as count FROM charge_types');
  const chargeCount = parseInt(charges.rows[0].count);
  if (chargeCount === 57) {
    logSuccess(`Charge Types: ${chargeCount} (Expected: 57)`);
  } else {
    logWarning(`Charge Types: ${chargeCount} (Expected: 57)`);
  }

  // Check campaigns
  const campaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
  const campaignCount = parseInt(campaigns.rows[0].count);
  if (campaignCount === 10) {
    logSuccess(`Campaigns: ${campaignCount} (Expected: 10)`);
  } else {
    logWarning(`Campaigns: ${campaignCount} (Expected: 10)`);
  }

  // Check accounts
  const accounts = await client.query('SELECT COUNT(*) as count FROM accounts');
  const accountCount = parseInt(accounts.rows[0].count);
  if (accountCount === 40) {
    logSuccess(`Accounts: ${accountCount} (Expected: 40)`);
  } else {
    logWarning(`Accounts: ${accountCount} (Expected: 40)`);
  }

  // Check transaction types
  const types = await client.query('SELECT COUNT(*) as count FROM transaction_types');
  const typeCount = parseInt(types.rows[0].count);
  if (typeCount === 10) {
    logSuccess(`Transaction Types: ${typeCount} (Expected: 10)`);
  } else {
    logWarning(`Transaction Types: ${typeCount} (Expected: 10)`);
  }

  // Test helper functions
  try {
    const charge = await client.query("SELECT get_charge_amount('KNOWLEDGE_FEE') as amount");
    const amount = parseFloat(charge.rows[0].amount);
    if (amount === 20.00) {
      logSuccess(`Helper function test: get_charge_amount('KNOWLEDGE_FEE') = ${amount} AED`);
    } else {
      logWarning(`Helper function test: get_charge_amount('KNOWLEDGE_FEE') = ${amount} AED (Expected: 20.00)`);
    }
  } catch (err) {
    logError(`Helper function test failed: ${err.message}`);
  }

  // Check accounting balance
  const balance = await client.query(`
    SELECT
      COALESCE(SUM(debit_amount), 0) as debits,
      COALESCE(SUM(credit_amount), 0) as credits,
      COALESCE(SUM(debit_amount), 0) - COALESCE(SUM(credit_amount), 0) as difference
    FROM ledger
    WHERE status = 'POSTED'
  `);
  const debits = parseFloat(balance.rows[0].debits);
  const credits = parseFloat(balance.rows[0].credits);
  const diff = parseFloat(balance.rows[0].difference);

  if (debits === 0 && credits === 0) {
    logInfo('Ledger is empty (no transactions yet)');
  } else if (diff === 0) {
    logSuccess(`Accounting balanced: Debits=${debits}, Credits=${credits}`);
  } else {
    logWarning(`Accounting NOT balanced: Debits=${debits}, Credits=${credits}, Difference=${diff}`);
  }

  return {
    tables: tableCount === 27,
    views: viewCount === 4,
    functions: functionCount === 9,
    charges: chargeCount === 57,
    campaigns: campaignCount === 10,
    accounts: accountCount === 40,
    types: typeCount === 10
  };
}

async function deploy() {
  log('═══════════════════════════════════════', 'bright');
  log('NEON DATABASE DEPLOYMENT', 'bright');
  log('═══════════════════════════════════════', 'bright');
  log('');

  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    // Connect
    logInfo('Connecting to Neon PostgreSQL...');
    await client.connect();
    logSuccess('Connected to Neon PostgreSQL');

    // Check version
    const version = await client.query('SELECT version()');
    logInfo(`PostgreSQL Version: ${version.rows[0].version.split(' ')[1]}`);
    log('');

    // Run migrations
    log('═══════════════════════════════════════', 'bright');
    log('RUNNING MIGRATIONS', 'bright');
    log('═══════════════════════════════════════', 'bright');

    for (let i = 0; i < migrations.length; i++) {
      log(`\n[${i + 1}/${migrations.length}] ${migrations[i]}`, 'yellow');
      await runMigration(client, migrations[i]);
    }

    // Verify
    const results = await verify(client);

    // Summary
    log('\n═══════════════════════════════════════', 'bright');
    log('DEPLOYMENT COMPLETE', 'bright');
    log('═══════════════════════════════════════', 'bright');
    log('');

    const allPassed = Object.values(results).every(v => v === true);

    if (allPassed) {
      logSuccess('All verification checks passed!');
      log('');
      log('🎉 Database is ready for use!', 'green');
      log('');
      log('Next steps:', 'cyan');
      log('  1. Run: node test-workflow.js "connection-string"', 'cyan');
      log('  2. Configure backend/.env with DATABASE_URL', 'cyan');
      log('  3. Run: cd backend && npx tsx test-db-connection.ts', 'cyan');
      log('');
    } else {
      logWarning('Some verification checks failed. Review output above.');
      log('');
      log('Troubleshooting:', 'yellow');
      log('  - Check migration file paths', 'yellow');
      log('  - Review error messages above', 'yellow');
      log('  - Try running migrations individually', 'yellow');
      log('');
    }

    await client.end();
    process.exit(allPassed ? 0 : 1);

  } catch (error) {
    logError('Deployment failed!');
    log('');
    console.error(error);
    log('');
    log('Troubleshooting:', 'yellow');
    log('  1. Verify connection string is correct', 'yellow');
    log('  2. Check network connection', 'yellow');
    log('  3. Ensure Neon project is active', 'yellow');
    log('  4. See NEON_DEPLOYMENT_STEPS.md for help', 'yellow');
    log('');

    await client.end();
    process.exit(1);
  }
}

// Run deployment
deploy();
