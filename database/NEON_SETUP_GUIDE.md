# Neon Database Setup Guide - Vesla Rent A Car

## Step-by-Step Setup Instructions

### 1. Create Neon Account & Database

**1.1 Sign Up for Neon**
- Go to: https://neon.tech
- Click "Sign Up" (GitHub OAuth recommended)
- Verify email if required

**1.2 Create New Project**
- Click "Create Project"
- Project Name: `vesla-rent-a-car`
- Region: Choose closest to UAE (e.g., `AWS - eu-central-1` or `AWS - ap-southeast-1`)
- PostgreSQL Version: 15 or higher
- Click "Create Project"

**1.3 Get Connection String**

After project creation, you'll see connection details:

```
Host: ep-xxx-xxx.region.aws.neon.tech
Database: neondb
User: your-username
Password: your-password
```

**Connection String Format:**
```
postgres://username:password@host/database?sslmode=require
```

**Example:**
```
postgres://alex:AbC123xyz@ep-cool-darkness-123456.us-east-2.aws.neon.tech/neondb?sslmode=require
```

---

### 2. Run Database Migration

**Option A: Using Neon SQL Editor (Recommended)**

1. In Neon dashboard, go to "SQL Editor"
2. Open the file: `neon-schema.sql`
3. Copy entire contents
4. Paste into SQL Editor
5. Click "Run" (bottom right)
6. Wait for confirmation: "Query executed successfully"

**Option B: Using psql Command Line**

```bash
# Install PostgreSQL client if not already installed
# Windows: Download from https://www.postgresql.org/download/windows/
# Mac: brew install postgresql
# Linux: sudo apt-get install postgresql-client

# Navigate to database folder
cd C:\Users\DELL\vesla-audit\rent-a-car-mobile\database

# Run migration
psql "postgres://username:password@host/database?sslmode=require" -f neon-schema.sql
```

**Option C: Using Node.js Script**

Create `migrate.js`:
```javascript
const { Client } = require('pg');
const fs = require('fs');

const connectionString = process.env.DATABASE_URL ||
  'postgres://username:password@host/database?sslmode=require';

const client = new Client({ connectionString });

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to Neon database');

    const sql = fs.readFileSync('./neon-schema.sql', 'utf8');
    await client.query(sql);

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

migrate();
```

Run with:
```bash
npm install pg
node migrate.js
```

---

### 3. Verify Migration

**3.1 Check Tables Created**

In Neon SQL Editor, run:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Tables (24):**
- accounts
- activity_log
- additional_drivers
- agreement_drivers
- agreement_line_items
- booking_addons
- bookings
- companies
- customers
- invoice_line_items
- invoices
- payments
- rental_agreements
- traffic_fines
- transaction_lines
- transactions
- vehicle_damages
- vehicles

**3.2 Check Chart of Accounts**

```sql
SELECT account_code, account_name, account_type
FROM accounts
ORDER BY account_code;
```

**Expected Results (10 accounts):**
```
1100 | Cash/Bank | ASSET
1200 | Accounts Receivable - Customers | ASSET
1500 | Vehicles (Asset) | ASSET
2100 | Accounts Payable | LIABILITY
2200 | Security Deposit Liability | LIABILITY
2300 | VAT Payable | LIABILITY
4100 | Rental Revenue - Vehicles | REVENUE
4200 | Service Revenue - Add-ons | REVENUE
5100 | Vehicle Maintenance | EXPENSE
5200 | Insurance Expense | EXPENSE
```

**3.3 Check Indexes**

