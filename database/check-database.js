/**
 * Check current database state
 */

const { Client } = require('pg');

const connectionString = process.argv[2] || process.env.DATABASE_URL;

async function check() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected\n');

    // List all tables
    const tables = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `);

    console.log(`Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

    // Check if our key tables exist
    console.log('\nChecking key tables:');

    const keyTables = ['charge_types', 'campaigns', 'accounts', 'ledger', 'rental_agreements'];
    for (const table of keyTables) {
      try {
        const result = await client.query(`SELECT COUNT(*) as count FROM ${table}`);
        console.log(`  ✓ ${table}: ${result.rows[0].count} rows`);
      } catch (e) {
        console.log(`  ✗ ${table}: Not found`);
      }
    }

    await client.end();
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

check();
