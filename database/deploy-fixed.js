/**
 * Fixed Neon Database Deployment Script
 * Handles SQL files with proper function/procedure parsing
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Connection string required!');
  process.exit(1);
}

const migrations = [
  'neon-schema.sql',
  'charge_types_table.sql',
  'campaigns_table.sql',
  'accounting_tables_revised.sql'
];

async function runSQLFile(client, filename) {
  const filepath = path.join(__dirname, filename);

  if (!fs.existsSync(filepath)) {
    throw new Error(`File not found: ${filename}`);
  }

  console.log(`\n[Running] ${filename}`);

  const sql = fs.readFileSync(filepath, 'utf8');

  // Execute entire file as one block - let PostgreSQL handle it
  try {
    await client.query(sql);
    console.log(`✓ Completed: ${filename}`);
  } catch (error) {
    console.error(`✗ Error in ${filename}:`, error.message);
    throw error;
  }
}

async function verify(client) {
  console.log('\n═══════════════════════════════════════');
  console.log('VERIFYING DEPLOYMENT');
  console.log('═══════════════════════════════════════\n');

  const checks = [];

  // Tables
  const tables = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
  `);
  const tableCount = parseInt(tables.rows[0].count);
  console.log(`Tables: ${tableCount} (Expected: 27) ${tableCount === 27 ? '✓' : '⚠'}`);
  checks.push(tableCount === 27);

  // Charge types
  try {
    const charges = await client.query('SELECT COUNT(*) as count FROM charge_types');
    const chargeCount = parseInt(charges.rows[0].count);
    console.log(`Charge Types: ${chargeCount} (Expected: 57) ${chargeCount === 57 ? '✓' : '⚠'}`);
    checks.push(chargeCount === 57);
  } catch (e) {
    console.log('Charge Types: Not found ✗');
    checks.push(false);
  }

  // Campaigns
  try {
    const campaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
    const campaignCount = parseInt(campaigns.rows[0].count);
    console.log(`Campaigns: ${campaignCount} (Expected: 10) ${campaignCount === 10 ? '✓' : '⚠'}`);
    checks.push(campaignCount === 10);
  } catch (e) {
    console.log('Campaigns: Not found ✗');
    checks.push(false);
  }

  // Accounts
  try {
    const accounts = await client.query('SELECT COUNT(*) as count FROM accounts');
    const accountCount = parseInt(accounts.rows[0].count);
    console.log(`Accounts: ${accountCount} (Expected: 40) ${accountCount === 40 ? '✓' : '⚠'}`);
    checks.push(accountCount === 40);
  } catch (e) {
    console.log('Accounts: Not found ✗');
    checks.push(false);
  }

  // Functions
  const functions = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.routines
    WHERE routine_schema = 'public' AND routine_type = 'FUNCTION'
  `);
  const funcCount = parseInt(functions.rows[0].count);
  console.log(`Functions: ${funcCount} (Expected: 9) ${funcCount === 9 ? '✓' : '⚠'}`);
  checks.push(funcCount === 9);

  // Views
  const views = await client.query(`
    SELECT COUNT(*) as count FROM information_schema.views WHERE table_schema = 'public'
  `);
  const viewCount = parseInt(views.rows[0].count);
  console.log(`Views: ${viewCount} (Expected: 4) ${viewCount === 4 ? '✓' : '⚠'}`);
  checks.push(viewCount === 4);

  return checks.every(c => c);
}

async function deploy() {
  console.log('═══════════════════════════════════════');
  console.log('NEON DATABASE DEPLOYMENT');
  console.log('═══════════════════════════════════════\n');

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('Connecting to Neon...');
    await client.connect();
    console.log('✓ Connected\n');

    // Enable UUID extension
    console.log('Enabling UUID extension...');
    await client.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
    console.log('✓ UUID extension enabled\n');

    console.log('═══════════════════════════════════════');
    console.log('RUNNING MIGRATIONS');
    console.log('═══════════════════════════════════════');

    for (const file of migrations) {
      await runSQLFile(client, file);
    }

    const success = await verify(client);

    console.log('\n═══════════════════════════════════════');
    if (success) {
      console.log('✓ DEPLOYMENT COMPLETE!');
      console.log('═══════════════════════════════════════\n');
      console.log('🎉 Database is ready!\n');
      console.log('Next: node test-workflow.js "connection-string"');
    } else {
      console.log('⚠ DEPLOYMENT COMPLETED WITH WARNINGS');
      console.log('═══════════════════════════════════════\n');
      console.log('Review output above for details.');
    }

    await client.end();
    process.exit(success ? 0 : 1);

  } catch (error) {
    console.error('\n✗ Deployment failed:', error.message);
    await client.end();
    process.exit(1);
  }
}

deploy();
