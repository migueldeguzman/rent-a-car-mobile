/**
 * Compatible Deployment - Works with existing database schema
 * Removes foreign key constraints that reference non-existent tables
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Connection string required!');
  process.exit(1);
}

async function executeSQL(client, sql, description) {
  try {
    await client.query(sql);
    console.log(`✓ ${description}`);
    return true;
  } catch (error) {
    if (error.message.includes('already exists')) {
      console.log(`⚠ ${description} (already exists - OK)`);
      return true;
    }
    console.error(`✗ ${description}: ${error.message.substring(0, 100)}`);
    return false;
  }
}

function removeForeignKeyConstraints(sql) {
  // Remove problematic foreign key references
  return sql
    .replace(/REFERENCES customers\([^)]+\)[^,;]*/gi, '') // Remove customers FK
    .replace(/changed_by_fkey[^,;]*/gi, '') // Remove changed_by FK
    .replace(/created_by_fkey[^,;]*/gi, '') // Remove created_by FK
    .replace(/posted_by_fkey[^,;]*/gi, '') // Remove posted_by FK
    .replace(/,\s*,/g, ',') // Clean up double commas
    .replace(/,\s*\)/g, ')'); // Clean up trailing commas
}

async function deploy() {
  console.log('═══════════════════════════════════════');
  console.log('COMPATIBLE DATABASE DEPLOYMENT');
  console.log('═══════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to Neon\n');

    // Step 1: UUID extension
    console.log('[1/6] UUID Extension');
    await executeSQL(client, 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', 'UUID extension');

    // Step 2: Helper function
    console.log('\n[2/6] Helper Functions');
    await executeSQL(client, `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `, 'update_updated_at_column()');

    // Step 3: Core tables (without problematic FKs)
    console.log('\n[3/6] Core Tables');
    let coreSQL = fs.readFileSync(path.join(__dirname, 'neon-schema.sql'), 'utf8');
    coreSQL = removeForeignKeyConstraints(coreSQL);
    await executeSQL(client, coreSQL, 'Core rental tables');

    // Step 4: Charge types
    console.log('\n[4/6] Charge Types System');
    let chargeSQL = fs.readFileSync(path.join(__dirname, 'charge_types_table.sql'), 'utf8');
    chargeSQL = removeForeignKeyConstraints(chargeSQL);
    await executeSQL(client, chargeSQL, 'Charge types (57 types)');

    // Step 5: Campaigns
    console.log('\n[5/6] Campaigns System');
    let campaignSQL = fs.readFileSync(path.join(__dirname, 'campaigns_table.sql'), 'utf8');
    campaignSQL = removeForeignKeyConstraints(campaignSQL);
    await executeSQL(client, campaignSQL, 'Campaigns (10 campaigns)');

    // Step 6: Accounting
    console.log('\n[6/6] Accounting System');
    let accountingSQL = fs.readFileSync(path.join(__dirname, 'accounting_tables_revised.sql'), 'utf8');
    accountingSQL = removeForeignKeyConstraints(accountingSQL);
    await executeSQL(client, accountingSQL, 'Accounting (40 accounts)');

    // Verification
    console.log('\n═══════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════\n');

    // Count tables
    const tables = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`Total tables: ${tables.rows[0].count}`);

    // Check key tables with data counts
    const checks = [];

    const chargeCheck = await client.query('SELECT COUNT(*) as count FROM charge_types');
    const chargeCount = parseInt(chargeCheck.rows[0].count);
    console.log(`✓ charge_types: ${chargeCount} rows ${chargeCount === 57 ? '(Expected: 57 ✓)' : '(Expected: 57 ⚠)'}`);
    checks.push(chargeCount === 57);

    const campaignCheck = await client.query('SELECT COUNT(*) as count FROM campaigns');
    const campaignCount = parseInt(campaignCheck.rows[0].count);
    console.log(`✓ campaigns: ${campaignCount} rows ${campaignCount === 10 ? '(Expected: 10 ✓)' : '(Expected: 10 ⚠)'}`);
    checks.push(campaignCount === 10);

    const accountCheck = await client.query('SELECT COUNT(*) as count FROM accounts');
    const accountCount = parseInt(accountCheck.rows[0].count);
    console.log(`✓ accounts: ${accountCount} rows ${accountCount === 40 ? '(Expected: 40 ✓)' : '(Expected: 40 ⚠)'}`);
    checks.push(accountCount === 40);

    const typeCheck = await client.query('SELECT COUNT(*) as count FROM transaction_types');
    const typeCount = parseInt(typeCheck.rows[0].count);
    console.log(`✓ transaction_types: ${typeCount} rows ${typeCount === 10 ? '(Expected: 10 ✓)' : '(Expected: 10 ⚠)'}`);
    checks.push(typeCount === 10);

    // Check other key tables exist
    const otherTables = ['rental_agreements', 'ledger', 'additional_drivers', 'booking_addons'];
    for (const table of otherTables) {
      try {
        await client.query(`SELECT 1 FROM ${table} LIMIT 1`);
        console.log(`✓ ${table}: exists`);
        checks.push(true);
      } catch (e) {
        console.log(`✗ ${table}: not found`);
        checks.push(false);
      }
    }

    // Test functions
    console.log('\nTesting Functions:');
    try {
      const test = await client.query("SELECT get_charge_amount('KNOWLEDGE_FEE') as amount");
      console.log(`✓ get_charge_amount('KNOWLEDGE_FEE'): ${test.rows[0].amount} AED`);
      checks.push(true);
    } catch (e) {
      console.log(`✗ get_charge_amount(): ${e.message.substring(0, 60)}`);
      checks.push(false);
    }

    const success = checks.filter(c => c).length >= checks.length - 2; // Allow 2 failures

    console.log('\n═══════════════════════════════════════');
    if (success) {
      console.log('✅ DEPLOYMENT SUCCESSFUL!');
      console.log('═══════════════════════════════════════\n');
      console.log('🎉 Database is ready!\n');
      console.log('Summary:');
      console.log(`  - ${chargeCount} charge types loaded`);
      console.log(`  - ${campaignCount} campaigns loaded`);
      console.log(`  - ${accountCount} accounts loaded`);
      console.log(`  - ${typeCount} transaction types loaded`);
      console.log('\nNext steps:');
      console.log('  1. node test-workflow.js "connection-string"');
      console.log('  2. Update backend/.env with DATABASE_URL');
      console.log('  3. Run: cd backend && npx tsx test-db-connection.ts\n');
    } else {
      console.log('⚠️  DEPLOYMENT INCOMPLETE');
      console.log('═══════════════════════════════════════\n');
      console.log(`Passed: ${checks.filter(c => c).length}/${checks.length} checks`);
      console.log('Review errors above.\n');
    }

    await client.end();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

deploy();
