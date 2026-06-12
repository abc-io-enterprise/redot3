# ABC-IO v2.0 Architecture Guide

## Purpose

This document describes the high-level architecture of ABC-IO v2.0 (`redot2`). It maps the containerized service layers, data flows, owner-controlled boundaries, and verification points needed to operate the platform.

## Overview

ABC-IO v2.0 is a Docker Compose-orchestrated platform with five logical layers:

1. **Edge and routing** — NGINX terminates TLS and routes public/private traffic.
2. **API and control plane** — `gateway`, `owner-dashboard`, `operator-station`, and `mobile-gateway` provide public APIs, admin controls, status visibility, and mobile/cellular failover.
3. **Public and account surfaces** — `public-portal`, `beacon-pwa`, `account-pwa`, and `interface-pwa` serve marketing, help, account, and cross-sensory interface experiences.
4. **AI and worker services** — `kimi`, `ai-isp`, `worker`, and `autonomous` run inference, translation, background jobs, and self-healing.
5. **Infrastructure and observability** — `postgres`, `redis`, `prometheus`, `grafana`, `tracer` (Jaeger), `headscale`, and `logger` provide persistence, caching, metrics, tracing, VPN mesh, and logging placeholders.

## Service map

| Service | Runtime | Entry file | Exposed port (local) | Role |
|---|---|---|---|---|
| `nginx` | nginx stable-alpine | `config/nginx.conf` + `config/locations.conf` | `8088` | Reverse proxy and static routing |
| `gateway` | Node.js 20 Alpine | `services/gateway/src/index.js` | `4000` | Central API gateway, auth, billing, rate limits |
| `operator-station` | Node.js 20 Alpine | `services/operator-station/src/index.js` | `8080` | Operations status dashboard |
| `owner-dashboard` | Node.js 20 Alpine | `services/owner-dashboard/src/index.js` | `8500` | Privileged owner/admin control plane |
| `mobile-gateway` | Node.js 20 Alpine | `services/mobile-gateway/src/index.js` | `5050` | Mobile/cellular/satellite gateway with HMAC signing |
| `public-portal` | Node.js 20 Alpine | `services/public-portal/src/index.js` | via nginx | Public marketing/help site |
| `beacon-pwa` | Node.js 20 Alpine | `services/beacon-pwa/server.js` | `3005` | Beacon Progressive Web App |
| `account-pwa` | Node.js 20 Alpine | `services/account-pwa/server.js` | `8100` | Account-aware PWA |
| `interface-pwa` | Node.js 20 Alpine | `services/interface-pwa/server.js` | `8110` | Cross-sensory interface PWA |
| `beacon` | Node.js 20 Alpine | `services/beacon/src/index.js` | `3006` | Public-safety beacon backend |
| `kimi` | Python 3.12 slim | `services/kimi/app.py` | `5000` | Mistral/Kimi AI adapter |
| `ai-isp` | Python 3.11 slim | `services/ai-isp/src/app.py` | `7000` | Cross-sensory translation engine |
| `worker` | Python 3.12 Alpine | `services/worker/worker.py` | headless | Background job processor |
| `autonomous` | Python 3.12 Alpine | `services/autonomous/orchestrator.py` | headless | Self-healing orchestrator |
| `postgres` | PostgreSQL 15 Alpine | `services/postgres/init.sql` | `5432` | Relational database |
| `redis` | Redis Alpine | — | `6379` | Cache and job queue |
| `prometheus` | prom/prometheus | `config/prometheus.yml` | `9091` | Metrics scraper |
| `grafana` | grafana/grafana | — | `14000` | Metrics visualization |
| `tracer` | jaegertracing/all-in-one | — | `16686` | Distributed tracing |
| `headscale` | headscale/headscale | `config/headscale/config.yaml` | `8085` / `9095` / `41641/udp` | WireGuard VPN control server |
| `logger` | busybox | — | headless | Placeholder logging loop |

