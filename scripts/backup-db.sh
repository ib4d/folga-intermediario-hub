#!/usr/bin/env bash
set -euo pipefail

# Docker-aware PostgreSQL backup for ORI CRUIT HUB on Hostinger VPS.
# Usage from repo root: ./scripts/backup-db.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_USER="${DB_USER:-folga}"
DB_NAME="${DB_NAME:-folga_hub}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="$(date +"%Y%m%d-%H%M%S")"
BACKUP_FILE="${BACKUP_DIR}/oricruithub-${DB_NAME}-${TIMESTAMP}.sql"

mkdir -p "${BACKUP_DIR}"

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "Starting database backup..."
echo "Compose file: ${COMPOSE_FILE}"
echo "Database: ${DB_NAME}"
echo "Output: ${BACKUP_FILE}"

docker compose -f "${COMPOSE_FILE}" exec -T db pg_dump -U "${DB_USER}" -d "${DB_NAME}" > "${BACKUP_FILE}"

if [ ! -s "${BACKUP_FILE}" ]; then
  echo "Backup file is empty. Removing failed artifact." >&2
  rm -f "${BACKUP_FILE}"
  exit 1
fi

gzip -f "${BACKUP_FILE}"
echo "Backup successful: ${BACKUP_FILE}.gz"

find "${BACKUP_DIR}" -type f -name "oricruithub-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "Backups older than ${RETENTION_DAYS} days cleaned up."
