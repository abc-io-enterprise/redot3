#!/bin/bash
# ABC-IO PostgreSQL Restore
# Restores a database backup into the running postgres container.
#
# Usage:
#   ./scripts/restore-postgres.sh <backup-file> [compose-file]
#
# The optional compose-file argument defaults to compose.prod.yml.
# Accepted backup formats: .sql, .sql.gz, .dump, .dump.gz

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

BACKUP_FILE="${1:-}"
COMPOSE_FILE="${2:-compose.prod.yml}"

# Services that should be stopped before restoring to avoid DB writes.
DEPENDENT_SERVICES=(gateway owner-dashboard public-portal beacon worker kimi)

usage() {
    echo "Usage: $0 <backup-file> [compose-file]"
    echo ""
    echo "Arguments:"
    echo "  backup-file   Path to the PostgreSQL backup file."
    echo "                Supported: .sql, .sql.gz, .dump, .dump.gz"
    echo "  compose-file  Docker Compose file to use (default: compose.prod.yml)"
    echo ""
    echo "Examples:"
    echo "  $0 /backups/abc-io-2026-06-12.sql"
    echo "  $0 /backups/abc-io-2026-06-12.dump.gz docker-compose.yml"
    exit 1
}

check_prereqs() {
    if [ -z "$BACKUP_FILE" ]; then
        echo "ERROR: No backup file specified."
        usage
    fi

    if [ "$BACKUP_FILE" = "-h" ] || [ "$BACKUP_FILE" = "--help" ]; then
        usage
    fi

    if ! command -v docker >/dev/null 2>&1; then
        echo "ERROR: docker is not installed or not in PATH."
        exit 1
    fi

    if ! docker compose version >/dev/null 2>&1; then
        echo "ERROR: docker compose (v2) is not available."
        exit 1
    fi

    if [ ! -f "$PROJECT_DIR/$COMPOSE_FILE" ]; then
        echo "ERROR: Compose file not found: $PROJECT_DIR/$COMPOSE_FILE"
        exit 1
    fi

    if [ ! -f "$BACKUP_FILE" ]; then
        echo "ERROR: Backup file not found: $BACKUP_FILE"
        exit 1
    fi

    if [ ! -r "$BACKUP_FILE" ]; then
        echo "ERROR: Backup file is not readable: $BACKUP_FILE"
        exit 1
    fi

    if [ ! -s "$BACKUP_FILE" ]; then
        echo "ERROR: Backup file is empty: $BACKUP_FILE"
        exit 1
    fi
}

confirm_restore() {
    echo "================================================"
    echo "ABC-IO PostgreSQL Restore"
    echo "================================================"
    echo "Backup file:   $BACKUP_FILE"
    echo "Compose file:  $COMPOSE_FILE"
    echo "Project dir:   $PROJECT_DIR"
    echo ""
    echo "WARNING: This will overwrite the current abc_io database."
    echo "         All existing data in the database will be replaced."
    echo ""
    echo "Type RESTORE to continue or press Ctrl+C to abort."
    echo "================================================"
    read -r CONFIRM
    if [ "$CONFIRM" != "RESTORE" ]; then
        echo "Restore aborted."
        exit 0
    fi
}

get_running_services() {
    docker compose -f "$COMPOSE_FILE" -p redot2 ps --services --status running 2>/dev/null || true
}

