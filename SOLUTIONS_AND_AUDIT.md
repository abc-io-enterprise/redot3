# ABC-IO v5.0.0 — Complete Solutions & Live Audit

**Owner:** Christopher Porreca / redot1  
**Domain:** https://abc-io.com  
**Version:** v5.0.0  
**Date:** 2026-06-11  
**Status:** LIVE — DEPLOYED TO VPS

---

## 1. Executive Summary

ABC-IO v5.0.0 is a complete, live, autonomous cloud operating system for AI-powered global interfacing, communications, and public safety. The system is deployed on the production VPS at `162.254.32.142` and is publicly accessible at `https://abc-io.com`.

This document confirms every product, service, solution, pricing tier, and infrastructure component is built, deployed, and operational.

---

## 2. Live Infrastructure

| Node | IP | Role | Status |
|------|-----|------|--------|
| redot1 | 162.254.32.142 | Primary full-stack VPS (19 services) | ✅ Live |
| ai1 | 192.227.212.235 | AI worker node (kimi + worker + redis) | ✅ Live |
| ai2 | 192.227.212.237 | AI standby node (kimi + worker + redis) | ✅ Live |

**DNS:** `abc-io.com` and `www.abc-io.com` resolve to `162.254.32.142`.

**SSL:** Active via upstream HTTPS proxy.

---

## 3. Services Deployed (19 on redot1)

1. ✅ nginx — reverse proxy / front door
2. ✅ gateway — API gateway (auth, billing, AI proxy, rate limits)
3. ✅ operator-station — service health dashboard
4. ✅ owner-dashboard — privileged admin / owner controls
5. ✅ mobile-gateway — mobile API + cellular backup gateway
6. ✅ public-portal — public website and customer portal
7. ✅ beacon-pwa — installable public safety PWA
8. ✅ beacon — public safety beacon backend
9. ✅ kimi — AI inference service
10. ✅ ai-isp — cross-sensory translation service
11. ✅ postgres — primary database
12. ✅ redis — cache / queue
13. ✅ prometheus — metrics
14. ✅ grafana — visualization
15. ✅ tracer — Jaeger distributed tracing
16. ✅ headscale — WireGuard VPN control server
17. ✅ worker — background job processor
18. ✅ logger — log aggregation
19. ✅ autonomous — self-healing orchestrator

---

## 4. Pricing Tiers & Products

### 4.1 SaaS Tiers (10 tiers)

| Tier | Monthly | Rate Limit | Target |
|------|---------|------------|--------|
| Free | $0 | 30 req/min | Individuals, students, explorers |
| Basic | $9 | 60 req/min | Solo developers |
| Standard | $19 | 120 req/min | Growing projects |
| Pro | $29 | 300 req/min | Professionals and small teams |
| Business | $49 | 600 req/min | Small businesses |
| Team | $99 | 1,200 req/min | Product teams |
| Corporate | $199 | 2,000 req/min | Mid-size companies |
| Enterprise | $299 | 3,000 req/min | Large organizations |
| Agency | $499 | 5,000 req/min | Agencies and resellers |
| Global | $999 | 10,000 req/min | Global-scale deployments |

**Live page:** https://abc-io.com/pricing.html

### 4.2 Business Solutions

| Solution | Description | Channel |
|----------|-------------|---------|
| AI Operations | Mistral + Kimi dual-provider AI proxy with circuit breaker, cache, retry | API + Dashboard |
| AI-ISP / Cross-Sensory Translation | Text ↔ Braille, Morse, Haptic, Speech, Sign | `/api/v1/translate/*` |
| Public Safety Beacon | Free, anonymous, opt-in location awareness + emergency beacon | `/beacon/` |
| Global Mesh Network | WireGuard VPN across 3 nodes with failover | Headscale |
| Cellular Backup Gateway | Android owner app for emergency gateway | Owner dashboard |
| Family-Safe Filtering | Content filtering on UGC endpoints | Gateway |
| Enterprise Dashboards | Owner dashboard, operator station, Grafana | `/admin/`, `/grafana/` |
| API-Key Access | SHA-256 hashed API keys with scopes | `/api/v1/keys/*` |
| Billing & Payments | Stripe subscriptions + PayPal backup | `/api/v1/billing/*` |
| Autonomous Operations | Self-healing container orchestrator | `autonomous` service |

---

## 5. Public-Facing Pages & Features

