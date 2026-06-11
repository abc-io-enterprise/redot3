# Disaster Recovery Runbook — ABC-IO v2.0

## Recovery Objectives

- **Recovery Time Objective (RTO)**: 15 minutes for critical services (gateway, postgres, redis, nginx).
- **Recovery Point Objective (RPO)**: 1 hour for transactional data; 24 hours for configuration.
- **Testing frequency**: Quarterly.

## Critical Service Priority

1. postgres (database)
2. redis (cache / job queue)
3. gateway (API routing)
4. nginx (TLS termination)
5. owner-dashboard (admin access)
6. operator-station (monitoring)
7. kimi / worker (AI and background jobs)
8. All other services

## Backup Strategy

### PostgreSQL

Daily automated dump:

```bash
# On the primary VPS
mkdir -p /backups/postgres
docker exec redot2-postgres-1 pg_dump -U abcio abcio > \
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

### Configuration and Secrets

- Source code: GitHub (`abc-io-enterprise/redot2`).
- `.env` files: enterprise password manager + GitHub Repository Secret `PROD_ENV_FILE`.
- TLS certificates: Let's Encrypt on host volume; backup `/etc/letsencrypt`.

## Restore Procedures

### Scenario A — Database Corruption or Accidental Deletion

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
   docker exec -i redot2-postgres-1 psql -U abcio abcio < /tmp/restore.sql
   ```
4. Restart services:
   ```bash
   docker compose -f compose.prod.yml up -d
   ./scripts/health-check.sh
   ```

### Scenario B — Primary VPS Failure

1. Provision a replacement VPS with the same OS and Docker versions.
2. Run `scripts/vps-setup.sh`.
3. Clone the repository and checkout the last known-good tag:
   ```bash
   git clone https://github.com/abc-io-enterprise/redot2.git /opt/redot2
   cd /opt/redot2
   git checkout <last-known-good-tag>
   ```
4. Restore `.env` from the password manager or GitHub Secret.
5. Restore the latest PostgreSQL backup.
6. Start services:
   ```bash
   docker compose -f compose.prod.yml up -d
   ./scripts/health-check.sh
   ```
7. Update DNS to point to the new VPS IP.

### Scenario C — Complete Region Failure

1. Activate the cold-standby region (if provisioned).
2. Restore PostgreSQL from the latest offsite backup.
3. Update global DNS/anycast to route to the standby region.
4. Follow Scenario B steps on the standby hosts.

### Scenario D — Compromised Secrets

1. Rotate all affected secrets per `docs/SECURITY_RUNBOOK.md`.
2. Revoke old tokens at vendors (Stripe, Mistral, Kimi, SMTP).
3. Update GitHub Repository Secrets.
4. Replace `.env` on all hosts.
5. Force-recreate all services:
   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate
   ```

## Emergency Contacts

- Platform on-call: `#platform-ops`
- Security: `#security` or `security@abc-io.com`
- Emergency phone: `+1-555-ABC-IO-911`

## Recovery Validation Checklist

- [ ] All containers in `docker compose ps` show `Up` and healthy.
- [ ] `./scripts/health-check.sh` returns HTTP 200 for all endpoints.
- [ ] `./scripts/auto-heal.sh` reports no issues.
- [ ] Postgres accepts connections and recent data is present.
- [ ] Redis responds to `PING` and job queue is processing.
- [ ] Gateway `/health` and `/api/v1/ai/health` respond correctly.
- [ ] Public Portal and Owner Dashboard are reachable via HTTPS.
- [ ] Prometheus is scraping all targets.
- [ ] No critical alerts firing in Grafana.
