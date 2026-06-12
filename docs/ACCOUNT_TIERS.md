# ABC-IO v2.0 Account Tiers Guide

## Purpose

This document defines the account tier model, rate limits, monthly quotas, product entitlements, and the administrative setup required to offer tiered access.

## Overview

ABC-IO supports ten account tiers. Each tier carries a per-minute rate limit, a monthly usage quota, and access to products/add-ons. Tiers are stored in the `accounts.tier` column and enforced by `gateway` middleware.

## Tier definitions

| Tier | Typical audience | Per-minute limit | Monthly quota | Notes |
|---|---|---|---|---|
| free | Public visitors and trial accounts | 30 | 1,000 | Always-free base product |
| basic | Individual users | 60 | 5,000 | Minimum tier for mobile-cellular add-on |
| standard | Power users | 120 | 10,000 | — |
| pro | Professionals | 300 | 50,000 | Minimum tier for AI-ISP premium add-on |
| business | Small businesses/teams | 600 | 100,000 | Team-oriented features |
| team | Larger teams | 1,200 | 200,000 | — |
| corporate | Corporate scale | 2,000 | 500,000 | — |
| enterprise | Enterprise accounts | 3,000 | 1,000,000 | Minimum tier for enterprise support add-on |
| agency | Agencies/high volume | 5,000 | 5,000,000 | — |
| global | Global scale | 10,000 | 10,000,000 | Highest throughput |

## Tier enforcement

- `gateway` reads the tier from the JWT or API key record.
- `tierRateLimit(req)` returns the per-minute limit.
- `tierMonthlyQuota(req)` returns the monthly cap.
- Exceeding either returns HTTP 429 with the tier name and usage metadata.

## Product catalog

| Slug | Name | Type | Min tier | Price (cents) | Billing interval | Features |
|---|---|---|---|---|---|---|
| `global-sensory-interface-communications` | Global Sensory Interface Communications Provider | feature | free | 0 | included | Account messaging, cross-sensory relay, cellular/satellite failover awareness, multi-device sync |
| `mobile-cellular-node` | Mobile Cellular Node License | add-on | basic | 4999 | month | Cellular backup node, priority routing, beacon relay, emergency message cache |
| `ai-isp-premium` | AI-ISP Premium Translation Pack | add-on | pro | 1999 | month | Priority translation queue, expanded modalities, higher rate limits |
| `enterprise-support` | Enterprise 24/7 Support | add-on | enterprise | 49900 | month | 24/7 human escalation, dedicated operator channel, quarterly review |

## Account-scoped features

- `conversations` and `direct_messages` are scoped to users within the same account.
- `account_products` tracks purchased add-ons and their validity periods.
- `usage_logs` records requests for quota enforcement.
- `subscriptions` stores Stripe subscription state.

## Owner and operator seeding

Run after database initialization:

```bash
node scripts/seed-owner-accounts.js
```

This creates:

| Email | Account | Tier | Role | Status |
|---|---|---|---|---|
| `cporreca@abc-io.com` | Owner Account | free | owner | active |
| `cplexmath@abc-io.com` | System Operator | enterprise | owner | deactivated |

The script prints temporary passwords to stdout. Rotate them immediately and never commit the output.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: create Stripe products and price IDs for every tier
- reason: `gateway` maps each tier to a `STRIPE_PRICE_ID_*` variable; missing IDs block checkout for that tier
- where it is needed: Stripe Dashboard, `.env`, and GitHub Repository Secrets
- exact steps:
  1. In Stripe, create one product per tier and one price per product.
  2. Copy each price ID into `.env` as `STRIPE_PRICE_ID_FREE`, `STRIPE_PRICE_ID_BASIC`, … `STRIPE_PRICE_ID_GLOBAL`.
  3. Sync the variables to GitHub Repository Secrets.
  4. Restart `gateway`.
- verification method: `POST /api/v1/billing/checkout` with each tier returns a valid Stripe session URL

`ACTION REQUIRED FROM OWNER`
- item needed: rotate the temporary passwords printed by `seed-owner-accounts.js`
- reason: the seed script outputs plaintext passwords to stdout, which must not remain in effect
- where it is needed: `owner-dashboard` login and database `users.password_hash`
- exact steps:
  1. Log in to the owner dashboard with the seeded credentials.
  2. Use the password-reset or profile flow to set a strong passphrase.
  3. Store the new password in the enterprise password manager.
  4. If the operator account is needed, activate it and set a passphrase.
- verification method: `owner-dashboard` login succeeds only with the new password and the seeded temporary password no longer works

## Verification

```bash
# Confirm tier limits are enforced
curl -s -H "Authorization: Bearer <free-tier-token>" https://abc-io.com/api/v1/ai/generate \
  -H "Content-Type: application/json" -d '{"prompt":"test"}'
# Repeat until limit is hit; expect HTTP 429

# Inspect tier column
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT name, tier, status FROM accounts;"

# List products for an account
curl -s -H "Authorization: Bearer <token>" https://abc-io.com/api/v1/account/products
```

Expected: limits match the table above, products are visible, and seed accounts exist with correct roles.