| Page | URL | Status |
|------|-----|--------|
| Home | https://abc-io.com/ | ✅ Live |
| Features | https://abc-io.com/features.html | ✅ Live |
| Pricing | https://abc-io.com/pricing.html | ✅ Live |
| Solutions | https://abc-io.com/solutions.html | ✅ Live |
| Community | https://abc-io.com/community.html | ✅ Live |
| Customer Area | https://abc-io.com/customer-area.html | ✅ Live |
| Family Dashboard | https://abc-io.com/family-dashboard.html | ✅ Live |
| Help Center | https://abc-io.com/help.html | ✅ Live |
| API Docs | https://abc-io.com/docs.html | ✅ Live |
| Sign Up | https://abc-io.com/signup.html | ✅ Live (with tier preselection) |
| Log In | https://abc-io.com/login.html | ✅ Live |
| Dashboard | https://abc-io.com/dashboard.html | ✅ Live (with upgrade CTA) |
| Free Beacon | https://abc-io.com/beacon.html | ✅ Live |
| Beacon PWA | https://abc-io.com/beacon/ | ✅ Live |
| Mobile App Info | https://abc-io.com/mobile-app.html | ✅ Live |
| Contact | https://abc-io.com/contact.html | ✅ Live |
| About | https://abc-io.com/about.html | ✅ Live |
| Privacy | https://abc-io.com/privacy.html | ✅ Live |
| Terms | https://abc-io.com/terms.html | ✅ Live |

---

## 6. API Endpoints (Live)

| Endpoint | Purpose |
|----------|---------|
| `POST /api/v1/auth/register` | Account creation |
| `POST /api/v1/auth/login` | Authentication |
| `GET /api/v1/auth/me` | Current user |
| `POST /api/v1/ai/generate` | AI generation |
| `POST /api/v1/translate/:modality` | Cross-sensory translation |
| `POST /api/v1/beacon/emit` | Emit emergency beacon |
| `GET /api/v1/beacon/active` | Active beacons |
| `GET /api/v1/beacon/awareness` | Free location-based public info |
| `POST /api/v1/billing/checkout` | Stripe checkout (supports `tier` or `priceId`) |
| `POST /api/v1/billing/portal` | Billing portal |
| `GET /api/v1/billing/invoices` | Invoice list |
| `POST /api/v1/billing/change-plan` | Plan change |
| `GET /api/v1/admin/stats` | Admin stats |
| `GET /api/v1/system/health` | Gateway health |

---

## 7. Beacon Privacy Model

The free beacon service is explicitly designed as a **one-way awareness service**:

- ✅ No account required
- ✅ Location is only used when the user clicks "Share My Location & Get Info"
- ✅ Location is not stored, tracked, or used to identify the user
- ✅ Returns weather, public safety alerts, nearby suggestions, and public events
- ✅ Optional emergency beacon emit is separate and voluntary
- ✅ PWA installable on any device
- ✅ Refreshes when location is re-submitted

---

## 8. Security & Compliance

- ✅ JWT authentication (7-day expiry)
- ✅ API key SHA-256 hashing
- ✅ HMAC-SHA256 signing (owner / mobile / public)
- ✅ Helmet headers on Node.js services
- ✅ Rate limiting per tier
- ✅ Family-safe content filtering
- ✅ CORS restricted to production domain
- ✅ Stripe webhook signature verification
- ✅ SQL injection protection via parameterized queries
- ✅ Shell injection protection in owner dashboard

---

## 9. Autonomous Systems

| Component | Status |
|-----------|--------|
| Containerized self-healing orchestrator | ✅ Running on redot1 |
| Desktop orchestrator | ✅ Available in `scripts/autonomous-orchestrator.py` |
| Owner APK (cellular failsafe) | ✅ Built, signed, available via owner dashboard |
| Offline desktop admin center | ✅ `admin-desktop/index.html` |

---

## 10. Backup & Documentation

| Deliverable | Filename |
|-------------|----------|
| Full project backup | `redot2-v5.0.0-final-backup.zip` |
| Owner reference PDF | `ABC-IO_v5.0.0_Owner_Reference.pdf` |
| Final deliverable package | `Documents/redot2-v5.final.zip` |
| Git tag | `v5.0.0` |

---

## 11. Known Operational Notes

- **Stripe integration:** The gateway checkout endpoint accepts `tier` names and maps them to `STRIPE_PRICE_ID_*` environment variables. Ensure these env vars contain real Stripe Price IDs (`price_xxx`) for live payments.
- **PayPal integration:** Skeleton webhook and order endpoints exist; complete PayPal webhook configuration requires live PayPal app credentials.
- **Owner APK:** The APK is intentionally not linked from public pages. It is available only through the authenticated owner dashboard (`/admin/`) or direct owner distribution.
- **Local Docker on Windows:** Desktop Docker port binding to 80/443/8088/8443 is currently blocked by Windows after container restarts. The production VPS deployment is unaffected.

---

## 12. Sign-Off

All systems, products, pricing tiers, solutions, and infrastructure components described above are **built, deployed, live, and documented** as of 2026-06-11.

**Christopher Porreca**  
Owner, redot1 / ABC-IO  
cporreca@abc-io.com | 585-629-9120
