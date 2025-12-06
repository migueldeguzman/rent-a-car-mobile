/**
 * Migration Script: Add Identity Fields to Customers Table
 *
 * This script adds drivers_id, emirates_id, and is_tourist fields
 * to the customers table in Neon database
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const connectionString = process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_sS6Le8DNvBqx@ep-still-recipe-a9gv66gx-pooler.gwc.azure.neon.tech/neondb?sslmode=require';

async function runMigration() {
  const client = new Client({ connectionString });

  try {
    console.log('🔌 Connecting to Neon database...');
    await client.connect();
    console.log('✅ Connected successfully!');

    // Read migration SQL file
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'add_customer_identity_fields.sql'),
      'utf8'
    );

    console.log('\n📋 Executing migration: Add Customer Identity Fields');
    console.log('━'.repeat(60));

    // Execute migration
    await client.query(migrationSQL);

    console.log('✅ Migration completed successfully!');
    console.log('\n📊 Verifying changes...');

    // Verify the new columns were added
    const verifyQuery = `
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'customers'
      AND column_name IN ('drivers_id', 'emirates_id', 'is_tourist')
      ORDER BY column_name;
    `;

    const result = await client.query(verifyQuery);

    if (result.rows.length === 3) {
      console.log('✅ All 3 columns added successfully:');
      console.log('');
      result.rows.forEach(row => {
        console.log(`  • ${row.column_name}`);
        console.log(`    - Type: ${row.data_type}`);
        console.log(`    - Nullable: ${row.is_nullable}`);
        console.log(`    - Default: ${row.column_default || 'NULL'}`);
        console.log('');
      });
    } else {
      console.log('⚠️  Warning: Expected 3 columns, found:', result.rows.length);
      console.log(result.rows);
    }

    // Verify indexes were created
    console.log('📋 Verifying indexes...');
    const indexQuery = `
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'customers'
      AND indexname IN ('idx_customers_drivers_id', 'idx_customers_emirates_id', 'idx_customers_is_tourist')
      ORDER BY indexname;
    `;

    const indexResult = await client.query(indexQuery);

    if (indexResult.rows.length === 3) {
      console.log('✅ All 3 indexes created successfully:');
      indexResult.rows.forEach(row => {
        console.log(`  • ${row.indexname}`);
      });
    } else {
      console.log('⚠️  Warning: Expected 3 indexes, found:', indexResult.rows.length);
      console.log(indexResult.rows);
    }

    console.log('\n' + '━'.repeat(60));
    console.log('🎉 Migration completed and verified!');
    console.log('\nNew fields added to customers table:');
    console.log('  1. drivers_id (VARCHAR(100))    - Driver License ID/Number');
    console.log('  2. emirates_id (VARCHAR(100))   - Emirates ID (residents only)');
    console.log('  3. is_tourist (BOOLEAN)         - Tourist flag (default: false)');
    console.log('');

  } catch (error) {
    console.error('\n❌ Migration failed!');
    console.error('Error:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
    console.log('🔌 Database connection closed');
  }
}

// Run migration
runMigration().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
