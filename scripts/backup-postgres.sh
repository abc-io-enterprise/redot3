#!/bin/bash
# ABC-IO v2.0 — PostgreSQL Daily Backup
# Intended to run via cron at 02:00 UTC daily.

set -euo pipefail

BACKUP_DIR="/backups/postgres"
RETENTION_DAYS=7
DB_NAME="abc_io"
DB_USER="postgres"
CONTAINER_NAME="redot2-postgres-1"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="${BACKUP_DIR}/${DB_NAME}-${TIMESTAMP}.sql"

mkdir -p "$BACKUP_DIR"

# Perform dump
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" -d "$DB_NAME" > "$BACKUP_FILE"

# Compress
gzip -f "$BACKUP_FILE"
BACKUP_FILE_GZ="${BACKUP_FILE}.gz"

# Encrypt (optional — requires GPG key configured)
# gpg --symmetric --cipher-algo AES256 "$BACKUP_FILE_GZ"

# Set strict permissions
chmod 600 "$BACKUP_FILE_GZ"

# Clean up old backups
find "$BACKUP_DIR" -name "${DB_NAME}-*.sql.gz" -mtime +$RETENTION_DAYS -delete

echo "[$(date -Iseconds)] Backup complete: $BACKUP_FILE_GZ"
