#!/usr/bin/env bash
set -euo pipefail

# Upload complete, recent local backup sets through rclone crypt, verify them,
# then permanently remove only dated backup directories older than retention.
BACKUP_DIR="${BACKUP_DIR:-/var/backups/ori-cruit-hub}"
DB_NAME="${DB_NAME:-folga_hub}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
CRYPT_REMOTE="${RCLONE_CRYPT_REMOTE:-ori_drive_crypt}"

if [[ ! "${RETENTION_DAYS}" =~ ^[1-9][0-9]*$ ]]; then
  echo "RETENTION_DAYS must be a positive integer." >&2
  exit 1
fi
if ! rclone listremotes | grep -Fx "${CRYPT_REMOTE}:" >/dev/null; then
  echo "Configured rclone crypt remote not found: ${CRYPT_REMOTE}" >&2
  exit 1
fi

cutoff_epoch="$(date -u -d "${RETENTION_DAYS} days ago" +%s)"
manifest="$(mktemp /run/ori-cruit-hub-rclone-files.XXXXXX)"
chmod 600 "${manifest}"
trap 'rm -f -- "${manifest}"' EXIT

shopt -s nullglob
db_files=("${BACKUP_DIR}/oricruithub-${DB_NAME}-"*.sql.gz)
uploaded_sets=0

for db_file in "${db_files[@]}"; do
  db_name="${db_file##*/}"
  backup_id="${db_name#oricruithub-${DB_NAME}-}"
  backup_id="${backup_id%.sql.gz}"
  if [[ ! "${backup_id}" =~ ^([0-9]{8})-([0-9]{6})$ ]]; then
    continue
  fi

  date_part="${BASH_REMATCH[1]}"
  time_part="${BASH_REMATCH[2]}"
  parsed_epoch="$(date -u -d "${date_part:0:4}-${date_part:4:2}-${date_part:6:2} ${time_part:0:2}:${time_part:2:2}:${time_part:4:2}" +%s 2>/dev/null || true)"
  if [[ -z "${parsed_epoch}" || "$(date -u -d "@${parsed_epoch}" +%Y%m%d-%H%M%S)" != "${backup_id}" ]]; then
    echo "Skipping backup with invalid timestamp: ${backup_id}" >&2
    continue
  fi
  if (( parsed_epoch < cutoff_epoch )); then
    continue
  fi

  documents_file="${BACKUP_DIR}/oricruithub-documents-${backup_id}.tar.gz"
  if [[ ! -s "${db_file}" || ! -s "${documents_file}" ]]; then
    echo "Skipping incomplete backup set: ${backup_id}" >&2
    continue
  fi

  remote_set="p1-02-${date_part}T${time_part}Z"
  remote_path="${CRYPT_REMOTE}:${remote_set}"
  : > "${manifest}"
  printf '%s\n%s\n' "${db_name}" "${documents_file##*/}" > "${manifest}"

  echo "Uploading complete backup set ${backup_id} through rclone crypt..."
  rclone mkdir "${remote_path}"
  rclone copyto "${db_file}" "${remote_path}/${db_name}" --transfers 1
  rclone copyto "${documents_file}" "${remote_path}/${documents_file##*/}" --transfers 1
  rclone check "${BACKUP_DIR}" "${remote_path}" --files-from-raw "${manifest}" --one-way --size-only
  remote_files="$(rclone lsf "${remote_path}")"
  while IFS= read -r expected_file; do
    if ! grep -Fxq "${expected_file}" <<< "${remote_files}"; then
      echo "Verified backup file missing from Drive: ${expected_file}" >&2
      exit 1
    fi
  done < "${manifest}"
  uploaded_sets=$((uploaded_sets + 1))
  echo "Backup set ${backup_id} uploaded and size-verified."
done

if (( uploaded_sets == 0 )); then
  echo "No complete backup sets within ${RETENTION_DAYS} days were verified; remote cleanup skipped." >&2
  exit 1
fi

# rclone crypt presents decrypted directory names here. Only folders created
# with our strict dated backup naming pattern are eligible for removal.
remote_dirs="$(rclone lsf --dirs-only "${CRYPT_REMOTE}:")"
while IFS= read -r raw_dir; do
  [[ -n "${raw_dir}" ]] || continue
  dir="${raw_dir%/}"
  if [[ ! "${dir}" =~ ^p1-02-([0-9]{8})T([0-9]{6})Z$ ]]; then
    continue
  fi
  date_part="${BASH_REMATCH[1]}"
  time_part="${BASH_REMATCH[2]}"
  parsed_epoch="$(date -u -d "${date_part:0:4}-${date_part:4:2}-${date_part:6:2} ${time_part:0:2}:${time_part:2:2}:${time_part:4:2}" +%s 2>/dev/null || true)"
  if [[ -z "${parsed_epoch}" || "$(date -u -d "@${parsed_epoch}" +%Y%m%dT%H%M%SZ)" != "${dir#p1-02-}" ]]; then
    continue
  fi
  if (( parsed_epoch < cutoff_epoch )); then
    echo "Permanently deleting expired managed Drive backup set ${dir}."
    rclone purge --drive-use-trash=false "${CRYPT_REMOTE}:${dir}"
  fi
done <<< "${remote_dirs}"

echo "Drive backup sync finished. Uploaded and verified ${uploaded_sets} complete set(s); managed remote retention is ${RETENTION_DAYS} days."
