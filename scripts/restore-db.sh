#!/usr/bin/env bash
set -euo pipefail

# Docker-aware PostgreSQL restore for ORI CRUIT HUB on Hostinger VPS.
# Usage from repo root: ./scripts/restore-db.sh ./backups/file.sql.gz

if [ "$#" -ne 1 ]; then
  echo "Usage: $0 <backup.sql|backup.sql.gz>" >&2
  exit 1
fi

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
DB_USER="${DB_USER:-}"
DB_NAME="${DB_NAME:-}"
BACKUP_FILE="$1"
SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
WEB_STOPPED=false

if [ ! -f "${BACKUP_FILE}" ]; then
  echo "Backup file not found: ${BACKUP_FILE}" >&2
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if [ -z "${DB_USER}" ]; then
  DB_USER="$(docker compose -f "${COMPOSE_FILE}" exec -T db printenv POSTGRES_USER)"
fi
if [ -z "${DB_NAME}" ]; then
  DB_NAME="$(docker compose -f "${COMPOSE_FILE}" exec -T db printenv POSTGRES_DB)"
fi
if [ -z "${DB_USER}" ] || [ -z "${DB_NAME}" ]; then
  echo "Could not read the active PostgreSQL user and database from the Compose db service." >&2
  exit 1
fi

if [[ ! "${DB_USER}" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]]; then
  echo "DB_USER must be a simple PostgreSQL identifier for a safe restore." >&2
  exit 1
fi

if [[ "${BACKUP_FILE}" == *.gz ]]; then
  if ! gzip -t "${BACKUP_FILE}"; then
    echo "Compressed backup failed gzip integrity validation." >&2
    exit 1
  fi
elif [ ! -s "${BACKUP_FILE}" ]; then
  echo "Backup file is empty." >&2
  exit 1
fi

echo "This will restore ${BACKUP_FILE} into ${DB_NAME} and may overwrite existing data."
echo "Type RESTORE to continue:"
read -r confirmation

if [ "${confirmation}" != "RESTORE" ]; then
  echo "Restore cancelled."
  exit 1
fi

echo "Creating a safety backup of the current database before restore..."
COMPOSE_FILE="${COMPOSE_FILE}" DB_USER="${DB_USER}" DB_NAME="${DB_NAME}" \
  BACKUP_DIR="${BACKUP_DIR:-/var/backups/ori-cruit-hub}" \
  "${SCRIPT_DIR}/backup-db.sh"

finish_restore() {
  local result=$?
  trap - EXIT
  if [ "${WEB_STOPPED}" = true ]; then
    if ! docker compose -f "${COMPOSE_FILE}" start web; then
      echo "ERROR: could not restart web automatically; start it manually." >&2
      result=1
    fi
  fi
  exit "${result}"
}
trap finish_restore EXIT

docker compose -f "${COMPOSE_FILE}" stop web
WEB_STOPPED=true

{
  printf 'DROP SCHEMA public CASCADE;\n'
  printf 'CREATE SCHEMA public AUTHORIZATION "%s";\n' "${DB_USER}"
  printf 'GRANT USAGE, CREATE ON SCHEMA public TO "%s";\n' "${DB_USER}"
  if [[ "${BACKUP_FILE}" == *.gz ]]; then
    gunzip -c "${BACKUP_FILE}"
  else
    cat "${BACKUP_FILE}"
  fi
} | docker compose -f "${COMPOSE_FILE}" exec -T db psql --single-transaction -v ON_ERROR_STOP=1 -U "${DB_USER}" -d "${DB_NAME}"

echo "Restore completed."
