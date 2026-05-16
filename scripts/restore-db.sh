#!/usr/bin/env bash
set -euo pipefail

# Docker-aware PostgreSQL restore for ORI CRUIT HUB on Hostinger VPS.
# Usage from repo root: ./scripts/restore-db.sh ./backups/file.sql.gz

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.sql|backup.sql.gz>" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_USER="${DB_USER:-folga}"
DB_NAME="${DB_NAME:-folga_hub}"
BACKUP_FILE="$1"

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

echo "This will restore ${BACKUP_FILE} into ${DB_NAME} and may overwrite existing data."
echo "Type RESTORE to continue:"
read -r confirmation

if [ "${confirmation}" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

docker compose -f "${COMPOSE_FILE}" stop web

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  gunzip -c "${BACKUP_FILE}" | docker compose -f "${COMPOSE_FILE}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}"
else
  docker compose -f "${COMPOSE_FILE}" exec -T db psql -U "${DB_USER}" -d "${DB_NAME}" < "${BACKUP_FILE}"
fi

docker compose -f "${COMPOSE_FILE}" start web
echo "Restore completed."
