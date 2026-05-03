#!/bin/bash

# Database Backup Script for Folga Hub
# Usage: ./backup-db.sh

# Load environment variables if .env exists
if [ -f ../.env ]; then
    export $(grep -v '^#' ../.env | xargs)
fi

# Variables
DB_URL=${DATABASE_URL}
BACKUP_DIR="./backups"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/folgahub_backup_${TIMESTAMP}.sql"

# Create backup directory if it doesn't exist
mkdir -p ${BACKUP_DIR}

echo "Starting database backup..."

# Execute pg_dump
# Note: This assumes pg_dump is installed and DATABASE_URL is correct
if pg_dump ${DB_URL} > ${BACKUP_FILE}; then
    echo "Backup successful: ${BACKUP_FILE}"
    # Keep only last 30 days of backups
    find ${BACKUP_DIR} -type f -name "*.sql" -mtime +30 -delete
    echo "Old backups cleaned up."
else
    echo "Backup failed!"
    exit 1
fi
