# Go-Live Execution Guide — ABC-IO v2.0

**Date:** 2026-06-12
**Owner:** Christopher Porreca / redot1
**Version:** v5.0.0
**Status:** SYSTEM: READY FOR PRODUCTION

> This guide assumes all exposed secrets have been rotated and `.env` has been updated with the new values.

---

## Pre-Flight Checklist

- [ ] `.env` updated with rotated production secrets
- [ ] DNS records confirmed in Namecheap
- [ ] Let's Encrypt certificates present on redot1
- [ ] SSH access to redot1, ai1, ai2 confirmed
- [ ] Docker and Docker Compose installed on all nodes

---

## Phase 1: Staging (Local)

```bash
cd C:\Users\cplexmath\OneDrive\Documents\redot2

# Ensure .env is populated with current values
cat .env

# Start staging
docker compose -f compose.staging.yml up -d --remove-orphans

sleep 30

# Verify
./scripts/health-check.sh
```

---

## Phase 2: Production — Primary Node (redot1)

```bash
# From local machine, copy repo to VPS (or pull from GitHub on VPS)
scp -r C:\Users\cplexmath\OneDrive\Documents\redot2 root@162.254.32.142:/opt/
# Or use GitHub:
# ssh root@162.254.32.142 "cd /opt && git clone https://github.com/abc-io-enterprise/redot3.git redot2"

# SSH to redot1
ssh root@162.254.32.142

cd /opt/redot2

# Copy the rotated .env to the VPS
# (do this via secure method; never paste secrets in chat)
nano .env

# Deploy
docker compose -f compose.prod.yml pull
docker compose -f compose.prod.yml up -d --remove-orphans

sleep 30

# Verify
./scripts/health-check.sh
curl -I https://abc-io.com/health
curl -I https://abc-io.com/
```

---

## Phase 3: Production — AI Replica 1 (ai1)

```bash
ssh root@192.227.212.235

cd /opt/redot2

# Copy rotated .env securely
nano .env

# Deploy
docker compose -f compose.replica-ai1.yml pull
docker compose -f compose.replica-ai1.yml up -d --remove-orphans

sleep 30

# Verify
./scripts/health-check.sh
curl -I http://localhost:5000/health
curl -I http://localhost:7000/health
```

---

## Phase 4: Production — AI Replica 2 (ai2)

```bash
ssh root@192.227.212.237

cd /opt/redot2

# Copy rotated .env securely
nano .env

# Deploy
docker compose -f compose.replica-ai2.yml pull
docker compose -f compose.replica-ai2.yml up -d --remove-orphans

sleep 30

# Verify
./scripts/health-check.sh
curl -I http://localhost:5000/health
curl -I http://localhost:7000/health
```

---

## Phase 5: Post-Deployment Verification

On redot1:

```bash
cd /opt/redot2

# Service status
docker compose -f compose.prod.yml ps

# Logs for errors
docker compose -f compose.prod.yml logs --tail=100 | grep -iE "error|fatal|critical"

# Database
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT version();"

# Redis
docker compose -f compose.prod.yml exec redis redis-cli ping

# Public endpoints from local machine
curl -I https://abc-io.com/health
curl -I https://abc-io.com/
```

---

## Phase 6: Monitoring

```
Grafana:      http://localhost:14000 (admin/admin)
Prometheus:   http://localhost:9091
Jaeger:       http://localhost:16686
```

---

## Rollback (if needed)

On affected node:

```bash
cd /opt/redot2
docker compose -f compose.prod.yml down
git checkout v5.0.0
docker compose -f compose.prod.yml up -d
```

---

## Support

- Owner: owner@abc-io.com | +1-585-348-7120
- Support: support@abc-io.com

---

*ABC-IO — 100 Years Nonstop — Always On, Always Yours, Always Here.*
