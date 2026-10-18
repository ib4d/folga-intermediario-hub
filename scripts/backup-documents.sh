#!/usr/bin/env bash
set -euo pipefail

# Archive the local private-document volume through the running web container.
# This reads candidate documents; run only on the intended production host.

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
WEB_SERVICE="${WEB_SERVICE:-web}"
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ori-cruit-hub}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP="${BACKUP_SET_ID:-$(date +"%Y%m%d-%H%M%S")}"
BACKUP_FILE="${BACKUP_DIR}/oricruithub-documents-${TIMESTAMP}.tar.gz"
PARTIAL_FILE="${BACKUP_FILE}.partial"
COMPOSE_ENV=(env -i
  "HOME=${HOME:-/root}"
  "PATH=${PATH:-/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin}"
  "DOCKER_CONFIG=${DOCKER_CONFIG:-${HOME:-/root}/.docker}"
  docker compose -f "${COMPOSE_FILE}")

cleanup() {
  rm -f "${PARTIAL_FILE}" "${BACKUP_FILE}"
}
trap cleanup ERR
trap 'cleanup; exit 130' INT
trap 'cleanup; exit 143' TERM

mkdir -p "${BACKUP_DIR}"
chmod 700 "${BACKUP_DIR}"

if [[ ! "${TIMESTAMP}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "BACKUP_SET_ID may contain only letters, numbers, hyphens, and underscores." >&2
  exit 1
fi

if [ ! -f "${COMPOSE_FILE}" ]; then
  echo "Compose file not found: ${COMPOSE_FILE}" >&2
  exit 1
fi

if ! "${COMPOSE_ENV[@]}" exec -T "${WEB_SERVICE}" sh -c '[ "${STORAGE_PROVIDER:-}" = "local" ] && [ -d "${LOCAL_STORAGE_DIR:-}" ]'; then
  echo "Document backup requires STORAGE_PROVIDER=local and an available local storage directory." >&2
  exit 1
fi

echo "Archiving private documents from the web container to ${PARTIAL_FILE}..."
"${COMPOSE_ENV[@]}" exec -T "${WEB_SERVICE}" sh -c 'tar -czf - -C "$LOCAL_STORAGE_DIR" .' > "${PARTIAL_FILE}"
if [ ! -s "${PARTIAL_FILE}" ]; then
  echo "Document archive is empty." >&2
  exit 1
fi

tar -tzf "${PARTIAL_FILE}" >/dev/null
chmod 600 "${PARTIAL_FILE}"
mv "${PARTIAL_FILE}" "${BACKUP_FILE}"
trap - ERR INT TERM
echo "Document backup successful: ${BACKUP_FILE}"

find "${BACKUP_DIR}" -type f -name "oricruithub-documents-*.tar.gz" -mtime +"${RETENTION_DAYS}" -delete
