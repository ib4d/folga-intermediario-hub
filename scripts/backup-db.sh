#!/usr/bin/env bash
set -euo pipefail

# Docker-aware PostgreSQL backup for ORI CRUIT HUB on Hostinger VPS.
# Usage from repo root: ./scripts/backup-db.sh

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_SERVICE="${DB_SERVICE:-db}"
DB_USER=""
DB_NAME=""
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ori-cruit-hub}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="${BACKUP_SET_ID:-$(date +"%Y%m%d-%H%M%S")}"

if [[ ! "${TIMESTAMP}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "BACKUP_SET_ID may contain only letters, numbers, hyphens, and underscores." >&2
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

COMPOSE_ENV=(env -i
  "HOME=${HOME:-/root}"
  "PATH=${PATH:-/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin}"
  "DOCKER_CONFIG=${DOCKER_CONFIG:-${HOME:-/root}/.docker}"
  docker compose -f "${COMPOSE_FILE}")

# Use the active container's initialized credentials. Ambient shell variables
# such as DB_USER can differ from the database volume and cause a false backup.
DB_USER="$("${COMPOSE_ENV[@]}" exec -T "${DB_SERVICE}" printenv POSTGRES_USER)"
DB_NAME="$("${COMPOSE_ENV[@]}" exec -T "${DB_SERVICE}" printenv POSTGRES_DB)"
if [ -z "${DB_USER}" ] || [ -z "${DB_NAME}" ]; then
  echo "Could not read the active PostgreSQL user and database from the Compose db service." >&2
  exit 1
fi

BACKUP_FILE="${BACKUP_DIR}/oricruithub-${DB_NAME}-${TIMESTAMP}.sql"
PARTIAL_FILE="${BACKUP_FILE}.partial"

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

cleanup() {
  rm -f "${PARTIAL_FILE}" "${PARTIAL_FILE}.gz" "${BACKUP_FILE}"
}
trap cleanup ERR
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

echo "Starting database backup..."
echo "Compose file: ${COMPOSE_FILE}"
echo "Database: ${DB_NAME}"
echo "Output: ${BACKUP_FILE}"

"${COMPOSE_ENV[@]}" exec -T "${DB_SERVICE}" pg_dump --clean --if-exists --no-owner --no-privileges -U "${DB_USER}" -d "${DB_NAME}" > "${PARTIAL_FILE}"

if [ ! -s "${PARTIAL_FILE}" ]; then
  echo "Backup file is empty. Removing failed artifact." >&2
  cleanup
  exit 1
fi

gzip -c "${PARTIAL_FILE}" > "${PARTIAL_FILE}.gz"
gzip -t "${PARTIAL_FILE}.gz"
chmod 600 "${PARTIAL_FILE}.gz"
mv "${PARTIAL_FILE}.gz" "${BACKUP_FILE}.gz"
rm -f "${PARTIAL_FILE}"
trap - ERR INT TERM
echo "Backup successful: ${BACKUP_FILE}.gz"

find "${BACKUP_DIR}" -type f -name "oricruithub-*.sql.gz" -mtime +"${RETENTION_DAYS}" -delete
echo "Backups older than ${RETENTION_DAYS} days cleaned up."