```sql
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

Should see indexes like:
- `idx_customers_email`
- `idx_vehicles_status`
- `idx_agreements_number`
- etc.

---

### 4. Insert Sample Data

**4.1 Create Sample Company (Vesla Branch)**

```sql
INSERT INTO companies (name, branch_name, address, city, country, phone, email) VALUES
('Vesla Rent A Car LLC', 'RAS AL KHOR', 'Ras Al Khor Industrial Area', 'Dubai', 'United Arab Emirates', '+971-4-1234567', 'info@veslamotors.com')
RETURNING id, name, branch_name;
```

**4.2 Create Sample Vehicle**

```sql
INSERT INTO vehicles (
    company_id,
    make,
    model,
    year,
    color,
    plate_number,
    vehicle_type,
    category,
    insurance_type,
    insurance_excess_amount,
    daily_rate,
    weekly_rate,
    monthly_rate,
    current_km,
    status
) VALUES (
    (SELECT id FROM companies WHERE branch_name = 'RAS AL KHOR' LIMIT 1),
    'NISSAN',
    'SUNNY',
    2019,
    'White',
    '98309-G',
    'SEDAN',
    'ECONOMY',
    'BASIC',
    2000.00,
    100.00,
    600.00,
    1800.00,
    56923,
    'AVAILABLE'
)
RETURNING id, make, model, plate_number, status;
```

**4.3 Create Test Customer**

```sql
INSERT INTO customers (
    first_name,
    last_name,
    nationality,
    id_type,
    id_number,
    id_issued_at,
    id_expiry_date,
    license_number,
    license_issued_at,
    license_issue_date,
    license_expiry_date,
    mobile_number,
    email,
    password_hash,
    role
) VALUES (
    'Test',
    'Customer',
    'United Arab Emirates',
    'EMIRATES_ID',
    '784-1234-5678901-2',
    'United Arab Emirates',
    '2027-12-31',
    'TEST123456',
    'United Arab Emirates',
    '2024-01-01',
    '2027-01-01',
    '+971501234567',
    'test@example.com',
    '$2b$10$abcdefghijklmnopqrstuvwxyz1234567890', -- This is a placeholder; use bcrypt in production
    'CUSTOMER'
)
RETURNING id, first_name, last_name, email;
```

---

### 5. Update Backend Configuration

**5.1 Backend .env File**

Update: `C:\Users\DELL\vesla-audit\client-app\rent-a-car-app\backend\.env`

```env
# Neon Database Connection
DATABASE_URL=postgres://username:password@host/database?sslmode=require

# Alternative format with individual variables
DB_HOST=ep-xxx-xxx.region.aws.neon.tech
DB_PORT=5432
DB_NAME=neondb
DB_USER=your-username
DB_PASSWORD=your-password
DB_SSL=true

# Server Configuration
PORT=3001
NODE_ENV=development

# JWT Secret
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# CORS Origins
CORS_ORIGIN=http://localhost:5173,http://localhost:19000,http://localhost:8085
```

**5.2 Backend Database Connection**

Update: `backend/src/models/database.ts`

Replace current PostgreSQL pool with Neon connection:

```typescript
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Neon connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  },
  max: 20, // Maximum connections
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  console.log('✅ Connected to Neon database');
});

pool.on('error', (err) => {
  console.error('❌ Unexpected database error:', err);
});

export default pool;
```

**5.3 Remove Old Database Initialization**

Since Neon database is already set up with schema, remove table creation logic from `database.ts`:

```typescript
// DELETE THIS SECTION (tables already exist in Neon)
// const createTables = async () => { ... }

// Keep only the pool export
export default pool;
```

---

### 6. Test Database Connection

**6.1 Create Test Script**

Create: `backend/src/scripts/test-connection.ts`

```typescript
import pool from '../models/database';

async function testConnection() {
  try {
    // Test basic connection
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful');
    console.log('Current time:', result.rows[0].now);

    // Test table count
    const tables = await pool.query(`
      SELECT COUNT(*) as table_count
      FROM information_schema.tables
      WHERE table_schema = 'public'
    `);
    console.log('✅ Tables in database:', tables.rows[0].table_count);

    // Test sample data
    const companies = await pool.query('SELECT * FROM companies LIMIT 1');
    console.log('✅ Sample company:', companies.rows[0]);

    const vehicles = await pool.query('SELECT * FROM vehicles LIMIT 1');
    console.log('✅ Sample vehicle:', vehicles.rows[0]);

    const accounts = await pool.query('SELECT COUNT(*) FROM accounts');
    console.log('✅ Chart of accounts entries:', accounts.rows[0].count);

    console.log('\n🎉 All tests passed!');
  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await pool.end();
  }
}

