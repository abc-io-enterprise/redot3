# ABC-IO v2.0 Production Runbook

**Date:** 2026-06-11
**Status:** LIVE
**Domain:** https://abc-io.com
**Contact:** cporreca@abc-io.com | 585-629-9120

---

## Table of Contents

1. [Infrastructure Overview](#1-infrastructure-overview)
2. [Deployment History](#2-deployment-history)
3. [Service Endpoints](#3-service-endpoints)
4. [DNS Configuration](#4-dns-configuration)
5. [SSL Certificates](#5-ssl-certificates)
6. [Security Configuration](#6-security-configuration)
7. [Operational Procedures](#7-operational-procedures)
8. [Troubleshooting](#8-troubleshooting)
9. [Backup & Recovery](#9-backup--recovery)
10. [Verification Checklist](#10-verification-checklist)

---

## 1. Infrastructure Overview

### Nodes

| Node | Role | IP Address | Provider |
|------|------|------------|----------|
| redot1 | Primary (full stack) | 162.254.32.142 | VPS |
| ai1 | AI Worker | 192.227.212.235 | VPS |
| ai2 | AI Worker | 192.227.212.237 | VPS |

### Services on redot1 (18 containers)

| Service | Port | Status | Purpose |
|---------|------|--------|---------|
| nginx | 80, 443 | healthy | Reverse proxy, SSL termination |
| gateway | 4000 | healthy | API gateway, auth, billing, AI proxy |
| operator-station | 8080 | healthy | Operations dashboard |
| owner-dashboard | 8500 | healthy | Admin interface |
| mobile-gateway | 5050 | healthy | Mobile API |
| public-portal | 8090 | healthy | Public website |
| beacon-pwa | 3005 | healthy | Beacon PWA |
| beacon | 3006 | healthy | Beacon backend |
| kimi | 5000 | healthy | AI inference (Mistral/Kimi) |
| ai-isp | 7000 | healthy | Cross-sensory translation |
| postgres | 5432 | healthy | Database (internal) |
| redis | 6379 | healthy | Cache/queue |
| prometheus | 9091 | healthy | Metrics collection |
| grafana | 14000 | healthy | Metrics visualization |
| tracer | 16686 | running | Jaeger tracing |
| headscale | 8085 | running | VPN control server |
| worker | headless | running | Background job processor |
| logger | headless | running | Log aggregation |

### Services on AI Nodes (ai1, ai2)

| Service | Port | Status |
|---------|------|--------|
| kimi | 5000 | healthy |
| redis | 6379 | healthy |
| worker | headless | running |

---

## 2. Deployment History

### v2.0.0 Production Deployment (2026-06-11)

**Completed Steps:**

1. ✅ Built all 10 custom Docker images locally
2. ✅ Validated docker-compose.yml, compose.prod.yml, compose.dev.yml
3. ✅ Uploaded 49 GitHub Repository Secrets
4. ✅ Tagged release v2.0.0 and pushed to GitHub
5. ✅ Staged deploy to redot1 (7 waves: infra → gateway → dashboards → AI → beacon → monitoring → nginx)
6. ✅ Deployed AI workers to ai1 and ai2
7. ✅ Obtained Let's Encrypt SSL certificates for abc-io.com and www.abc-io.com
8. ✅ Configured nginx with HTTPS, HTTP→HTTPS redirect, SSL mounts
9. ✅ Fixed nginx healthcheck (default_server + /health endpoint)
10. ✅ Fixed headscale healthcheck (removed — distroless image)
11. ✅ Fixed nginx upstream routing (/api/signature → public-portal, /api/beacon → mobile-gateway)
12. ✅ Added 2GB swap space to redot1 (critical memory fix)
13. ✅ Corrected AI node IPs in .env (192.227.212.235, 192.227.212.237)
14. ✅ DNS configured: abc-io.com and www.abc-io.com → 162.254.32.142

**Known Issues Resolved:**
- ~~Nginx 502 errors~~ → Fixed by restarting nginx after container recreation (stale DNS cache)
- ~~Nginx healthcheck failing~~ → Fixed default_server and /health endpoint
- ~~Missing SSL mounts~~ → Restored /etc/letsencrypt and /var/www/certbot mounts
- ~~Headscale healthcheck failing~~ → Removed (distroless image has no shell)
- ~~Memory pressure (93% RAM)~~ → Added 2GB swap, now stable at ~70%

---

## 3. Service Endpoints

### Public HTTPS Endpoints (via nginx)

| Endpoint | URL | Status |
|----------|-----|--------|
| Public Portal | https://abc-io.com/ | 200 |
| Nginx Health | https://abc-io.com/health | 200 |
| Public Signature | https://abc-io.com/api/signature | 200 |
| Gateway System Health | https://abc-io.com/api/v1/system/health | 200 |
| AI Health | https://abc-io.com/api/v1/ai/health | 200 |
| Beacon Active | https://abc-io.com/api/v1/beacon/active | 200 |
| Mobile Gateway Beacon | https://abc-io.com/api/beacon | 200 |

### Direct HTTP Endpoints (port-based)

| Service | URL | Status |
|---------|-----|--------|
| Operator Station | http://abc-io.com:8080/status | 200 |
| Owner Dashboard | http://abc-io.com:8500/ | 200 |
| Mobile Gateway | http://abc-io.com:5050/api/signature | 200 |
| AI-ISP | http://abc-io.com:7000/health | 200 |
| Grafana | http://abc-io.com:14000/api/health | 200 |
| Prometheus | http://abc-io.com:9091/-/healthy | 200 |
| Jaeger UI | http://abc-io.com:16686/ | 200 |

### AI Worker Endpoints

| Node | URL | Status |
|------|-----|--------|
| ai1 | http://192.227.212.235:5000/health | 200 |
| ai2 | http://192.227.212.237:5000/health | 200 |

---

## 4. DNS Configuration

### Namecheap DNS A Records

| Host | IP Address | Purpose |
|------|------------|---------|
| @ | 162.254.32.142 | Main domain → redot1 |
| www | 162.254.32.142 | WWW redirect → redot1 |

### Note on Subdomains

The following subdomains are reserved for future use but are not currently required:
- `api.abc-io.com` → 162.254.32.142
- `admin.abc-io.com` → 162.254.32.142
- `ai1.abc-io.com` → 192.227.212.235
- `ai2.abc-io.com` → 192.227.212.237

---

## 5. SSL Certificates

- **Provider:** Let's Encrypt (certbot)
- **Domain:** abc-io.com, www.abc-io.com
- **Valid From:** 2026-06-11
- **Valid Until:** 2026-09-09
- **Auto-Renewal:** Enabled via certbot.timer (systemd)
- **Certificate Path:** /etc/letsencrypt/live/abc-io.com/
- **Next Renewal Check:** Automatic, every 12 hours

---

## 6. Security Configuration

### Authentication

| Layer | Mechanism | Status |
|-------|-----------|--------|
| Gateway JWT | HS256, 7-day expiry | Active |
| Gateway API Key | SHA-256 hashed, `ak_` prefix | Active |
| Owner Dashboard | `x-owner-token` header | Active |
| Public Portal | HMAC-SHA256 signature | Active |
| Mobile Gateway | HMAC-SHA256 signature | Active |

### Verified Security Behaviors

- ✅ `/auth/register` with empty body → HTTP 400
- ✅ `/auth/login` with empty body → HTTP 400
- ✅ `/auth/me` without token → HTTP 401
- ✅ `/admin/*` without owner token → HTTP 401
- ✅ CORS origin restricted to https://abc-io.com
- ✅ Rate limiting active on `/api/` routes
- ✅ HTTP → HTTPS redirect enforced
- ✅ Helmet headers on production-facing services

### Signing Keys (3 independent HMAC-SHA256)

- Owner Dashboard: `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`
- Mobile Gateway: `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`
- Public Portal: `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`

---

## 7. Operational Procedures

### Health Check

```bash
# Run from redot1
./scripts/health-check.sh

# Or check individual services
curl -sf https://abc-io.com/health
curl -sf https://abc-io.com/api/v1/system/health
```

### Auto-Heal

```bash
# Run from redot1
./scripts/auto-heal.sh
```

### Restart Stack

```bash
# On redot1
cd /opt/redot2
docker compose -f compose.prod.yml down
docker compose -f compose.prod.yml up -d
```

### Restart Single Service

```bash
cd /opt/redot2
docker compose -f compose.prod.yml restart gateway
```

### View Logs

```bash
docker logs -f redot2-gateway-1
docker logs -f redot2-nginx-1
```

### Database Backup

```bash
# On redot1
docker exec redot2-postgres-1 pg_dump -U postgres abc_io > backup_$(date +%Y%m%d).sql
```

### SSL Certificate Renewal (Manual)

```bash
# On redot1
certbot renew --dry-run  # Test
certbot renew             # Actual renewal
docker compose -f compose.prod.yml restart nginx
```

---

## 8. Troubleshooting

### 502 Bad Gateway

**Cause:** Nginx cached stale upstream IPs after container recreation.
**Fix:**
```bash
cd /opt/redot2
docker compose -f compose.prod.yml restart nginx
```

### Nginx Shows (unhealthy)

**Cause:** Healthcheck checking wrong endpoint or upstream DNS issue.
**Fix:** Verify `/health` responds: `docker exec redot2-nginx-1 wget -qO- http://localhost/health`

### Out of Memory

**Current Status:** 2GB swap added. Monitor with `free -h`.
**If OOM occurs:**
1. Add more swap: `fallocate -l 4G /swapfile2`
2. Or upgrade VPS to 2GB+ RAM
3. Reduce container memory limits in compose.prod.yml

### SSL Certificate Expired

1. Check certbot timer: `systemctl list-timers | grep certbot`
2. Manual renew: `certbot renew`
3. Restart nginx: `docker compose -f compose.prod.yml restart nginx`

---

## 9. Backup & Recovery

### GitHub Backup

- Repository: `https://github.com/abc-io-enterprise/redot2`
- Branch: `master`
- Latest Tag: `v2.0.0`
- All source code, configs, and scripts committed

### Local Backup

- Location: `c:\Users\cplexmath\Documents\redot2_backup_*.zip`
- Contains: All source, configs, scripts (excludes .git, node_modules, .env)

### VPS Recovery

```bash
# On redot1
cd /opt/redot2
git pull origin master
# Restore .env from secure backup
cp /secure/backup/.env .
docker compose -f compose.prod.yml up -d
```

---

## 10. Verification Checklist

Use this checklist after any deployment or maintenance:

- [ ] DNS resolves: `abc-io.com` → 162.254.32.142
- [ ] HTTP redirects to HTTPS
- [ ] https://abc-io.com/ returns 200
- [ ] https://abc-io.com/health returns 200
- [ ] https://abc-io.com/api/v1/system/health returns 200
- [ ] https://abc-io.com/api/signature returns valid JSON with fingerprint
- [ ] All 18 containers running on redot1
- [ ] ai1 (192.227.212.235) kimi health returns 200
- [ ] ai2 (192.227.212.237) kimi health returns 200
- [ ] SSL certificate valid (>30 days remaining)
- [ ] Swap space available: `free -h`
- [ ] No nginx 502 errors in logs
- [ ] GitHub repository up to date

---

**END OF RUNBOOK**

*Document Version: 2.0.0*
*Last Updated: 2026-06-11*
*Project Status: LIVE*
