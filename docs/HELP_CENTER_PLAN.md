# ABC-IO v2.0 Help Center Plan

## Purpose

This document plans the public help center, support routing, and internal operator documentation needed to keep users informed and to meet the published support commitment.

## Overview

The help center is served by `public-portal` and complemented by the `account-pwa`, `interface-pwa`, and `beacon-pwa`. Public support is available through:

- Help Center articles at `https://abc-io.com/help/`
- Contact Center at `https://abc-io.com/contact/`
- Support email: `support@abc-io.com`
- Public phone: `(585) 348-7120`
- Human support hours: 8am–8pm EST, Monday through Friday
- AI/autonomous assistance: 24/7/365

## Public help articles

| Article | Purpose | Owner bucket |
|---|---|---|
| Getting Started | Account creation, first login, installing PWAs | `my_public` |
| Account Tiers and Pricing | Tier comparison, upgrade/downgrade, billing cycle | `my_public` |
| Installing the Account PWA | `/account/` install on mobile and desktop | `my_public` |
| Using the Cross-Sensory Interface | `/interface/` overview and device pairing | `my_public` |
| Beacon Safety | Emitting, acknowledging, and searching beacons | `my_public` |
| AI Chat and Translation | Using Kimi and AI-ISP services | `ai_public` |
| Billing and Subscriptions | Checkout, receipts, cancellation, refunds | `my_public` |
| Security and Privacy | Passwords, API keys, data isolation | `my_public` |
| Accessibility Statement | Commitment and barrier reporting | `my_public` |
| Contact and Escalation | When and how to reach human support | `my_public` |

## Support routing

| Channel | Availability | Routing |
|---|---|---|
| AI/autonomous triage | 24/7/365 | First response via `kimi` and autonomous workflows |
| Human support | 8am–8pm EST Mon–Fri | `support@abc-io.com`, phone, contact form |
| Accessibility barrier | Human hours priority | Direct human review; autonomous triage stays active |
| Billing issue | Human hours | Stripe Dashboard + owner dashboard review |
| Security incident | 24/7 for critical | `#security`, `security@abc-io.com`, on-call SRE |

## Operator documentation

Internal runbooks should be linked from the help center footer or operator dashboard:

- `docs/ARCHITECTURE.md`
- `docs/DEPLOYMENT.md`
- `docs/OPERATIONS.md`
- `docs/SECURITY.md`
- `docs/BILLING.md`
- `docs/DISASTER_RECOVERY.md`
- `docs/BACKUP_AND_RECOVERY.md`

## Article format

Each help article should:

1. Use the same title, summary, and last-updated date.
2. Include step-by-step instructions.
3. State which account tier is required, if any.
4. Link to related articles.
5. Provide a clear escalation path if the article does not resolve the issue.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: configure the support mailbox `support@abc-io.com` and SMTP relay
- reason: the help center and beacon service send transactional and support email; without SMTP the contact path is broken
- where it is needed: mail provider, `.env`, `gateway`, `beacon`
- exact steps:
  1. Create or confirm the `support@abc-io.com` mailbox with the mail provider.
  2. Obtain SMTP host, port, user, and password.
  3. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `SMTP_URL` in `.env`.
  4. Sync to GitHub Repository Secrets.
  5. Restart `gateway` and `beacon`.
- verification method: send a test message from `gateway` or `beacon` and confirm delivery to `support@abc-io.com`

`ACTION REQUIRED FROM OWNER`
- item needed: approve public help center copy and accessibility statement
- reason: published help content represents the business and must be accurate before launch
- where it is needed: `services/public-portal/src/public/help/` and accessibility page
- exact steps:
  1. Review each help article for accuracy, tone, and brand alignment.
  2. Confirm support hours and contact information match public commitments.
  3. Merge the reviewed copy through the normal PR process.
  4. Deploy `public-portal`.
- verification method: `curl https://abc-io.com/help/` returns the approved content and all linked pages load

## Verification

```bash
# Confirm help and contact pages load
curl -s https://abc-io.com/help/ | grep -i "help center"
curl -s https://abc-io.com/contact/ | grep -i "support@abc-io.com"

# Test SMTP from beacon context
docker compose -f compose.prod.yml exec beacon node -e "const nodemailer=require('nodemailer'); /* send test */"

# Confirm human-hours messaging is consistent across pages
grep -R "8am" services/public-portal/src/public/
grep -R "support@abc-io.com" services/public-portal/src/public/
```

Expected: all help pages load, contact information is consistent, and a test email reaches the support mailbox.
