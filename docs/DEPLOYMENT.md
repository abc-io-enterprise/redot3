# ABC-IO v2.0 Deployment Guide

## Purpose

This guide describes how to deploy ABC-IO v2.0 across local development, staging, production, and replica AI worker nodes. It covers environment selection, secret injection, deployment order, rollback, and owner-controlled checkpoints.

## Overview

ABC-IO ships with five compose files:

| Environment | Compose file | Use case |
|---|---|---|
| Development | `docker-compose.yml` | Full local stack on non-standard host ports |
| Live-reload dev | `compose.dev.yml` | `gateway`, `operator-station`, `postgres` with source mounts |
| Staging | `compose.staging.yml` | Pre-production integration validation |
| Production | `compose.prod.yml` | Live public service on the primary VPS |
| Replica AI-1 | `compose.replica-ai1.yml` | Redundant node on `ai1` |
| Replica AI-2 | `compose.replica-ai2.yml` | Redundant node on `ai2` |

All environments are containerized with Docker Compose and can run independently or as a unified triple-node cluster.

## Pre-deployment

1. Copy and fill `.env`:
   ```bash
   cp .env.example .env
   chmod 600 .env
   ```
2. Generate or obtain values for:
   - `POSTGRES_PASSWORD`
   - `JWT_SECRET`
   - `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`
   - `OWNER_SESSION_TOKEN`
   - `OWNER_ACCOUNT_EMAIL` / `OWNER_ACCOUNT_PASSWORD`
   - `OWNER_BIOMETRIC_SECRET`
   - `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`
   - `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`
   - `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*`
   - `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_WEBHOOK_ID`
   - `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`
   - `KIMI_API_KEY`, `KIMI_MODEL`, `KIMI_API_BASE_URL`
   - `SMTP_*`
   - `GATEWAY_API_KEY`, `SELF_HEAL_TOKEN`, `REDOT1_API_KEY`
3. Validate compose files:
   ```bash
   docker compose -f docker-compose.yml config > /dev/null
   docker compose -f compose.prod.yml config > /dev/null
   docker compose -f compose.staging.yml config > /dev/null
   docker compose -f compose.replica-ai1.yml config > /dev/null
   docker compose -f compose.replica-ai2.yml config > /dev/null
   ```

## Local development

```bash
# Full stack
npm run dev
sleep 20
npm run health

# Or live-reload dev (gateway + operator-station + postgres)
docker compose -f compose.dev.yml up -d
```

## Staging

```bash
docker compose -f compose.staging.yml up -d --build --remove-orphans
sleep 20
./scripts/health-check.sh
```

Use staging to validate portal flows, checkout sessions, webhooks, and failover behavior before promoting to production.

## Production deployment

### Option A: staged deployment (recommended for 4 GB VPS)

```bash
export VPS_REDOT1_PASSWORD="$VPS_REDOT1_PASSWORD"
python3 scripts/deploy-staged-redot1.py
```

The staged deployer applies seven ordered waves:

1. Infrastructure: `postgres`, `redis`, `logger`
2. Core gateway: `gateway`, `public-portal`
3. Dashboards: `operator-station`, `owner-dashboard`, `mobile-gateway`
4. AI services: `kimi`, `ai-isp`, `worker`
5. Beacon services: `beacon`, `beacon-pwa`
6. Monitoring: `prometheus`, `grafana`, `tracer`
7. Edge: `nginx`

### Option B: full deployment (8 GB+ VPS)

On the primary VPS:

```bash
cd /opt/redot2
git checkout <release-tag>
# .env is already present and restricted
docker compose -f compose.prod.yml up -d --build --remove-orphans
sleep 30
./scripts/health-check.sh
```

### AI worker nodes

On each replica node:

```bash
cd /opt/redot2
git checkout <release-tag>
docker compose -f compose.replica-ai1.yml up -d --build --remove-orphans
# or compose.replica-ai2.yml on ai2
./scripts/health-check.sh
```

Replica nodes share the primary `postgres` and `redis` via `DATABASE_URL` and `REDIS_URL`.

## Rollback

```bash
# Automatic rollback to previous tag or commit
./scripts/auto-rollback.sh

# Manual rollback
PREVIOUS_TAG=$(git tag --sort=-creatordate | head -n 2 | tail -n 1)
git checkout "$PREVIOUS_TAG"
docker compose -f compose.prod.yml down
docker compose -f compose.prod.yml up -d --build
sleep 20
./scripts/health-check.sh
```

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: production `.env` populated with real secrets and synchronized to GitHub Repository Secrets
- reason: containers will fail or run in degraded mode if required secrets are missing
- where it is needed: primary VPS, replica nodes, and GitHub Repository Secrets
- exact steps:
  1. Fill `.env` from `.env.example` with production values.
  2. Run `chmod 600 .env` on every host.
  3. Run `./scripts/set-github-secrets.sh abc-io-enterprise/redot2` to push names/values to GitHub Repository Secrets.
  4. Never commit `.env` to Git.
- verification method: `docker compose -f compose.prod.yml config` resolves all `${}` placeholders without error and `gh secret list --repo abc-io-enterprise/redot2` shows the expected names

`ACTION REQUIRED FROM OWNER`
- item needed: Stripe live mode enabled with webhook endpoint registered
- reason: paid tier activation and subscription lifecycle depend on Stripe events reaching `gateway`
- where it is needed: Stripe Dashboard and `PUBLIC_URL` DNS record
- exact steps:
  1. In Stripe, switch from test to live mode after test-mode validation.
  2. Create live products/prices and copy price IDs into `STRIPE_PRICE_ID_*`.
  3. Register `https://abc-io.com/api/v1/billing/webhook` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
  4. Redeploy `gateway`.
- verification method: a live-mode checkout completes and the webhook event updates the account tier in `postgres`

## Verification

After every deployment run:

```bash
./scripts/health-check.sh
./scripts/auto-heal.sh
```

For production also verify:

```bash
curl -s https://abc-io.com/health
curl -s https://abc-io.com/api/v1/system/health
curl -s https://abc-io.com/admin/health
curl -s https://abc-io.com:5050/health
openssl s_client -connect abc-io.com:443 -servername abc-io.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

All checks must pass before declaring `SYSTEM: ON`.
