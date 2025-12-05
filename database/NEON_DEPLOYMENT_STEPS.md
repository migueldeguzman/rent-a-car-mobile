# Neon Database Deployment - Step-by-Step Guide

## Prerequisites

- A Neon account (free tier available)
- PostgreSQL client installed (psql or pgAdmin)
- All migration files ready in this directory

---

## Step 1: Create Neon Account and Database

### 1.1 Sign Up for Neon

1. Go to https://neon.tech
2. Click "Sign Up" (free tier available - no credit card required)
3. Sign up with:
   - GitHub account (recommended), or
   - Google account, or
   - Email/password

### 1.2 Create New Project

1. After login, click **"New Project"** button
2. Configure project:
   - **Project Name:** `vesla-rent-a-car`
   - **Database Name:** `vesla_rental_db`
   - **Region:** Choose closest to your location (e.g., AWS US East, AWS EU Central)
   - **PostgreSQL Version:** 16 (latest)
   - **Compute Size:** Free tier (0.25 vCPU, 1 GB RAM) - sufficient for development

3. Click **"Create Project"**

### 1.3 Get Connection String

After project creation, Neon displays your connection details:

**You'll see two connection strings:**

1. **Pooled Connection** (recommended for serverless/API):
   ```
   postgres://[user]:[password]@[host]/[dbname]?sslmode=require
   ```

2. **Direct Connection** (for migrations and admin tasks):
   ```
   postgres://[user]:[password]@[host]/[dbname]?sslmode=require
   ```

**Important:** Copy the **Direct Connection** string for migrations.

**Example:**
```
postgres://vesla_user:AbCdEf12345@ep-cool-cloud-12345.us-east-2.aws.neon.tech/vesla_rental_db?sslmode=require
```

---

## Step 2: Save Connection String

### Option A: Using .env File (Recommended)

Create or update `backend/.env`:

```env
# Neon PostgreSQL Database
DATABASE_URL="postgres://vesla_user:AbCdEf12345@ep-cool-cloud-12345.us-east-2.aws.neon.tech/vesla_rental_db?sslmode=require"

# Alternative format (if using separate variables)
DB_HOST=ep-cool-cloud-12345.us-east-2.aws.neon.tech
DB_PORT=5432
DB_NAME=vesla_rental_db
DB_USER=vesla_user
DB_PASSWORD=AbCdEf12345
DB_SSL=true
```

### Option B: Save to Secure Location

Create a file: `database/.neon-connection` (add to .gitignore!)

```
postgres://vesla_user:AbCdEf12345@ep-cool-cloud-12345.us-east-2.aws.neon.tech/vesla_rental_db?sslmode=require
```

**Security Note:** Never commit connection strings to Git!

Add to `.gitignore`:
```
.env
.env.*
.neon-connection
*connection-string.txt
```

---

## Step 3: Test Connection

### Using psql (Command Line)

```bash
# Test connection
psql "postgres://your-connection-string-here"

# You should see:
# psql (16.x)
# SSL connection (protocol: TLSv1.3, cipher: TLS_AES_128_GCM_SHA256, compression: off)
# Type "help" for help.
#
# vesla_rental_db=>

# Test query
SELECT version();

# Exit
\q
```

### Using pgAdmin 4 (GUI)

1. Open pgAdmin 4
2. Right-click "Servers" → "Register" → "Server"
3. **General Tab:**
   - Name: `Neon - Vesla Rental`
4. **Connection Tab:**
   - Host: `ep-cool-cloud-12345.us-east-2.aws.neon.tech`
   - Port: `5432`
   - Database: `vesla_rental_db`
   - Username: `vesla_user`
   - Password: `AbCdEf12345`
   - SSL Mode: `Require`
5. Click "Save"
6. Connect and verify you see the database

---

## Step 4: Run Migrations

### Using Master Migration Script (Recommended)

