#!/usr/bin/env bash
set -euo pipefail

# Create a timestamp-paired PostgreSQL and local-document backup set.

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
BACKUP_SET_ID="${BACKUP_SET_ID:-$(date +"%Y%m%d-%H%M%S")}"
if [[ ! "${BACKUP_SET_ID}" =~ ^[A-Za-z0-9_-]+$ ]]; then
  echo "BACKUP_SET_ID may contain only letters, numbers, hyphens, and underscores." >&2
  exit 1
fi
export BACKUP_SET_ID

"${SCRIPT_DIR}/backup-db.sh"
"${SCRIPT_DIR}/backup-documents.sh"

echo "Local backup set ${BACKUP_SET_ID} completed. Keep both matching files together."
"${SCRIPT_DIR}/backup-drive-sync.sh"
