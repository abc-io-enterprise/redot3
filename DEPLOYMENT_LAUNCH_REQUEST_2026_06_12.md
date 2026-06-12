# ABC-IO v2.0 - COMPLETE LAUNCH REQUEST FOR DEVOPS TEAM

**Date:** June 12, 2026
**Owner:** Christopher Porreca (owner@abc-io.com)
**Status:** SYSTEM: READY FOR OWNER REVIEW
**System:** ABC-IO v2.0 (v5.0.0)

> **SECURITY NOTICE:** This document has been redacted. Live secrets that appeared in the original request have been replaced with placeholders. Rotate all keys/passwords before deployment.

---

## 📋 EXECUTIVE SUMMARY

ABC-IO v2.0 has completed all pre-deployment audits and is ready for production launch pending owner-gated actions. All compose files validate, documentation is complete, and master archives are created.

**Timeline to Go-Live:** 24-48 hours after owner actions are completed.

---

## 🎯 WHAT NEEDS TO HAPPEN

### Phase 1: Staging Deployment (Local Machine)

```bash
cd C:\Users\cplexmath\OneDrive\Documents\redot2

# Start staging environment
docker compose -f compose.staging.yml up -d --remove-orphans

# Wait for services to initialize
sleep 30

# Verify all services are healthy
./scripts/health-check.sh
```

**Expected Output:**
- All services running
- Health checks: 100% passing
- Error rate: < 1%

**Verification Commands:**
```bash
# Test API Gateway
curl -I http://localhost:4000/health

# Test Dashboard
curl -I http://localhost:8500/health

# Check Grafana (admin/admin)
curl -I http://localhost:14000/api/health
```

---

### Phase 2: Production Deployment

#### **Step 1: Deploy to Primary VPS (redot1)**

```bash
# SSH to primary VPS (owner credentials required)
ssh root@162.254.32.142

# Navigate to project directory
cd /opt/redot2

# Create .env from .env.example and populate with rotated production secrets
nano .env

# Deploy production stack
docker compose -f compose.prod.yml up -d --remove-orphans

# Wait for initialization
sleep 30

# Run health checks
./scripts/health-check.sh

# Verify public endpoints
curl -I https://abc-io.com/health
curl -I https://abc-io.com/
```

**Expected Results:**
- All services running on redot1
- HTTP 200 responses from public endpoints
- No error logs

---

#### **Step 2: Deploy to AI Replica 1 (ai1)**

```bash
# SSH to AI Replica 1 (owner credentials required)
ssh root@192.227.212.235

# Navigate to project directory
cd /opt/redot2

# Create .env with rotated production secrets
nano .env

# Deploy replica stack
docker compose -f compose.replica-ai1.yml up -d --remove-orphans

# Wait for initialization
sleep 30

# Verify deployment
./scripts/health-check.sh

# Check AI services
curl -I http://localhost:5000/health  # Kimi
curl -I http://localhost:7000/health  # AI-ISP
```

**Expected Results:**
- Kimi LLM (port 5000) responding
- AI-ISP (port 7000) responding
- Connected to redot1 backend

---

#### **Step 3: Deploy to AI Replica 2 (ai2)**

```bash
# SSH to AI Replica 2 (owner credentials required)
ssh root@192.227.212.237

# Navigate to project directory
cd /opt/redot2

# Create .env with rotated production secrets
nano .env

# Deploy replica stack
docker compose -f compose.replica-ai2.yml up -d --remove-orphans

# Wait for initialization
sleep 30

# Verify deployment
./scripts/health-check.sh

# Check AI services
curl -I http://localhost:5000/health  # Kimi
curl -I http://localhost:7000/health  # AI-ISP
```

**Expected Results:**
- Kimi LLM (port 5000) responding
- AI-ISP (port 7000) responding
- Connected to redot1 backend

---

### Phase 3: Post-Deployment Verification

#### **On Primary VPS (redot1):**

```bash
# Check all services running
docker compose -f compose.prod.yml ps

# View logs for errors
docker compose -f compose.prod.yml logs | grep -i error

# Verify database connectivity
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT version();"

# Check Redis
docker compose -f compose.prod.yml exec redis redis-cli ping
# Should respond: PONG
```

#### **Access Monitoring Dashboards:**

```
Grafana:      http://localhost:14000 (admin/admin)
Prometheus:   http://localhost:9091
Jaeger:       http://localhost:16686
```

---

## 📊 INFRASTRUCTURE DETAILS

### Primary VPS (redot1) - 162.254.32.142