```bash
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile\database

# Run all migrations at once
psql "postgres://your-connection-string-here" -f run_all_migrations.sql

# Expected output:
# =====================================================
# VESLA RENT A CAR - COMPLETE DATABASE SETUP
# =====================================================
#
# Step 1/4: Creating Core Schema...
# [... lots of CREATE TABLE statements ...]
#
# Step 2/4: Creating Charge Types System...
# [... INSERT statements for 57 charge types ...]
#
# Step 3/4: Creating Campaigns System...
# [... INSERT statements for 10 campaigns ...]
#
# Step 4/4: Creating Revised Accounting System...
# [... CREATE TABLE for accounting ...]
#
# =====================================================
# SETUP COMPLETE!
# =====================================================
#
# Verification:
# total_tables | description
# -------------+--------------------------------
#          27  | TOTAL TABLES (Expected: 27)
#
# total_charge_types | description
# -------------------+--------------------------------
#                 57 | TOTAL CHARGE TYPES (Expected: 57)
# [... more verification output ...]
```

### Manual Migration (Alternative)

If you want to run migrations one by one:

```bash
# Step 1: Core schema
psql "postgres://connection" -f neon-schema.sql

# Step 2: Charge types
psql "postgres://connection" -f charge_types_table.sql

# Step 3: Campaigns
psql "postgres://connection" -f campaigns_table.sql

# Step 4: Accounting (revised)
psql "postgres://connection" -f accounting_tables_revised.sql
```

---

## Step 5: Verify Setup

### Quick Verification

```bash
# Connect to database
psql "postgres://your-connection-string-here"
```

Run these queries:

```sql
-- 1. Count tables
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';
-- Expected: 27

-- 2. Count charge types
SELECT COUNT(*) as charge_count FROM charge_types;
-- Expected: 57

-- 3. Count campaigns
SELECT COUNT(*) as campaign_count FROM campaigns;
-- Expected: 10

-- 4. Count accounts
SELECT COUNT(*) as account_count FROM accounts;
-- Expected: 40

-- 5. Count transaction types
SELECT COUNT(*) as type_count FROM transaction_types;
-- Expected: 10

-- 6. List all tables
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- 7. Test helper functions
SELECT get_charge_amount('KNOWLEDGE_FEE');
-- Expected: 20.00

SELECT get_next_transaction_number('INVOICE');
-- Expected: INV-000001

-- 8. View sample charges
SELECT charge_code, charge_name, charge_category, amount
FROM charge_types
ORDER BY charge_category, charge_code
LIMIT 20;

-- 9. View sample campaigns
SELECT campaign_code, campaign_name, campaign_type, discount_value
FROM campaigns
WHERE is_active = TRUE;

-- 10. View chart of accounts
SELECT account_code, account_name, account_class, account_type
FROM accounts
ORDER BY account_code;
```

### Expected Table List

```
account_ledger_detail (view)
accounts
active_campaigns_summary (view)
activity_log
additional_drivers
agreement_drivers
agreement_line_items
booking_addons
bookings
campaign_bundles
campaign_performance (view)
campaign_usage
campaigns
charge_history
charge_types
companies
customers
invoice_line_items
invoices
ledger
rental_agreements
traffic_fines
transaction_types
trial_balance (view)
vehicle_damages
vehicles
```

---

## Step 6: Run Complete Workflow Test

This will create sample data and test the entire flow:

```bash
psql "postgres://your-connection-string-here" -f test_complete_workflow.sql
```

**What this does:**
1. Creates sample company (Vesla Rent A Car LLC)
2. Creates 2 sample vehicles (NISSAN SUNNY, TOYOTA LAND CRUISER)
3. Creates 1 test customer (Boniswa Khumalo)
4. Creates a 7-day booking with GPS addon
5. Converts booking to rental agreement
6. Generates monthly invoice
7. Creates accounting entries (invoice + security deposit)
8. Verifies debits = credits
9. Displays trial balance
10. Shows account ledger details

