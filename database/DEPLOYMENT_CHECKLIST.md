# Deployment Checklist - Neon Database

Use this checklist to track your deployment progress.

---

## Pre-Deployment

- [ ] Review all migration files in `database/` folder
- [ ] Read `DATABASE_SETUP_COMPLETE.md` for overview
- [ ] Read `NEON_DEPLOYMENT_STEPS.md` for detailed instructions
- [ ] Have PostgreSQL client ready (psql or pgAdmin)

---

## Neon Account Setup

- [ ] Create account at https://neon.tech
- [ ] Verify email address
- [ ] Log in to Neon console

---

## Database Creation

- [ ] Click "New Project" in Neon console
- [ ] Set project name: `vesla-rent-a-car`
- [ ] Set database name: `vesla_rental_db`
- [ ] Choose region (closest to you)
- [ ] Select PostgreSQL version 16
- [ ] Click "Create Project"
- [ ] Copy **Direct Connection** string
- [ ] Save connection string securely (NOT in Git!)

---

## Connection String Storage

- [ ] Create `backend/.env` file (if doesn't exist)
- [ ] Add `DATABASE_URL="postgres://..."` to `.env`
- [ ] Verify `.env` is in `.gitignore`
- [ ] Test connection with psql:
  ```bash
  psql "postgres://your-connection-string"
  ```
- [ ] Exit psql with `\q`

---

## Migration Execution

**Option A: Master Script (Recommended)**
- [ ] Open terminal in `database/` folder
- [ ] Run: `psql "postgres://connection" -f run_all_migrations.sql`
- [ ] Wait for completion (~2-3 minutes)
- [ ] Review output for errors
- [ ] Verify "SETUP COMPLETE!" message appears

**Option B: Manual (One-by-one)**
- [ ] Run: `psql "postgres://connection" -f neon-schema.sql`
- [ ] Run: `psql "postgres://connection" -f charge_types_table.sql`
- [ ] Run: `psql "postgres://connection" -f campaigns_table.sql`
- [ ] Run: `psql "postgres://connection" -f accounting_tables_revised.sql`

---

## Verification

- [ ] Connect to database: `psql "postgres://connection"`
- [ ] Count tables: `SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';`
  - Expected: 27
- [ ] Count charge types: `SELECT COUNT(*) FROM charge_types;`
  - Expected: 57
- [ ] Count campaigns: `SELECT COUNT(*) FROM campaigns;`
  - Expected: 10
- [ ] Count accounts: `SELECT COUNT(*) FROM accounts;`
  - Expected: 40
- [ ] Test function: `SELECT get_charge_amount('KNOWLEDGE_FEE');`
  - Expected: 20.00
- [ ] Test function: `SELECT get_next_transaction_number('INVOICE');`
  - Expected: INV-000001
- [ ] Exit psql: `\q`

---

## Sample Data Test

- [ ] Run: `psql "postgres://connection" -f test_complete_workflow.sql`
- [ ] Review output for errors
- [ ] Verify "WORKFLOW TEST COMPLETE!" message
- [ ] Check trial balance shows balanced entries
- [ ] Confirm debits = credits

---

## Backend Configuration

- [ ] Verify `backend/.env` has `DATABASE_URL`
- [ ] Add other environment variables:
  - [ ] `JWT_SECRET` (generate random string)
  - [ ] `PORT=3001`
  - [ ] `NODE_ENV=development`
  - [ ] `CORS_ORIGINS` (your frontend URLs)
- [ ] Install pg package: `npm install pg dotenv`
- [ ] Copy `test-db-connection.ts` to `backend/` folder
- [ ] Run test: `cd backend && npx tsx test-db-connection.ts`
- [ ] Verify all tests pass

---

## Neon Console Setup

- [ ] Log in to https://console.neon.tech
- [ ] Select your project
- [ ] Enable Query Statistics in Monitoring tab
- [ ] Explore SQL Editor (run test queries)
- [ ] Review project settings
- [ ] Note: Backups are automatic (no setup needed)

---

## Security Checklist

- [ ] `.env` file is in `.gitignore`
- [ ] No connection strings in Git commits
- [ ] No passwords in source code
- [ ] SSL mode is `require` in connection string
- [ ] Database user has minimal required permissions
- [ ] Review Neon project access controls

---

## Optional: Create Database Branches

- [ ] Create `dev` branch in Neon console
- [ ] Create `staging` branch in Neon console
- [ ] Save separate connection strings for each branch
- [ ] Update `.env.development` and `.env.staging`

---

## Documentation Review

- [ ] Read `QUICK_REFERENCE.md` for common queries
- [ ] Bookmark `ACCOUNTING_SYSTEM_GUIDE.md` for accounting examples
- [ ] Review `CAMPAIGNS_GUIDE.md` for campaign usage
- [ ] Keep `DATABASE_SETUP_COMPLETE.md` handy for implementation guide

---

## Post-Deployment

- [ ] Create database backup manually (optional):
  ```bash
  pg_dump "postgres://connection" > backup_initial.sql
  ```
- [ ] Document connection string in password manager
- [ ] Share access with team members (via Neon console)
- [ ] Set up monitoring alerts (Neon console)
- [ ] Plan regular backup schedule

---

## Next Phase: Backend Development

- [ ] Create `src/services/charge.service.ts`
- [ ] Create `src/services/campaign.service.ts`
- [ ] Create `src/services/pricing.service.ts`
- [ ] Create `src/services/accounting.service.ts`
- [ ] Create `src/services/agreement.service.ts`
- [ ] Create `src/services/invoice.service.ts`
- [ ] Create API routes for each service
- [ ] Write unit tests
- [ ] Write integration tests

---

## Troubleshooting

If you encounter issues, refer to:
- `NEON_DEPLOYMENT_STEPS.md` - Detailed troubleshooting section
- Neon Discord: https://discord.gg/92vNTzKDGp
- Neon Docs: https://neon.tech/docs

Common issues:
- Connection timeout → Check firewall, SSL settings
- Authentication failed → Verify password, check connection string
- Tables not found → Run migrations first
- Functions missing → Ensure all 4 migration files ran

---

## Success Criteria

✅ All checkboxes above are marked
✅ All verification queries pass
✅ Backend test connection succeeds
✅ Sample workflow test completes
✅ Trial balance is balanced (debits = credits)
✅ No errors in Neon console

**You're ready to proceed with backend development!**

---

*Deployment Date: __________*
*Deployed By: __________*
*Neon Project ID: __________*
*Connection String Stored: __________*
