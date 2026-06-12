# ABC-IO v2.0 Billing Guide

## Purpose

This document describes how billing, subscriptions, and product add-ons work in ABC-IO v2.0, and how to configure the Stripe-first payment flow safely.

## Overview

- **Primary payment provider:** Stripe (checkout sessions and webhooks).
- **Secondary provider:** PayPal (skeleton endpoints present; not required for launch).
- **Tiers:** ten account tiers mapped to Stripe price IDs.
- **Add-ons:** products such as mobile cellular node, AI-ISP premium translation, and enterprise support.
- **Activation flow:** a paid tier or add-on is activated only after Stripe confirms payment via webhook.

## Account tier to Stripe price mapping

| Tier | Environment variable | Typical use |
|---|---|---|
| free | `STRIPE_PRICE_ID_FREE` | Entry-level onboarding |
| basic | `STRIPE_PRICE_ID_BASIC` | Expanded personal access |
| standard | `STRIPE_PRICE_ID_STANDARD` | Higher usage |
| pro | `STRIPE_PRICE_ID_PRO` | Professional use |
| business | `STRIPE_PRICE_ID_BUSINESS` | Small business/team |
| team | `STRIPE_PRICE_ID_TEAM` | Larger team |
| corporate | `STRIPE_PRICE_ID_CORPORATE` | Corporate scale |
| enterprise | `STRIPE_PRICE_ID_ENTERPRISE` | Enterprise support |
| agency | `STRIPE_PRICE_ID_AGENCY` | Agency/high volume |
| global | `STRIPE_PRICE_ID_GLOBAL` | Global scale |

## Product add-ons

| Slug | Type | Min tier | Billing interval |
|---|---|---|---|
| `global-sensory-interface-communications` | Feature | free | included |
| `mobile-cellular-node` | Add-on | basic | monthly |
| `ai-isp-premium` | Add-on | pro | monthly |
| `enterprise-support` | Add-on | enterprise | monthly |

## Billing endpoints

- `POST /api/v1/billing/checkout` — create a Stripe Checkout session for a tier or add-on.
- `POST /api/v1/billing/webhook` — receive Stripe lifecycle events.
- `GET /api/v1/account/products` — list public products and current account purchases.
- `POST /api/v1/account/products/:productId/checkout` — checkout a product add-on.

## Stripe webhook events handled

- `checkout.session.completed` — activate the tier or add-on.
- `invoice.payment_failed` — notify the account; downgrade after repeated failures.
- `customer.subscription.deleted` — revert to the free tier.

## Configuration steps

1. In the Stripe Dashboard, create products and prices for each tier and add-on.
2. Copy each live price ID into the matching `STRIPE_PRICE_ID_*` variable.
3. Set `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` in `.env`.
4. Register the webhook endpoint:
   - URL: `https://abc-io.com/api/v1/billing/webhook`
   - Events: `checkout.session.completed`, `invoice.payment_failed`, `customer.subscription.deleted`
5. Set `PUBLIC_URL=https://abc-io.com`.
6. Redeploy `gateway`.

## Test-mode validation

```bash
# Use test keys and test price IDs
curl -X POST https://abc-io.com/api/v1/billing/checkout \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"tier":"basic"}'

# Verify webhook signature
curl -X POST https://abc-io.com/api/v1/billing/webhook \
  -H "Content-Type: application/json" \
  -H "Stripe-Signature: test" \
  -d '{"type":"test"}'
```

A successful checkout returns a Stripe session URL. Webhook processing can be observed in `gateway` logs.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: Stripe account with live products, prices, and webhook signing secret
- reason: paid tier activation and subscription lifecycle cannot proceed without Stripe credentials and price IDs
- where it is needed: Stripe Dashboard, `.env`, and GitHub Repository Secrets
- exact steps:
  1. Create or sign in to the Stripe Dashboard.
  2. Create products for each tier and add-on.
  3. Create prices and copy each price ID into the matching `STRIPE_PRICE_ID_*` environment variable.
  4. Copy the live secret key into `STRIPE_SECRET_KEY`.
  5. Register `https://abc-io.com/api/v1/billing/webhook` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
  6. Sync variables to GitHub Repository Secrets and redeploy `gateway`.
- verification method: complete a test-mode checkout and confirm the webhook updates the `accounts.tier` column in `postgres`

`ACTION REQUIRED FROM OWNER`
- item needed: approval to switch from Stripe test mode to live mode
- reason: live mode begins charging real cards and must happen only after test validation
- where it is needed: Stripe Dashboard and production `.env`
- exact steps:
  1. Validate checkout, success/cancel URLs, webhook delivery, and tier upgrades in test mode.
  2. Replace test `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` with live values.
  3. Replace test `STRIPE_PRICE_ID_*` values with live price IDs.
  4. Redeploy `gateway`.
  5. Run a small live transaction and verify the account tier updates.
- verification method: a live checkout completes, Stripe reports a successful payment, and the account shows the purchased tier

## Verification

After configuration:

```bash
# Confirm gateway billing routes respond
curl -s https://abc-io.com/api/v1/billing/webhook -X POST -H "Content-Type: application/json" -H "Stripe-Signature: test" -d '{"type":"test"}'

# Verify account products list
curl -s -H "Authorization: Bearer <JWT_TOKEN>" https://abc-io.com/api/v1/account/products

# Inspect database tier state
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io -c "SELECT id, name, tier, status FROM accounts;"
```

All billing endpoints must return expected payloads and database state must match the webhook events.
