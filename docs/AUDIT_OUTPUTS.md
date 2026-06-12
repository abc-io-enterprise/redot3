# ABC-IO v2.0 Audit Outputs

**Date:** 2026-06-12
**Repository:** `abc-io-enterprise/redot3`
**Status:** SYSTEM: READY FOR OWNER REVIEW

## Current system map

| Area | Components found | Decision |
|---|---|---|
| Public website | `services/public-portal/src/public/`, live `https://abc-io.com/`, `/pricing.html`, `/help.html` | Keep and maintain |
| React portal | `services/redot3-portal/` | Keep as `/portal/` public SPA |
| API gateway | `services/gateway/src/index.js` | Keep |
| Auth and accounts | JWT, API keys, owner seeding, account PWA | Keep and validate after owner password rotation |
| Billing | Stripe checkout/webhooks, PayPal skeleton | Keep Stripe-first; gate PayPal until owner validates |
| Admin and operations | `owner-dashboard`, `operator-station`, `autonomous`, health scripts | Keep |
| AI and translation | `kimi`, `ai-isp`, `worker` | Keep |
| Beacon | `beacon`, `beacon-pwa` | Keep |
| Infrastructure | Docker Compose, NGINX, Postgres, Redis, Prometheus, Grafana, Headscale | Keep |
| Documentation | `docs/`, `legal/`, manifests, runbooks | Keep and maintain |
| GitHub automation | CI, CodeQL, dependency review, deploy, release, security workflows | Keep |
| Backup/archive | ZIP packaging scripts and `Documents/` archives | Keep and regenerate before release |

## Live public site map inspected

| URL | Observed content | Status |
|---|---|---|
| `https://abc-io.com/` | Home page, navigation, operational status, pricing, contact footer | Reachable |
| `https://abc-io.com/pricing.html` | Pricing tiers and 5 deployment environments | Reachable |
| `https://abc-io.com/help.html` | Help center shell with dynamic article loading | Reachable |

## Missing-items matrix

| Requirement | Repository coverage | Gap | Priority |
|---|---|---|---|
| Public website pages | `public-portal` pages and live site | Keep content consistent across portal and redot3-portal | P1 |
| Accounts and identity | Gateway JWT, owner seeding, account PWA | Owner must rotate seeded passwords and verify login | P0 |
| Purchasable 5-environment model | Compose files and docs | Documented; owner must deploy/verify each target | P1 |
| Four-bucket data isolation | `docs/DATA_ISOLATION.md` | Owner must approve retention/offsite encryption | P0 |
| Billing | Stripe implemented, PayPal skeleton | Stripe live mode and PayPal decision required | P0 |
| Admin and operations | Owner/operator dashboards, autonomous, health scripts | VPS deployment and monitoring verification required | P0 |
| Help/docs/support | Docs and legal present | Public help article content should be reviewed | P1 |
| Namecheap deployment | `docs/NAMECHEAP_DEPLOYMENT.md` and scripts | Owner must configure DNS | P0 |
| VPS deployment | `docs/VPS_DEPLOYMENT.md`, `compose.prod.yml`, scripts | Owner must provide SSH/deploy access | P0 |
| GitHub-ready repo | README, `.github`, workflows, issue templates | Push to `redot3` remote remains owner-gated | P0 |
| Backup/archive | Scripts and manifests | Regenerate ZIPs after final commit | P1 |
| Google Cloud redot5 | GCP manifests and workflow placeholder | Needs owner-selected GCP project, billing, and IAM | P1 |

## Keep/refactor/replace decisions

| Asset | Decision | Reason |
|---|---|---|
| `services/gateway/src/index.js` | Keep | Core API, auth, billing, RBAC, rate limiting |
| `services/public-portal/src/public/` | Keep and review | Live public pages are reachable and coherent |
| `services/redot3-portal/` | Keep | Required React/Vite portal for `/portal/` |
| `compose.prod.yml` | Keep | Primary production stack |
| `compose.dev.yml`, `compose.staging.yml` | Keep | Required environment separation |
| `compose.replica-ai1.yml`, `compose.replica-ai2.yml` | Keep | Required replica-node deployment |
| `docs/` | Keep and maintain | Required operational docs are present |
| `legal/` | Keep | Effective dates and owner signature blocks present |
| `.github/workflows/` | Keep | CI/CD and security controls are present |
| PayPal endpoints | Gate | Skeleton only; owner must validate or disable |
| GCP deploy workflow | Gate | Placeholder until owner creates GCP project and secrets |

## Launch blockers by priority

### P0 launch blockers

1. Owner must configure or confirm Namecheap DNS records for `abc-io.com`, `www`, `api`, `admin`, `ai1`, `ai2`, and `headscale`.
2. Owner must provide or confirm SSH/deploy access to `redot1`, `ai1`, and `ai2`.
3. Owner must populate production `.env` from `.env.example` without committing secrets.
4. Owner must configure Stripe live products, price IDs, and webhook signing secret.
5. Owner must configure and test SMTP credentials for `support@abc-io.com`.
6. Owner must rotate seeded owner/operator passwords after `scripts/seed-owner-accounts.js`.
7. Owner must approve final legal/support/help content before public launch.

### P1 important before launch

1. Regenerate `REDOT3.ZIP`, `REDOT5.ZIP`, and `completed-redot1-abc-io-live.zip` after final repository changes.
2. Review public portal and redot3-portal branding consistency.
3. Decide whether PayPal remains enabled or is explicitly disabled.
4. Add a dedicated `worker` HTTP health endpoint or update health checks to avoid monitoring noise.
5. Add `package-lock.json` files for lightweight Node.js services to improve reproducibility.

### P2 post-launch improvements

1. Replace the `logger` placeholder with structured log aggregation.
2. Harden GCP deployment workflow for redot5 after owner chooses the target project.
3. Add public status page persistence and incident history.
4. Add automated browser checks for public pages and account flows.
5. Add package-lock files for all Node.js services.

## Architecture recommendation

Keep Docker Compose as the primary deployment model for Namecheap/VPS production and use the existing GCP manifests as the redot5 migration baseline. Do not split the platform into separate repositories until billing, secrets, and customer data boundaries are verified in staging. Maintain the five-environment model: Development, Staging, Public Production, Private Operations/Admin, and Backup/Recovery.

## Owner actions required list

See `docs/OWNER_ACTIONS_REQUIRED.md` for exact steps. Current owner-gated actions are:

1. Confirm Namecheap DNS records.
2. Confirm VPS SSH/deploy access.
3. Populate production `.env` and GitHub Repository Secrets.
4. Configure Stripe live mode.
5. Decide PayPal support path.
6. Configure SMTP provider.
7. Verify TLS certificate renewal.
8. Confirm domain auto-renewal.
9. Rotate seeded owner/operator passwords.
10. Approve legal, support, and help center content.
11. Push final changes to `abc-io-enterprise/redot3`.
12. Deploy to staging before production.
