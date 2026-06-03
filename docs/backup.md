# Backup and Restore - ORI CRUIT HUB

Production data lives in two places:

- PostgreSQL in Docker on the Hostinger VPS.
- Supabase Storage for uploaded candidate documents.

## PostgreSQL Backup

Run from the repository root on the VPS:

```bash
chmod +x scripts/backup-db.sh
./scripts/backup-db.sh
```

The script uses `docker compose -f docker-compose.prod.yml exec -T db pg_dump`,
writes to `./backups`, compresses the SQL dump, and removes backups older than
30 days.

Optional environment overrides:

```bash
BACKUP_DIR=/var/backups/ori-cruit-hub RETENTION_DAYS=14 ./scripts/backup-db.sh
```

## Daily Cron

Create the backup directory first:

```bash
mkdir -p /var/backups/ori-cruit-hub
```

Then add a cron entry:

```bash
crontab -e
```

```cron
0 2 * * * cd /path/to/folga-intermediario-hub && BACKUP_DIR=/var/backups/ori-cruit-hub ./scripts/backup-db.sh >> /var/log/ori-cruit-hub-backup.log 2>&1
```

## Restore Drill

Restore must be done during a planned recovery window:

```bash
chmod +x scripts/restore-db.sh
./scripts/restore-db.sh /var/backups/ori-cruit-hub/oricruithub-folga_hub-YYYYMMDD-HHMMSS.sql.gz
```

The restore script stops the web container, asks for explicit `RESTORE`
confirmation, restores through the Docker Postgres container, and starts the web
container again.

### Restore Validation

You can also run a non-destructive restore drill against a temporary database
from the repository root on the VPS. The helper will automatically pick the
latest `.sql` or `.sql.gz` backup from `./backups` or
`/var/backups/ori-cruit-hub` unless you provide an explicit file:

```bash
./scripts/check-restore.mjs
```

If you want to include the drill in the production hardening gate, run:

```bash
CHECK_HARDENING_RUN_RESTORE=true npm run check:hardening
```

Use this on the VPS host, not inside `docker compose exec`. The helper needs
access to the host-side `docker-compose.prod.yml` file.

## Supabase Storage

Document files remain in Supabase Storage for v1. For production:

- Confirm the `SUPABASE_STORAGE_BUCKET` bucket exists.
- Enable Supabase project backups/versioning features available on the selected
  Supabase plan.
- Keep the service role key server-side only.

## Production Rule

Deployment is not distribution-ready until at least one backup and restore drill
has been performed successfully on a non-production clone or isolated test
database.
