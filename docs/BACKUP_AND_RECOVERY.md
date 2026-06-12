# ABC-IO v2.0 Backup and Recovery Guide

## Purpose

This guide defines how to back up and restore ABC-IO v2.0 data, configuration, and credentials. It covers PostgreSQL, Redis, secrets, TLS certificates, and full-node recovery.

## Recovery objectives

| Objective | Target |
|---|---|
| Recovery Time Objective (RTO) | 15 minutes for critical services (`postgres`, `redis`, `gateway`, `nginx`) |
| Recovery Point Objective (RPO) | 1 hour for transactional data; 24 hours for configuration |
| Testing frequency | Quarterly |

## Critical service priority

1. `postgres`
2. `redis`
3. `gateway`
4. `nginx`
5. `owner-dashboard`
6. `operator-station`
7. `kimi` / `worker`
8. All other services

## Backup strategy

### PostgreSQL

Daily automated dump:

```bash
mkdir -p /backups/postgres
docker exec redot2-postgres-1 pg_dump -U postgres abc_io > \
  /backups/postgres/abcio-$(date +%Y%m%d-%H%M%S).sql

# Encrypt
gpg --symmetric --cipher-algo AES256 /backups/postgres/abcio-*.sql
```

Retention: 7 daily, 4 weekly, 12 monthly.

### Redis

Redis data is considered transient. For job-queue durability:

```bash
docker exec redot2-redis-1 redis-cli --rdb /data/dump.rdb
```

### Configuration and secrets

| Asset | Storage | Backup method |
|---|---|---|
| Source code | GitHub `abc-io-enterprise/redot2` | Git clone and release archives |
| `.env` | Enterprise password manager + GitHub Repository Secret `PROD_ENV_FILE` | Password manager export (encrypted) |
| TLS certificates | `/etc/letsencrypt` on host | Copy `/etc/letsencrypt` to encrypted offsite storage |
| Compose files | Git repository | Same as source code |
| Release packages | `scripts/package-release.ps1` / `scripts/prepare-deploy-bundle.sh` | Offsite archive |

## Restore procedures

### Scenario A — Database corruption or accidental deletion

1. Stop dependent services:
   ```bash
   docker compose -f compose.prod.yml stop gateway owner-dashboard mobile-gateway public-portal worker
   ```
2. Identify the last good backup:
   ```bash
   ls -lt /backups/postgres/*.sql.gpg | head -n 5
   ```
3. Decrypt and restore:
   ```bash
   gpg --decrypt /backups/postgres/abcio-YYYYMMDD-HHMMSS.sql.gpg > /tmp/restore.sql
   docker exec -i redot2-postgres-1 psql -U postgres -d abc_io < /tmp/restore.sql
   ```
4. Restart services:
   ```bash
   docker compose -f compose.prod.yml up -d
   ./scripts/health-check.sh
   ```

### Scenario B — Primary VPS failure

1. Provision a replacement VPS with the same OS and Docker versions.
2. Run `scripts/vps-setup.sh`.
3. Clone the repository and checkout the last known-good tag:
   ```bash
   git clone https://github.com/abc-io-enterprise/redot2.git /opt/redot2
   cd /opt/redot2
   git checkout <last-known-good-tag>
   ```
4. Restore `.env` from the password manager or GitHub Secret.
5. Restore TLS certificates from offsite backup.
6. Restore the latest PostgreSQL backup.
7. Start services:
   ```bash
   docker compose -f compose.prod.yml up -d
   ./scripts/health-check.sh
   ```
8. Update DNS to point to the new VPS IP.

### Scenario C — Complete region failure

1. Activate the cold-standby region if provisioned.
2. Restore PostgreSQL from the latest offsite backup.
3. Restore `.env` and TLS certificates.
4. Update global DNS/anycast to route to the standby region.
5. Follow Scenario B steps on the standby hosts.

### Scenario D — Compromised secrets

1. Rotate all affected secrets per `docs/SECURITY.md` and `docs/SECURITY_RUNBOOK.md`.
2. Revoke old tokens at vendors (Stripe, Mistral, Kimi, SMTP provider).
3. Update GitHub Repository Secrets.
4. Replace `.env` on all hosts.
5. Force-recreate all services:
   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate
   ./scripts/health-check.sh
   ```

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: offsite backup destination and GPG encryption passphrase
- reason: backups must survive host or region failure
- where it is needed: backup scripts, password manager, and offsite storage
- exact steps:
  1. Choose an offsite destination (S3-compatible bucket, rsync target, or cold storage).
  2. Generate a strong GPG passphrase and store it in the password manager.
  3. Configure `scripts/backup-postgres.sh` to reference the passphrase by environment variable name only.
  4. Schedule daily backups with cron:
     ```bash
     (crontab -l 2>/dev/null; echo "0 2 * * * /opt/redot2/scripts/backup-postgres.sh >> /var/log/abc-io-backup.log 2>&1") | crontab -
     ```
  5. Confirm offsite copy succeeds.
- verification method: run a backup, decrypt it, and restore it to a scratch database; confirm data is present

`ACTION REQUIRED FROM OWNER`
- item needed: update DNS to point to a replacement VPS after primary failure
- reason: DNS is the owner-controlled routing layer; automation cannot modify registrar records
- where it is needed: Namecheap or current registrar
- exact steps:
  1. Provision and verify the replacement VPS.
  2. Update the `@`, `www`, `api`, and `admin` A records to the new IP.
  3. Wait for global propagation.
  4. Verify from multiple external resolvers.
- verification method: `dig abc-io.com` resolves to the new IP and `curl https://abc-io.com/health` returns `ok`

## Verification

```bash
# Confirm a recent backup exists
ls -lt /backups/postgres/*.sql.gpg | head -n 1

# Test decryption
gpg --decrypt /backups/postgres/latest.sql.gpg > /tmp/latest.sql

# Restore test to a scratch database
docker compose -f compose.prod.yml exec -T postgres psql -U postgres -d abc_io_test < /tmp/latest.sql

# Verify critical tables
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io_test -c "SELECT COUNT(*) FROM accounts;"

# Full health check after restore
./scripts/health-check.sh
./scripts/auto-heal.sh
```

Expected: backups are encrypted, restore produces a working database, and all health checks pass after recovery.