stop_dependent_services() {
    echo "[1/5] Checking running dependent services..."
    RUNNING_SERVICES=$(get_running_services)
    STOPPED_SERVICES=()

    if [ -z "$RUNNING_SERVICES" ]; then
        echo "      No services are currently running."
        return
    fi

    for svc in "${DEPENDENT_SERVICES[@]}"; do
        if echo "$RUNNING_SERVICES" | grep -qx "$svc"; then
            STOPPED_SERVICES+=("$svc")
        fi
    done

    if [ ${#STOPPED_SERVICES[@]} -eq 0 ]; then
        echo "      No dependent services are running."
        return
    fi

    echo "      Stopping dependent services: ${STOPPED_SERVICES[*]}"
    docker compose -f "$COMPOSE_FILE" stop "${STOPPED_SERVICES[@]}"
}

start_stopped_services() {
    if [ ${#STOPPED_SERVICES[@]} -eq 0 ]; then
        return
    fi

    echo "[4/5] Restarting previously stopped services..."
    docker compose -f "$COMPOSE_FILE" start "${STOPPED_SERVICES[@]}"
}

ensure_postgres_running() {
    echo "[2/5] Ensuring postgres service is running..."
    RUNNING_SERVICES=$(get_running_services)
    if ! echo "$RUNNING_SERVICES" | grep -qx "postgres"; then
        echo "      Starting postgres service..."
        docker compose -f "$COMPOSE_FILE" up -d postgres
        echo "      Waiting for postgres to be ready..."
        for i in {1..30}; do
            if docker compose -f "$COMPOSE_FILE" exec -T postgres pg_isready -U postgres -d abc_io >/dev/null 2>&1; then
                echo "      Postgres is ready."
                return
            fi
            sleep 1
        done
        echo "ERROR: Postgres did not become ready in time."
        exit 1
    fi
    echo "      Postgres is running."
}

restore_backup() {
    echo "[3/5] Restoring backup to postgres..."

    case "$BACKUP_FILE" in
        *.sql)
            echo "      Detected plain SQL dump. Using psql..."
            docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d abc_io < "$BACKUP_FILE"
            ;;
        *.sql.gz)
            echo "      Detected compressed SQL dump. Using psql with gunzip..."
            gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d abc_io
            ;;
        *.dump)
            echo "      Detected pg_dump archive. Using pg_restore..."
            docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore \
                -U postgres -d abc_io --clean --if-exists --no-owner --no-privileges < "$BACKUP_FILE"
            ;;
        *.dump.gz)
            echo "      Detected compressed pg_dump archive. Using pg_restore with gunzip..."
            gunzip -c "$BACKUP_FILE" | docker compose -f "$COMPOSE_FILE" exec -T postgres pg_restore \
                -U postgres -d abc_io --clean --if-exists --no-owner --no-privileges
            ;;
        *)
            echo "ERROR: Unsupported backup file extension: $BACKUP_FILE"
            echo "Supported extensions: .sql, .sql.gz, .dump, .dump.gz"
            exit 1
            ;;
    esac
}

validate_restore() {
    echo "[5/5] Validating restore..."

    if ! docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d abc_io -c '\dt' >/dev/null 2>&1; then
        echo "ERROR: Validation failed. Could not list tables in abc_io database."
        return 1
    fi

    TABLE_COUNT=$(docker compose -f "$COMPOSE_FILE" exec -T postgres psql -U postgres -d abc_io -t -c \
        "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null | tr -d ' \n')

    if [ -z "$TABLE_COUNT" ] || [ "$TABLE_COUNT" -eq 0 ] 2>/dev/null; then
        echo "WARNING: Restore completed but no public tables were found."
        return 1
    fi

    echo "      Restore validated. Public tables found: $TABLE_COUNT"
}

main() {
    cd "$PROJECT_DIR"
    check_prereqs
    confirm_restore
    stop_dependent_services
    ensure_postgres_running

    # Capture exit status of restore to allow service restart on failure.
    RESTORE_STATUS=0
    restore_backup || RESTORE_STATUS=$?

    if [ $RESTORE_STATUS -ne 0 ]; then
        echo ""
        echo "ERROR: Restore command failed (exit $RESTORE_STATUS)."
    fi

    start_stopped_services

    if [ $RESTORE_STATUS -ne 0 ]; then
        exit $RESTORE_STATUS
    fi

    validate_restore

    echo ""
    echo "================================================"
    echo "PostgreSQL restore completed successfully."
    echo "Backup: $BACKUP_FILE"
    echo "================================================"
}

main "$@"
