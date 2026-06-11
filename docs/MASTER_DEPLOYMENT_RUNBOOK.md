# ABC-IO v2.0 — Master Deployment Runbook

**Project:** redot2  
**Domain:** abc-io.com  
**Contact:** cporreca@abc-io.com | https://abc-io.com | 585-629-9120  
**Status:** PRODUCTION READY  

---

## Table of Contents

1. [Pre-Deployment Checklist](#1-pre-deployment-checklist)
2. [Infrastructure Overview](#2-infrastructure-overview)
3. [VPS Node Provisioning](#3-vps-node-provisioning)
4. [Security Hardening](#4-security-hardening)
5. [Namecheap DNS Configuration](#5-namecheap-dns-configuration)
6. [GitHub Backup](#6-github-backup)
7. [Production Deployment](#7-production-deployment)
8. [Verification Procedures](#8-verification-procedures)
9. [External Public Verification](#9-external-public-verification)
10. [Rollback Procedures](#10-rollback-procedures)
11. [Go-Live Sign-Off](#11-go-live-sign-off)

---

## 1. Pre-Deployment Checklist

### 1.1 Verify Local Codebase Completeness

```bash
# Run from project root
docker compose -f docker-compose.yml config > /dev/null && echo "Local compose: VALID"
docker compose -f compose.prod.yml config > /dev/null && echo "Prod compose: VALID"
docker compose -f compose.dev.yml config > /dev/null && echo "Dev compose: VALID"
```

### 1.2 Required Secrets Inventory

| Secret | Source | Used By |
|---|---|---|
| `POSTGRES_PASSWORD` | Generate 32-char random | postgres, gateway |
| `JWT_SECRET` | Generate 32-byte hex | gateway |
| `OWNER_SIGNING_KEY` | Generate 32-byte hex | owner-dashboard, gateway |
| `OWNER_SIGNING_FINGERPRINT` | Generate 16-char hex | owner-dashboard |
| `OWNER_SESSION_TOKEN` | Generate 32-byte hex | owner-dashboard |
| `OWNER_ACCOUNT_EMAIL` | cporreca@abc-io.com | owner-dashboard |
| `OWNER_ACCOUNT_PASSWORD` | Strong passphrase | owner-dashboard |
| `OWNER_BIOMETRIC_SECRET` | Generate 32-byte hex | owner-dashboard |
| `MOBILE_SIGNING_KEY` | Generate 32-byte hex | mobile-gateway |
| `MOBILE_SIGNING_FINGERPRINT` | Generate 16-char hex | mobile-gateway |
| `PUBLIC_SIGNING_KEY` | Generate 32-byte hex | public-portal |
| `PUBLIC_SIGNING_FINGERPRINT` | Generate 16-char hex | public-portal |
| `STRIPE_SECRET_KEY` | Stripe Dashboard | gateway |
| `STRIPE_WEBHOOK_SECRET` | Stripe Dashboard | gateway |
| `STRIPE_PRICE_ID_*` | Stripe Dashboard (10 tiers) | gateway |
| `PAYPAL_CLIENT_ID` | PayPal Developer | gateway |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer | gateway |
| `PAYPAL_WEBHOOK_ID` | PayPal Developer | gateway |
| `MISTRAL_API_KEY` | Mistral AI Console | kimi |
| `SMTP_URL` / `SMTP_*` | Mail provider | gateway |
| `SELF_HEAL_TOKEN` | Generate 24-byte hex | gateway |
| `GATEWAY_API_KEY` | Generate 24-byte hex | gateway |
| `REDOT1_API_KEY` | Generate 24-byte hex | gateway |
| `NAMECHEAP_*` | Namecheap Account | DNS scripts |

Generate random values:
```bash
openssl rand -hex 32  # For 32-byte secrets
openssl rand -hex 16  # For 16-byte fingerprints
```

### 1.3 Environment File Preparation

```bash
cp .env.example .env
# Edit .env with all production secrets
chmod 600 .env
```

**CRITICAL:** Never commit `.env` to Git.

---

## 2. Infrastructure Overview

### 2.1 Three-Node Cluster Topology

| Node | Role | Public IP | Services |
|---|---|---|---|
| **redot1** | Primary Gateway | 162.254.32.142 | Full 18-service stack |
| **ai1** | AI Worker 1 | 192.227.212.235 | kimi + worker + redis |
| **ai2** | AI Worker 2 | 192.227.212.237 | kimi + worker + redis |

### 2.2 DNS Records (Namecheap)

| Type | Host | Value | TTL |
|---|---|---|---|
| A | @ | 162.254.32.142 | Auto |
| A | www | 162.254.32.142 | Auto |
| A | api | 162.254.32.142 | Auto |
| A | admin | 162.254.32.142 | Auto |
| A | ai1 | 192.227.212.235 | Auto |
| A | ai2 | 192.227.212.237 | Auto |
| A | headscale | 162.254.32.142 | Auto |
| CNAME | grafana | @ | Auto |
| CNAME | prometheus | @ | Auto |

### 2.3 Service Ports (Production)

| Service | External Port | Internal Port |
|---|---|---|
| nginx | 80 / 443 | 80 |
| gateway | — (via nginx) | 4000 |
| operator-station | — (via nginx) | 8080 |
| owner-dashboard | — (via nginx /admin) | 8500 |
| public-portal | — (via nginx) | 8090 |
| mobile-gateway | 5050 | 5050 |
| beacon-pwa | 3005 | 3000 |
| beacon | 3006 | 3000 |
| kimi | 5000 | 5000 |
| ai-isp | 7000 | 7000 |
| postgres | 5432 | 5432 |
| redis | 6379 | 6379 |
| prometheus | 9091 | 9090 |
| grafana | 14000 | 3000 |
| tracer (Jaeger) | 16686 | 16686 |
| headscale | 8085 | 8080 |

---

## 3. VPS Node Provisioning

### 3.1 Bootstrap redot1 (Primary)

```bash
# SSH into redot1
ssh root@162.254.32.142

# Run bootstrap script
./scripts/vps-setup.sh

# Create deploy user and directory
useradd -m -s /bin/bash deploy
mkdir -p /opt/redot2
chown deploy:deploy /opt/redot2

# Install Docker (if vps-setup.sh didn't)
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
systemctl enable docker
systemctl start docker
```

### 3.2 Bootstrap AI Workers

Repeat `vps-setup.sh` on `ai1` and `ai2`.

```bash
# On each AI worker
ssh root@192.227.212.235
./scripts/provision-ai-worker.sh   # Note: script updated for Ubuntu/Debian
```

### 3.3 Headscale VPN Mesh

```bash
# On redot1
docker compose -f compose.prod.yml up -d headscale

# Create headscale namespace and pre-auth keys
docker compose -f compose.prod.yml exec headscale headscale namespaces create abc-io
docker compose -f compose.prod.yml exec headscale headscale preauthkeys create -e 24h -n abc-io

# On ai1 and ai2, install Tailscale client and join mesh
./scripts/setup-headscale-client.sh
```

---

## 4. Security Hardening

### 4.1 UFW Firewall Rules (Each VPS)

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp    # SSH
ufw allow 80/tcp    # HTTP
ufw allow 443/tcp   # HTTPS
ufw allow 5050/tcp  # Mobile Gateway
ufw allow 8085/tcp  # Headscale HTTP
ufw allow 41641/udp # Headscale WireGuard
ufw allow 9091/tcp  # Prometheus (restrict to monitoring IPs in production)
ufw allow 14000/tcp # Grafana (restrict to admin IPs in production)
ufw enable
```

### 4.2 Docker Socket Security

The `owner-dashboard` container requires host Docker socket access. Ensure:
- Socket is mounted read-only: `/var/run/docker.sock:/var/run/docker.sock:ro`
- Deploy user is in `docker` group
- No other containers have socket access

### 4.3 SSL/TLS Certificates

```bash
# On redot1 host
apt install certbot

# Obtain certificates
certbot certonly --standalone -d abc-io.com -d www.abc-io.com

# Certificates will be at:
# /etc/letsencrypt/live/abc-io.com/fullchain.pem
# /etc/letsencrypt/live/abc-io.com/privkey.pem

# Mount into nginx container (update compose.prod.yml volumes):
# - /etc/letsencrypt:/etc/letsencrypt:ro
# - /var/www/certbot:/var/www/certbot:ro
```

After certificates are live, uncomment the HTTPS redirect in `config/nginx.conf`.

### 4.4 Fail2ban (Optional but Recommended)

```bash
apt install fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/access.log
bantime = 600
maxretry = 10
EOF
systemctl restart fail2ban
```

---

## 5. Namecheap DNS Configuration

### 5.1 Manual Configuration

Log in to Namecheap Account Panel:
1. Go to **Domain List** → Manage for `abc-io.com`
2. Navigate to **Advanced DNS**
3. Add the records from Section 2.2

### 5.2 Automated Sync (Requires API Key)

```bash
export NAMECHEAP_VPS_API_KEY="your-api-key"
./scripts/namecheap-dns-sync.sh
```

**Note:** API access may require whitelisting your VPS IP in Namecheap settings.

### 5.3 Verify DNS Propagation

```bash
dig abc-io.com
dig www.abc-io.com
dig api.abc-io.com
```

---

## 6. GitHub Backup

### 6.1 Ensure Repository is Pushed

```bash
# From project root
git remote -v
# Should show: origin  https://github.com/abc-io-enterprise/redot2.git

git add -A
git commit -m "feat: production hardening and deployment readiness"
git tag -a v2.0.0 -m "ABC-IO v2.0.0 Production Release"
git push origin main --tags
```

### 6.2 Upload Secrets to GitHub

```bash
# Upload all .env values to GitHub Repository Secrets
./scripts/set-github-secrets.sh abc-io-enterprise/redot2
```

### 6.3 Enable Branch Protection

```bash
./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 main
```

---

## 7. Production Deployment

### 7.1 Staged Deployment (Recommended for 4GB VPS)

Use the Python staged deploy script to avoid OOM:

```bash
export VPS_REDOT1_PASSWORD="your-root-password"
python3 scripts/deploy-staged-redot1.py
```

This deploys in 7 waves:
1. Infrastructure (postgres, redis, logger)
2. Core Gateway (gateway, public-portal)
3. Dashboards (operator-station, owner-dashboard, mobile-gateway)
4. AI Services (kimi, ai-isp, worker)
5. Beacon Services (beacon, beacon-pwa)
6. Monitoring (prometheus, grafana, tracer)
7. NGINX (nginx)

### 7.2 Full Deployment (If VPS has 8GB+ RAM)

```bash
# On redot1
cd /opt/redot2
git checkout v2.0.0

# Write secrets
cat > .env << 'EOF'
POSTGRES_PASSWORD=<secret>
JWT_SECRET=<secret>
# ... all other secrets
EOF
chmod 600 .env

# Deploy
docker compose -f compose.prod.yml up -d --build --remove-orphans

# Wait for stabilization
sleep 30

# Run health checks
./scripts/health-check.sh
```

### 7.3 Deploy AI Worker Nodes

```bash
# On ai1 and ai2
cd /opt/redot2
git checkout v2.0.0

cat > .env << 'EOF'
AI_PROVIDER=mistral
MISTRAL_API_KEY=<secret>
MISTRAL_MODEL=mistral-medium
MISTRAL_API_BASE_URL=https://api.mistral.ai/v1
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_DB=0
EOF

docker compose -f compose.prod.yml up -d kimi worker redis
```

---

## 8. Verification Procedures

### 8.1 Local Health Checks (On redot1)

```bash
./scripts/health-check.sh
```

Expected output:
```
Checking gateway... ok
Checking operator-station... ok
Checking public-portal... ok
Checking mobile-gateway... ok
Checking owner-dashboard... ok
Checking kimi... ok
Checking beacon... ok
Checking beacon-pwa... ok
Checking ai-isp... ok
Checking nginx... ok
Checking prometheus... ok
Checking grafana... ok
Checking tracer... ok
Checking headscale... ok
Checking postgres... ok
Checking redis... ok
All health checks passed.
```

### 8.2 Operator Station Dashboard

Open `http://162.254.32.142:8080/status` and verify all services show **online**.

### 8.3 Deep System Health

```bash
curl -H "x-owner-token: $OWNER_SESSION_TOKEN" \
  http://localhost:8500/api/system-health
```

### 8.4 Database Connectivity

```bash
docker compose -f compose.prod.yml exec -T postgres psql -U postgres -d abc_io -c "SELECT COUNT(*) FROM users;"
```

### 8.5 AI Service Verification

```bash
curl -X POST http://localhost:4000/api/v1/ai/generate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -d '{"prompt":"Hello, ABC-IO"}'
```

### 8.6 Billing Webhook Verification

```bash
# Stripe webhook signature test
curl -X POST http://localhost:4000/api/v1/billing/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"test"}'
```

---

## 9. External Public Verification

### 9.1 Public Website

```bash
curl -s https://abc-io.com/health
curl -s https://abc-io.com/api/signature
```

Expected:
```json
{"status":"ok","service":"nginx"}
```

### 9.2 API Gateway (via NGINX)

```bash
curl -s https://abc-io.com/api/v1/system/health
```

Expected: Deep health check with DB, Redis, Kimi, Stripe status.

### 9.3 Admin Interface

```bash
curl -s https://abc-io.com/admin/health
```

### 9.4 Mobile Gateway

```bash
curl -s https://abc-io.com:5050/health
```

### 9.5 Beacon Service

```bash
curl -s https://abc-io.com/api/v1/beacon/active
```

### 9.6 SSL Certificate Validity

```bash
openssl s_client -connect abc-io.com:443 -servername abc-io.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

### 9.7 DNS Resolution from External

```bash
# From your local machine
nslookup abc-io.com
nslookup www.abc-io.com
nslookup api.abc-io.com
```

### 9.8 Global Uptime Test

Use external services:
- https://downforeveryoneorjustme.com/abc-io.com
- https://www.ssllabs.com/ssltest/analyze.html?d=abc-io.com

---

## 10. Rollback Procedures

### 10.1 Automatic Rollback Script

```bash
./scripts/auto-rollback.sh
```

This will:
1. Determine the previous Git tag or commit
2. Backup current `.env` and `compose.prod.yml`
3. Checkout the previous version
4. Rebuild and restart services
5. Run smoke tests

### 10.2 Manual Rollback

```bash
cd /opt/redot2

# Identify previous tag
PREVIOUS_TAG=$(git tag --sort=-creatordate | head -n 2 | tail -n 1)

# Checkout and deploy
git checkout $PREVIOUS_TAG
docker compose -f compose.prod.yml down
docker compose -f compose.prod.yml up -d --build

# Verify
sleep 20
./scripts/health-check.sh
```

### 10.3 Emergency Recovery

```bash
./scripts/emergency-recovery.sh
```

This stops all containers, prunes stale resources, and restarts the full stack.

---

## 11. Go-Live Sign-Off

### 11.1 Final Checklist

- [ ] All 18 services healthy on redot1
- [ ] AI worker nodes (ai1, ai2) responding
- [ ] DNS records propagated globally
- [ ] SSL certificates valid and auto-renewing
- [ ] UFW firewall active with correct rules
- [ ] GitHub repository tagged v2.0.0
- [ ] Secrets rotated and stored securely
- [ ] `.env` never committed to Git
- [ ] Health-check script passes 100%
- [ ] Operator Station shows all services online
- [ ] External SSL test passes (A+ rating)
- [ ] Stripe webhooks receiving and verified
- [ ] Email SMTP sending successfully
- [ ] Backup strategy configured (PostgreSQL dumps)
- [ ] Fail2ban active and logging
- [ ] Runbook printed and stored offline

### 11.2 Live Declaration

Once all checks pass, update the project status:

```bash
# Create LIVE marker
echo "ABC-IO v2.0 LIVE at abc-io.com" > LIVE.txt
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> LIVE.txt
echo "Contact: cporreca@abc-io.com | 585-629-9120" >> LIVE.txt

# Commit and push
git add LIVE.txt
git commit -m "docs: mark ABC-IO v2.0 as LIVE"
git push origin main
```

### 11.3 Post-Launch Monitoring

Set up a cron job for auto-healing:

```bash
# Run every 5 minutes
(crontab -l 2>/dev/null; echo "*/5 * * * * /opt/redot2/scripts/auto-heal.sh >> /var/log/abc-io-cron.log 2>&1") | crontab -
```

Set up daily PostgreSQL backups:

```bash
# Daily at 2 AM
(crontab -l 2>/dev/null; echo "0 2 * * * /opt/redot2/scripts/backup-postgres.sh >> /var/log/abc-io-backup.log 2>&1") | crontab -
```

---

## Appendix A: Quick Reference Commands

```bash
# View all running services
docker compose -f compose.prod.yml ps

# View logs for a service
docker compose -f compose.prod.yml logs -f gateway

# Restart a single service
docker compose -f compose.prod.yml restart gateway

# Scale gateway (if needed)
docker compose -f compose.prod.yml up -d --scale gateway=2

# Enter a container
docker compose -f compose.prod.yml exec gateway sh

# Database CLI
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io

# Redis CLI
docker compose -f compose.prod.yml exec redis redis-cli
```

## Appendix B: Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Gateway exits immediately | Missing env vars | Check `JWT_SECRET`, `OWNER_SIGNING_KEY` in `.env` |
| NGINX 502 Bad Gateway | Gateway not healthy | `docker compose -f compose.prod.yml restart gateway` |
| Beacon proxy fails | Wrong port | Already fixed in source; rebuild gateway image |
| Owner dashboard 403 | Wrong token | Verify `x-owner-token` header matches `.env` |
| Kimi AI timeout | No API key | Set `MISTRAL_API_KEY` or check offline fallback |
| Worker shows unknown | No HTTP server | Expected behavior; check Redis connectivity instead |
| SSL cert errors | Certbot not run | Execute certbot steps in Section 4.3 |

## Appendix C: Contact & Escalation

| Role | Contact | Method |
|---|---|---|
| Primary Owner | cporreca@abc-io.com | Email / Phone |
| Technical Lead | https://abc-io.com | Website contact form |
| Emergency | 585-629-9120 | Phone |
| Security Incidents | security@abc-io.com | Encrypted email |

---

**Document Version:** 2.0.0  
**Last Updated:** 2026-06-10  
**Next Review:** 2026-07-10