## Data flow

1. Public traffic enters through `nginx` on port `8088` (local) or `443` (production).
2. `nginx` routes `/api/v1/*` to `gateway`, `/admin/*` to `owner-dashboard`, `/account/*` to `account-pwa`, `/interface/*` to `interface-pwa`, and public pages to `public-portal`.
3. `gateway` authenticates JWT or API keys, enforces tier rate limits, and proxies to `kimi`, `ai-isp`, `beacon`, or `postgres`/`redis` as needed.
4. `owner-dashboard` reads `OWNER_SESSION_TOKEN` to authorize lifecycle commands issued against the Docker socket.
5. `mobile-gateway` signs requests with `MOBILE_SIGNING_KEY` and caches emergency messages in `redis`.
6. `worker` consumes `redot2:jobs:queue` from `redis`; `autonomous` observes service health and restarts containers.
7. `postgres` persists accounts, users, subscriptions, products, messages, beacons, and usage logs.

## Owner-gated boundaries

`ACTION REQUIRED FROM OWNER`
- item needed: TLS/SSL certificate for `abc-io.com` and `*.abc-io.com`
- reason: `nginx` terminates TLS in production; without valid certificates HTTPS requests will fail or trigger browser warnings
- where it is needed: primary VPS host and any production reverse proxy
- exact steps:
  1. Provision a VPS with a public IP.
  2. Install Certbot (`apt install certbot`).
  3. Run `certbot certonly --standalone -d abc-io.com -d www.abc-io.com`.
  4. Mount `/etc/letsencrypt` read-only into the `nginx` container in `compose.prod.yml`.
  5. Uncomment the HTTPS redirect in `config/nginx.conf`.
- verification method: `openssl s_client -connect abc-io.com:443 -servername abc-io.com` shows a valid, unexpired certificate

`ACTION REQUIRED FROM OWNER`
- item needed: live credentials for AI providers (`MISTRAL_API_KEY`, optional `KIMI_API_KEY`)
- reason: `kimi` proxies AI requests to Mistral or Kimi; missing keys force the service into offline fallback mode
- where it is needed: `.env`, GitHub Repository Secrets, and the `kimi` container environment
- exact steps:
  1. Create or sign in to the Mistral AI console and Kimi console.
  2. Generate production API keys.
  3. Set `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, `KIMI_API_KEY`, `KIMI_MODEL`, and `KIMI_API_BASE_URL` in `.env` and GitHub Repository Secrets.
  4. Redeploy the `kimi` service.
- verification method: `curl https://abc-io.com/api/v1/ai/health` returns `ok` with the configured provider reachable

`ACTION REQUIRED FROM OWNER`
- item needed: payment provider credentials and live product/price IDs in Stripe
- reason: billing checkout, webhooks, and tier activation depend on Stripe; PayPal is a skeleton only
- where it is needed: `.env`, GitHub Repository Secrets, and the Stripe Dashboard
- exact steps:
  1. Create Stripe products and prices for each tier (`free`, `basic`, `standard`, `pro`, `business`, `team`, `corporate`, `enterprise`, `agency`, `global`).
  2. Copy each price ID into the matching `STRIPE_PRICE_ID_*` environment variable.
  3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET`.
  4. Register the webhook endpoint `https://abc-io.com/api/v1/billing/webhook` in Stripe.
- verification method: create a test-mode checkout session via `POST /api/v1/billing/checkout` and confirm Stripe delivers the event

## Verification

Run the following from the project root:

```bash
# Validate all compose files
docker compose -f docker-compose.yml config > /dev/null && echo "local compose: valid"
docker compose -f compose.prod.yml config > /dev/null && echo "prod compose: valid"

# Start the local stack and check health
docker compose up -d
sleep 20
./scripts/health-check.sh
```

Expected result: every service returns HTTP 200 or passes a TCP check, and the Operator Station dashboard shows all services online.