**Expected final output:**
```
LEDGER BALANCE CHECK
total_debits | total_credits | difference | status
-------------+---------------+------------+-----------
     1789.25 |       1789.25 |       0.00 | ✓ BALANCED

Trial Balance:
account_code | account_name                      | total_debit | total_credit | balance
-------------+-----------------------------------+-------------+--------------+---------
1102         | Bank - Current Account            |      976.50 |         0.00 |  976.50
1103         | Accounts Receivable - Customers   |      813.75 |         0.00 |  813.75
2102         | Security Deposit Liability        |        0.00 |       162.75 |  162.75
2103         | VAT Payable                       |        0.00 |        38.75 |   38.75
4101         | Rental Revenue - Vehicles         |        0.00 |       775.00 |  775.00
```

---

## Step 7: Configure Backend

### Update Backend .env

```env
# Database Connection
DATABASE_URL="postgres://your-neon-connection-string"

# JWT Secret (generate a secure random string)
JWT_SECRET="your-super-secret-jwt-key-here-min-32-chars"
JWT_EXPIRES_IN="7d"

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Origins (add your frontend URLs)
CORS_ORIGINS=http://localhost:5173,http://localhost:19000,http://localhost:8081

# App Configuration
APP_NAME="Vesla Rent-a-Car"
VAT_RATE=5
SECURITY_DEPOSIT_PERCENTAGE=20
```

### Test Backend Connection

Create `backend/src/test-db-connection.ts`:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('Testing Neon database connection...');

    // Test 1: Basic connection
    const client = await pool.connect();
    console.log('✓ Connected to Neon PostgreSQL');

    // Test 2: Query test
    const result = await client.query('SELECT NOW() as current_time');
    console.log('✓ Query executed:', result.rows[0].current_time);

    // Test 3: Count tables
    const tables = await client.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('✓ Table count:', tables.rows[0].table_count);

    // Test 4: Count charge types
    const charges = await client.query('SELECT COUNT(*) as count FROM charge_types');
    console.log('✓ Charge types:', charges.rows[0].count);

    // Test 5: Count campaigns
    const campaigns = await client.query('SELECT COUNT(*) as count FROM campaigns');
    console.log('✓ Campaigns:', campaigns.rows[0].count);

    // Test 6: Count accounts
    const accounts = await client.query('SELECT COUNT(*) as count FROM accounts');
    console.log('✓ Accounts:', accounts.rows[0].count);

    // Test 7: Test function
    const chargeAmount = await client.query(
      "SELECT get_charge_amount('KNOWLEDGE_FEE') as amount"
    );
    console.log('✓ Helper function works. Knowledge fee:', chargeAmount.rows[0].amount);

    client.release();

    console.log('\n🎉 All tests passed! Database is ready.');

    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();
```

Run test:
```bash
cd backend
npm install pg dotenv
npx tsx src/test-db-connection.ts
```

---

## Step 8: Neon Dashboard Monitoring

### Access Neon Console

1. Go to https://console.neon.tech
2. Select your project: `vesla-rent-a-car`
3. View:
   - **Monitoring** - Database usage, queries, connections
   - **SQL Editor** - Run queries directly in browser
   - **Branches** - Create dev/staging branches (Neon unique feature!)
   - **Settings** - Manage database settings

### Enable Query Monitoring

1. In Neon console, go to **Monitoring**
2. Enable **Query Statistics**
3. View slow queries, most frequent queries, etc.

---

## Step 9: Create Database Backups

### Option A: Neon Built-in Backups

Neon automatically creates backups:
- Point-in-time recovery (PITR)
- Restore to any point in last 7 days (free tier)
- Restore to any point in last 30 days (paid tier)

No setup needed!

### Option B: Manual Backup

```bash
# Backup to SQL file
pg_dump "postgres://your-connection-string" > backup_$(date +%Y%m%d_%H%M%S).sql

# Or use pg_dump with compressed output
pg_dump "postgres://your-connection-string" | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Option C: Scheduled Backups (Advanced)

