# Database Backups

This folder stores database backup files.

## Automatic Backups (Neon)

Neon provides automatic backups:
- **Point-in-time recovery (PITR)** - Restore to any point in last 7 days (free tier)
- No setup required
- Access via Neon console → Project → Restore

## Manual Backups

### Create Backup

```bash
# Full backup
pg_dump "postgres://your-neon-connection" > backups/backup_$(date +%Y%m%d_%H%M%S).sql

# Compressed backup
pg_dump "postgres://your-neon-connection" | gzip > backups/backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Schema only (no data)
pg_dump --schema-only "postgres://connection" > backups/schema_$(date +%Y%m%d_%H%M%S).sql

# Data only (no schema)
pg_dump --data-only "postgres://connection" > backups/data_$(date +%Y%m%d_%H%M%S).sql
```

### Restore Backup

```bash
# Restore full backup
psql "postgres://your-neon-connection" < backups/backup_20251205_120000.sql

# Restore compressed backup
gunzip -c backups/backup_20251205_120000.sql.gz | psql "postgres://connection"

# Restore specific table
pg_restore -t vehicles backups/backup_20251205_120000.sql
```

## Backup Schedule (Recommended)

- **Daily:** Automated via Neon (already active)
- **Weekly:** Manual backup before major changes
- **Before migrations:** Always backup before running new migrations
- **Before production deployment:** Full backup with data

## Backup Retention

- Keep last 7 daily backups
- Keep last 4 weekly backups
- Keep monthly backups for 1 year
- Archive old backups to cloud storage (AWS S3, Google Drive, etc.)

## Security

- **⚠️ IMPORTANT:** Backup files are in `.gitignore`
- Never commit backup files to Git
- Store backups in secure location
- Encrypt backups if storing externally

## File Naming Convention

```
backup_YYYYMMDD_HHMMSS.sql          # Full backup
schema_YYYYMMDD_HHMMSS.sql          # Schema only
data_YYYYMMDD_HHMMSS.sql            # Data only
backup_YYYYMMDD_HHMMSS.sql.gz       # Compressed
before_migration_YYYYMMDD.sql       # Pre-migration backup
```

---

*Backup files in this directory are gitignored for security*
