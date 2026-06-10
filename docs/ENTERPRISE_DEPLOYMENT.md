# Enterprise Deployment Guide - ABC-IO v2.0

## GITHUB ENTERPRISE SETUP

1. Create Organization at github.com/settings/organizations
   - Name: abc-io-enterprises
   - Email: cporreca@abc-io.com

2. Enable Enterprise Billing
   - Go to github.com/enterprises
   - Link organization

3. Add Team Members
   - Owner: cporreca@abc-io.com
   - Admin: operator@abc-io.com
   - Require 2FA for all users

4. Repository Settings
   - Create repo: redot2 (public)
   - Branch protection: main branch
   - Require: 1 review, status checks pass

5. Secrets Management
   - POSTGRES_PASSWORD: 32+ random chars
   - VPS_SSH_KEY: Ed25519 private key
   - VPS_HOST: abc-io.com
   - PROD_ENV_FILE: Full .env content

## NAMECHEAP INTEGRATION

1. Register Domain: abc-io.com
2. Configure DNS:
   - A record @ → VPS IP
   - CNAME redot1 → abc-io.com
   - CNAME ai1 → abc-io.com
   - CNAME ai2 → abc-io.com

3. SSL Certificate: Auto via Let''s Encrypt
   - Domains: abc-io.com, *.abc-io.com
   - Renewal: Automatic (90 days)

## VPS DEPLOYMENT

1. Provision Ubuntu 22.04 LTS (2GB+ RAM)
2. Bootstrap: bash scripts/vps-setup.sh
3. Deploy: bash scripts/vps-deploy.sh <REPO_URL> v1.0.0
4. Configure: nano .env (add secrets)
5. Verify: docker compose ps && ./scripts/health-check.sh

## THREE-NODE INFRASTRUCTURE

### Primary Node (redot1.abc-io.com)
- All 14 services
- Database: PostgreSQL primary
- Cache: Redis primary

### AI Node 1 (ai1.abc-io.com)
- Kimi service (AI inference)
- Worker service (background jobs)

### AI Node 2 (ai2.abc-io.com)
- Kimi service (AI inference)
- Worker service (background jobs)

All nodes:
- Sync via Git
- Monitor via Prometheus
- Log via centralized stack

## SECURITY CHECKLIST

- [x] .env excluded from Git
- [x] Secrets in GitHub Actions Secrets
- [x] SSH key-based auth
- [x] Firewall enabled (UFW)
- [x] HTTPS/TLS configured
- [x] 2FA mandatory
- [x] Regular backups
- [x] Monitoring enabled
- [x] Logging centralized
- [x] Key rotation scheduled

## OPERATIONAL DASHBOARD

Access: http://localhost:8500 (owner dashboard)
Features:
- APK backup status and download
- Service health monitoring
- Beacon relay for mobile
- Owner authentication and signing

Operational Station: http://localhost:8080
- Cross-service status check
- Quick operational links
- System health overview

## BACKUP & DISASTER RECOVERY

1. Daily Automated Backups
   - Database: PostgreSQL backup
   - Files: Rsync to offsite
   - Encryption: AES-256

2. Recovery Procedures
   - RTO: 15 minutes (critical systems)
   - RPO: 1 hour (data loss acceptable)
   - Tested monthly

3. Backup Verification
   - Automated restore tests
   - Documented procedures
   - Owner notification

## MOBILE CELLULAR FAILOVER

1. APK Available For Download
   - Owner Dashboard: /download/apk
   - Secure local backup storage

2. Mobile Beacon Relay
   - Location tracking via beacon
   - Cellular fallback when public system offline
   - Battery monitoring

3. Owner Device Configuration
   - Mobile app connects to gateway
   - Beacon relay sends position
   - Fallback routing via cellular

## SUPPORT & ESCALATION

L1 Support: On-site (8am-5pm)
- Basic troubleshooting
- Service restarts
- Log review

L2 Support: On-call (8pm-8am)
- Deep troubleshooting
- Emergency patches
- System recovery

Emergency Contact: cporreca@abc-io.com
Phone: +1-585-629-9120

## STATUS: LIVE AND OPERATIONAL

All components deployed and verified:
✅ Local Docker Desktop environment
✅ GitHub Enterprise repository
✅ VPS deployment automation
✅ APK build and distribution
✅ Mobile cellular failover
✅ Security and key management
✅ Operational dashboards
✅ Monitoring and alerting

System is ready for 24/7 production use.
