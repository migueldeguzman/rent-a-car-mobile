/**
 * Final Deployment Script - Comprehensive deployment with proper error handling
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('❌ Connection string required!');
  console.log('\nUsage: node deploy-final.js "postgres://connection-string"');
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
    console.error(`✗ ${description}: ${error.message}`);
    return false;
  }
}

async function deploy() {
  console.log('═══════════════════════════════════════');
  console.log('VESLA RENTAL APP - DATABASE DEPLOYMENT');
  console.log('═══════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    // Connect
    await client.connect();
    console.log('✓ Connected to Neon PostgreSQL\n');

    // Step 1: Enable UUID extension
    console.log('[Step 1/6] Enabling UUID extension...');
    await executeSQL(client, 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp"', 'UUID extension');

    // Step 2: Create helper function
    console.log('\n[Step 2/6] Creating helper function...');
    const functionSQL = `
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;
    `;
    await executeSQL(client, functionSQL, 'update_updated_at_column() function');

    // Step 3: Create core tables
    console.log('\n[Step 3/6] Creating core tables...');
    const coreSQL = fs.readFileSync(path.join(__dirname, 'neon-schema.sql'), 'utf8');
    await executeSQL(client, coreSQL, 'Core tables');

    // Step 4: Create charge types
    console.log('\n[Step 4/6] Creating charge types system...');
    const chargeSQL = fs.readFileSync(path.join(__dirname, 'charge_types_table.sql'), 'utf8');
    await executeSQL(client, chargeSQL, 'Charge types tables and data');

    // Step 5: Create campaigns
    console.log('\n[Step 5/6] Creating campaigns system...');
    const campaignSQL = fs.readFileSync(path.join(__dirname, 'campaigns_table.sql'), 'utf8');
    await executeSQL(client, campaignSQL, 'Campaign tables and data');

    // Step 6: Create accounting tables
    console.log('\n[Step 6/6] Creating accounting system...');
    const accountingSQL = fs.readFileSync(path.join(__dirname, 'accounting_tables_revised.sql'), 'utf8');
    await executeSQL(client, accountingSQL, 'Accounting tables');

    // Verification
    console.log('\n═══════════════════════════════════════');
    console.log('VERIFICATION');
    console.log('═══════════════════════════════════════\n');

    const tables = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`Total tables: ${tables.rows[0].count}`);

    // Check rental app specific tables
    const rentalTables = ['charge_types', 'campaigns', 'accounts', 'rental_agreements', 'ledger'];
    let found = 0;

    for (const table of rentalTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`✓ ${table}: ${result.rows[0].count} rows`);
        found++;
      } catch (e) {
        console.log(`✗ ${table}: Not found`);
      }
    }

    // Test helper function
    try {
      const test = await client.query("SELECT get_charge_amount('KNOWLEDGE_FEE') as amount");
      console.log(`✓ get_charge_amount() function: ${test.rows[0].amount} AED`);
    } catch (e) {
      console.log(`✗ get_charge_amount() function: ${e.message}`);
    }

    console.log('\n═══════════════════════════════════════');
    if (found === rentalTables.length) {
      console.log('✅ DEPLOYMENT SUCCESSFUL!');
      console.log('═══════════════════════════════════════\n');
      console.log('🎉 Rental app database is ready!\n');
      console.log('Next steps:');
      console.log('  1. node test-workflow.js "connection-string"');
      console.log('  2. Update backend/.env');
      console.log('  3. Test backend connection\n');
    } else {
      console.log('⚠️  DEPLOYMENT INCOMPLETE');
      console.log('═══════════════════════════════════════\n');
      console.log(`Found ${found}/${rentalTables.length} key tables.`);
      console.log('Some tables may not have been created.\n');
    }

    await client.end();
    process.exit(found === rentalTables.length ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Deployment failed:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

deploy();