testConnection();
```

**6.2 Run Test**

```bash
cd C:\Users\DELL\vesla-audit\client-app\rent-a-car-app\backend
npx tsx src/scripts/test-connection.ts
```

**Expected Output:**
```
✅ Database connection successful
Current time: 2025-12-05T10:30:00.000Z
✅ Tables in database: 24
✅ Sample company: { id: '...', name: 'Vesla Rent A Car LLC', ... }
✅ Sample vehicle: { id: '...', make: 'NISSAN', model: 'SUNNY', ... }
✅ Chart of accounts entries: 10

🎉 All tests passed!
```

---

### 7. Update Mobile App API URL

**Mobile App .env (if using)**

Create: `C:\Users\DELL\vesla-audit\rent-a-car-mobile\.env`

```env
API_BASE_URL=http://localhost:3001/api
```

**Or update hardcoded URL in:**

`src/services/api.ts`:
```typescript
const API_BASE_URL = 'http://localhost:3001/api';
// Or for production: 'https://api.veslamotors.com/api'
```

---

### 8. Neon Database Best Practices

**8.1 Connection Pooling**
- Neon supports up to 100 connections on paid plans
- Use connection pooling (pg Pool) to reuse connections
- Set `max: 20` for development

**8.2 SSL/TLS**
- Always use `sslmode=require` in connection string
- Prevents man-in-the-middle attacks
- Required by Neon

**8.3 Branch Management (Optional)**
- Neon supports database branches (like Git)
- Create branch for testing: `main` → `staging` → `development`
- Safe experimentation without affecting production

**8.4 Backups**
- Neon auto-backs up every 24 hours
- Point-in-time recovery available on paid plans
- Download backup manually via dashboard

**8.5 Monitoring**
- Use Neon dashboard to monitor:
  - Query performance
  - Connection count
  - Storage usage
  - Error logs

---

### 9. Common Issues & Solutions

**Issue: "password authentication failed"**
```
Solution: Check connection string username/password
- Copy from Neon dashboard "Connection Details"
- Ensure no extra spaces in .env file
```

**Issue: "SSL connection required"**
```
Solution: Add ?sslmode=require to connection string
postgres://user:pass@host/db?sslmode=require
```

**Issue: "relation does not exist"**
```
Solution: Migration didn't run successfully
- Re-run neon-schema.sql in SQL Editor
- Check for error messages
- Verify all tables created with: SELECT * FROM information_schema.tables
```

**Issue: "too many connections"**
```
Solution: Reduce connection pool size
- Set max: 10 in pool configuration
- Ensure pool.end() is called when done
- Check for connection leaks
```

**Issue: "database does not exist"**
```
Solution: Use default database "neondb"
- Don't create custom database in Neon
- Use the auto-created "neondb"
```

---

### 10. Next Steps

**After successful setup:**

1. ✅ Database created on Neon
2. ✅ Schema migrated (24 tables)
3. ✅ Sample data inserted
4. ✅ Backend connected
5. ✅ Connection tested

**Now implement:**

1. **Backend Services** (Priority)
   - `agreement.service.ts` - Convert booking → agreement
   - `invoice.service.ts` - Generate monthly invoices
   - `accounting.service.ts` - Create journal entries

2. **API Endpoints**
   - `POST /api/bookings/:id/create-agreement`
   - `POST /api/agreements/:id/sign`
   - `POST /api/agreements/:id/activate`
   - `GET /api/agreements/:id/pdf`

3. **Scheduled Jobs**
   - Monthly invoice generator (node-cron)
   - Payment reminders
   - Agreement status updater

4. **Mobile App Updates**
   - Agreement signing screen
   - Digital signature capture
   - PDF viewer for agreement

---

## Quick Reference

**Neon Dashboard:** https://console.neon.tech
**Documentation:** https://neon.tech/docs
**SQL Editor:** https://console.neon.tech/app/projects/[project-id]/sql-editor
**Connection String:** `postgres://[user]:[pass]@[host]/[db]?sslmode=require`

**Database Name:** `neondb` (default)
**Tables Created:** 24
**Chart of Accounts:** 10 initial accounts
**Triggers:** 7 auto-update timestamp triggers

---

*Setup Guide Version: 1.0*
*Last Updated: 2025-12-05*
