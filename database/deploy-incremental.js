/**
 * Incremental Deployment - Adds only missing tables
 * Works alongside existing web-erp-app tables
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Connection string required!');
  process.exit(1);
}

async function runSQLFile(client, filename) {
  const filepath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filepath, 'utf8');

  console.log(`\n[Running] ${filename}`);

  // Remove DROP TABLE statements since we want to keep existing tables
  const sqlWithoutDrops = sql
    .split('\n')
    .filter(line => !line.trim().toUpperCase().startsWith('DROP TABLE'))
    .filter(line => !line.trim().toUpperCase().startsWith('DROP VIEW'))
    .filter(line => !line.trim().toUpperCase().startsWith('DROP FUNCTION'))
    .join('\n');

  try {
    await client.query(sqlWithoutDrops);
    console.log(`✓ Completed: ${filename}`);
    return true;
  } catch (error) {
    // Check if error is just "already exists" which is OK
    if (error.message.includes('already exists')) {
      console.log(`⚠ ${filename}: Some objects already exist (OK)`);
      return true;
    }
    console.error(`✗ Error in ${filename}:`, error.message);
    return false;
  }
}

async function verify(client) {
  console.log('\n═══════════════════════════════════════');
  console.log('VERIFYING DEPLOYMENT');
  console.log('═══════════════════════════════════════\n');

  // Count all tables
  const tables = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableCount = parseInt(tables.rows[0].count);
  console.log(`Total Tables: ${tableCount}`);

  // Check specific rental app tables
  const rentalTables = [
    'additional_drivers', 'agreement_drivers', 'agreement_line_items',
    'rental_agreements', 'booking_addons', 'traffic_fines',
    'vehicle_damages', 'charge_types', 'charge_history',
    'campaigns', 'campaign_usage', 'campaign_bundles',
    'accounts', 'transaction_types', 'ledger', 'activity_log'
  ];

  console.log('\nRental App Tables:');
  let foundCount = 0;
  for (const table of rentalTables) {
    try {
      const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
      console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
      foundCount++;
    } catch (e) {
      console.log(`  ✗ ${table}: Not found`);
    }
  }

  // Test functions
  console.log('\nTesting Functions:');
  try {
    const charge = await client.query("SELECT get_charge_amount('KNOWLEDGE_FEE') as amount");
    console.log(`  ✓ get_charge_amount(): ${charge.rows[0].amount} AED`);
  } catch (e) {
    console.log(`  ✗ get_charge_amount(): ${e.message}`);
  }

  return foundCount === rentalTables.length;
}

async function deploy() {
  console.log('═══════════════════════════════════════');
  console.log('INCREMENTAL NEON DEPLOYMENT');
  console.log('Adding Rental App Tables');
  console.log('═══════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected\n');

    // Enable UUID extension
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ UUID extension enabled');

    // List existing tables
    const existing = await client.query(`
      SELECT COUNT(*) as count FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);
    console.log(`Existing tables: ${existing.rows[0].count}\n`);

    console.log('═══════════════════════════════════════');
    console.log('RUNNING MIGRATIONS');
    console.log('═══════════════════════════════════════');

    const migrations = [
      'neon-schema.sql',
      'charge_types_table.sql',
      'campaigns_table.sql',
      'accounting_tables_revised.sql'
    ];

    for (const file of migrations) {
      await runSQLFile(client, file);
    }

    const success = await verify(client);

    console.log('\n═══════════════════════════════════════');
    if (success) {
      console.log('✓ DEPLOYMENT COMPLETE!');
      console.log('═══════════════════════════════════════\n');
      console.log('🎉 Rental app database is ready!\n');
      console.log('Next steps:');
      console.log('  1. node test-workflow.js "connection-string"');
      console.log('  2. Update backend/.env with DATABASE_URL');
      console.log('  3. Run backend connection test\n');
    } else {
      console.log('⚠ DEPLOYMENT COMPLETED WITH WARNINGS');
      console.log('═══════════════════════════════════════\n');
      console.log('Some tables may be missing. Check output above.');
    }

    await client.end();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n✗ Deployment failed:', error.message);
    console.error(error);
    await client.end();
    process.exit(1);
  }
}

deploy();