**Services Running (22 total):**

```
API Services:
├── Gateway (4000)
├── Kimi LLM (5000)
├── Mobile Gateway (5050)
└── Beacon (3006)

User Interfaces:
├── Owner Dashboard (8500)
├── Operator Station (8080)
├── Public Portal (8090)
├── redot3 Portal (/portal/)
├── Account PWA (8100)
├── Interface PWA (8110)
└── Beacon PWA (3005)

Infrastructure:
├── PostgreSQL (5432)
├── Redis (6379)
├── Nginx (80/443)
└── Headscale (8085)

Observability:
├── Prometheus (9091)
├── Grafana (14000)
└── Jaeger (16686)

Autonomous:
└── Orchestrator (Docker mgmt)
```

**Memory Configuration:**
```
account-pwa:    256 MB limit
ai-isp:         512 MB limit
autonomous:     128 MB limit
beacon:         256 MB limit
gateway:        512 MB limit (prod)
owner-dashboard: 256 MB limit
```

**Storage:**
```
postgres-data volume:   Persistent database storage
headscale-data volume:  VPN configuration storage
```

---

### AI Replica 1 (ai1) - 192.227.212.235

**Services:** nginx, gateway, public-portal, redot3-portal, mobile-gateway, beacon-pwa, account-pwa, interface-pwa, kimi, ai-isp, beacon, worker.

**Connection:** Connects to redot1 backend for shared Postgres/Redis.

---

### AI Replica 2 (ai2) - 192.227.212.237

**Services:** nginx, gateway, public-portal, redot3-portal, mobile-gateway, beacon-pwa, account-pwa, interface-pwa, kimi, ai-isp, beacon, worker.

**Connection:** Connects to redot1 backend for shared Postgres/Redis.

---

## 🔧 CRITICAL ENVIRONMENT VARIABLES

### Required in .env (Before Deployment)

```bash
# === AI Provider ===
AI_PROVIDER=mistral
MISTRAL_API_KEY=[ROTATED_SECRET]
MISTRAL_MODEL=mistral-medium
MISTRAL_API_BASE_URL=https://api.mistral.ai/v1
KIMI_API_KEY=[ROTATED_SECRET]
KIMI_MODEL=kimi-k2-0711-preview
KIMI_API_BASE_URL=https://api.kimi.ai/v1

# === Database ===
POSTGRES_PASSWORD=[ROTATED_SECRET]

# === Redis ===
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
REDIS_PASSWORD=[ROTATED_SECRET]

# === Owner Dashboard ===
OWNER_ACCOUNT_EMAIL=owner@abc-io.com
OWNER_ACCOUNT_PASSWORD=[ROTATED_SECRET]
OWNER_SESSION_TOKEN=[ROTATED_SECRET]
OWNER_SIGNING_KEY=[ROTATED_SECRET]
OWNER_SIGNING_FINGERPRINT=[ROTATED_SECRET]
OWNER_BIOMETRIC_SECRET=[ROTATED_SECRET]

# === Mobile Gateway ===
MOBILE_SIGNING_KEY=[ROTATED_SECRET]
MOBILE_SIGNING_FINGERPRINT=[ROTATED_SECRET]

# === Public Portal ===
PUBLIC_SIGNING_KEY=[ROTATED_SECRET]
PUBLIC_SIGNING_FINGERPRINT=[ROTATED_SECRET]

# === Gateway ===
GATEWAY_API_KEY=[ROTATED_SECRET]
JWT_SECRET=[ROTATED_SECRET]
PUBLIC_URL=https://abc-io.com
CORS_ORIGIN=https://abc-io.com

# === Payment (Stripe) ===
STRIPE_SECRET_KEY=[POPULATE FROM DASHBOARD]
STRIPE_WEBHOOK_SECRET=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_FREE=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_BASIC=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_STANDARD=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_PRO=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_BUSINESS=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_TEAM=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_CORPORATE=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_ENTERPRISE=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_AGENCY=[POPULATE FROM DASHBOARD]
STRIPE_PRICE_ID_GLOBAL=[POPULATE FROM DASHBOARD]

# === Payment (PayPal) ===
PAYPAL_CLIENT_ID=[ROTATED_SECRET]
PAYPAL_CLIENT_SECRET=[ROTATED_SECRET]
PAYPAL_WEBHOOK_ID=[POPULATE FROM DASHBOARD]
PAYPAL_MODE=live

# === Email (SMTP) ===
SMTP_URL=smtps://user:pass@smtp.abc-io.com:465
SMTP_HOST=smtp.abc-io.com
SMTP_PORT=465
SMTP_USER=[ROTATED_VALUE]
SMTP_PASS=[ROTATED_SECRET]
SMTP_FROM=ABC-IO <no-reply@abc-io.com>

# === Endpoints ===
KIMI_ENDPOINTS=http://kimi:5000,http://192.227.212.235:5000,http://192.227.212.237:5000
```