Create a scheduled task (Windows Task Scheduler or cron):

**Windows:**
Create `backup-db.bat`:
```batch
@echo off
set BACKUP_DIR=C:\Users\DELL\vesla-audit\rent-a-car-mobile\database\backups
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%%time:~6,2%
set TIMESTAMP=%TIMESTAMP: =0%

pg_dump "postgres://your-connection-string" > "%BACKUP_DIR%\backup_%TIMESTAMP%.sql"

echo Backup created: backup_%TIMESTAMP%.sql
```

Schedule in Task Scheduler to run daily at 2 AM.

---

## Step 10: Create Database Branches (Optional - Neon Feature)

Neon allows you to create database branches for testing:

### Create Dev Branch

1. In Neon console, click **"Branches"**
2. Click **"Create Branch"**
3. Configure:
   - **Branch Name:** `dev`
   - **From Branch:** `main`
   - **Copy Data:** Yes (includes all data)
4. Click **"Create"**

You now have a separate dev database!

**Use cases:**
- Test migrations on dev branch first
- Test new features without affecting production
- Create branch per feature (like Git!)

---

## Troubleshooting

### Issue 1: Connection Timeout

**Error:**
```
psql: error: connection to server failed: timeout expired
```

**Solution:**
- Check if your firewall blocks port 5432
- Verify SSL mode is set to `require`
- Try from different network (some networks block PostgreSQL)

### Issue 2: SSL Error

**Error:**
```
SSL connection error: certificate verify failed
```

**Solution:**
Add `sslmode=require` to connection string:
```
postgres://user:pass@host/db?sslmode=require
```

Or disable SSL verification (not recommended for production):
```javascript
ssl: {
  rejectUnauthorized: false
}
```

### Issue 3: Password Authentication Failed

**Error:**
```
FATAL: password authentication failed for user "vesla_user"
```

**Solution:**
- Copy password exactly from Neon console (no extra spaces)
- Check if connection string is URL-encoded (special chars like @ need %40)
- Reset password in Neon console if needed

### Issue 4: Database Does Not Exist

**Error:**
```
FATAL: database "vesla_rental_db" does not exist
```

**Solution:**
- Verify database name in connection string matches Neon project
- Check if you're connecting to correct region
- Create database in Neon console if missing

### Issue 5: Too Many Connections

**Error:**
```
FATAL: sorry, too many clients already
```

**Solution:**
- Use **Pooled Connection** string instead of Direct
- Close idle connections in your code
- Upgrade to paid tier for more connections

---

## Next Steps After Deployment

✅ Database deployed to Neon
✅ All migrations run successfully
✅ Sample data inserted and tested

**Now proceed to:**

1. **Backend Services** - Create TypeScript services for:
   - `charge.service.ts`
   - `campaign.service.ts`
   - `pricing.service.ts`
   - `accounting.service.ts`
   - `agreement.service.ts`
   - `invoice.service.ts`

2. **API Endpoints** - Build REST routes
3. **Mobile App Integration** - Connect React Native to backend
4. **Admin Dashboard** - Build management UI

---

## Useful Neon Console URLs

- Dashboard: https://console.neon.tech/app/projects
- SQL Editor: https://console.neon.tech/app/projects/[project-id]/sql-editor
- Monitoring: https://console.neon.tech/app/projects/[project-id]/monitoring
- Branches: https://console.neon.tech/app/projects/[project-id]/branches
- Settings: https://console.neon.tech/app/projects/[project-id]/settings

---

## Support

**Neon Support:**
- Docs: https://neon.tech/docs
- Discord: https://discord.gg/92vNTzKDGp
- Email: support@neon.tech

**PostgreSQL Support:**
- Official Docs: https://www.postgresql.org/docs/
- Stack Overflow: https://stackoverflow.com/questions/tagged/postgresql

---

*Deployment Guide Version 1.0*
*Last Updated: 2025-12-05*