**Location of Complete .env:**
```
C:\Users\cplexmath\OneDrive\Documents\redot2\.env
```

---

## ✅ PRE-DEPLOYMENT CHECKLIST

Before executing any deployments, confirm:

- [ ] All legal documents reviewed and `[EFFECTIVE_DATE]` replaced
- [ ] All exposed secrets rotated
- [ ] DNS records verified in Namecheap:
  - [ ] abc-io.com → 162.254.32.142
  - [ ] www.abc-io.com → 162.254.32.142
  - [ ] ai1.abc-io.com → 192.227.212.235
  - [ ] ai2.abc-io.com → 192.227.212.237
- [ ] SSL certificates ready (Let's Encrypt)
- [ ] Payment webhooks configured:
  - [ ] Stripe webhook: https://abc-io.com/api/v1/billing/webhook
  - [ ] PayPal webhook: https://abc-io.com/api/v1/billing/paypal/webhook
- [ ] SMTP credentials tested
- [ ] VPS SSH access verified
- [ ] Docker & Docker Compose installed on all VPS nodes
- [ ] Sufficient disk space on all VPS nodes (at least 50GB)

---

## 🚨 CRITICAL SUCCESS FACTORS

### 1. Health Checks Must Pass
```bash
# On each VPS node, run:
./scripts/health-check.sh

# Expected: All services green (no FAIL outputs)
```

### 2. Public Endpoints Must Respond
```bash
# From local machine:
curl -I https://abc-io.com/health     # HTTP 200
curl -I https://abc-io.com/          # HTTP 200
```

### 3. No Critical Errors
```bash
# Check logs on each node:
docker compose -f compose.prod.yml logs | grep -i "error\|fatal\|critical"

# Should return: nothing
```

---

## 📈 MONITORING POST-DEPLOYMENT

### Access Dashboards

**Grafana (Metrics & Visualization):**
```
URL: http://localhost:14000
Username: admin
Password: admin
```

**Prometheus (Metrics Collection):**
```
URL: http://localhost:9091
```

**Jaeger (Distributed Tracing):**
```
URL: http://localhost:16686
```

---

## 🔄 ROLLBACK PROCEDURE

If anything goes wrong:

```bash
# On affected VPS node:

# Stop all services
docker compose -f compose.prod.yml down

# Revert to previous version
git checkout v5.0.0

# Start services again
docker compose -f compose.prod.yml up -d

# Monitor logs
docker compose -f compose.prod.yml logs -f
```

**Backup Strategy:**
- Database: `scripts/backup-postgres.sh`
- Configuration: `.env` backed up locally (EFS-encrypted)
- Volumes: Named volumes persist data

---

## 📞 SUPPORT & ESCALATION

### During Deployment

**Owner (Decision Maker):**
- Name: Christopher Porreca
- Email: owner@abc-io.com
- Phone: +1-585-348-7120
- Timezone: Eastern Time (ET)

**Support:**
- Email: support@abc-io.com

---

## 📁 REFERENCE DOCUMENTATION

All documentation available at:
```
C:\Users\cplexmath\OneDrive\Documents\redot2\
```

**Key Files:**
1. `FINAL_STATUS.md`
2. `launch_readiness_report.md`
3. `project_audit_report.md`
4. `final_system_manifest.json`
5. `docs/VPS_DEPLOYMENT.md`
6. `docs/OWNER_ACTIONS_REQUIRED.md`
7. `docs/BACKUP_AND_RECOVERY.md`

---

## 🏁 SIGN-OFF

**Owner Approval Required:**
- [ ] Exposed secrets rotated
- [ ] Legal documents finalized
- [ ] DNS records verified
- [ ] VPS SSH access confirmed
- [ ] Payment providers configured
- [ ] SMTP provider configured
- [ ] Ready for production launch

**Date:** June 12, 2026
**Owner:** Christopher Porreca
**Status:** Pending owner action

---

*100 Years Nonstop — Always On, Always Yours, Always Here*

**System:** ABC-IO v2.0 (v5.0.0)
**Domain:** https://abc-io.com
