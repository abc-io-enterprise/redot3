# ABC-IO v2.0 Launch Checklist

## Purpose

Use this checklist before declaring ABC-IO v2.0 ready for public traffic. Complete every item and record evidence before moving to `SYSTEM: ON`.

## Repository and code

- [ ] `services/`, `scripts/`, `config/`, `docs/`, and `.github/workflows/` are present.
- [ ] `.env` is in `.gitignore` and has never been committed.
- [ ] `.env.example` contains all required placeholders.
- [ ] `docker-compose.yml`, `compose.dev.yml`, `compose.staging.yml`, `compose.prod.yml`, `compose.replica-ai1.yml`, and `compose.replica-ai2.yml` all pass `docker compose config`.
- [ ] CI/CD workflows are present in `.github/workflows/`.
- [ ] Pre-commit hook blocks credential patterns.

## Secrets and environment

- [ ] `POSTGRES_PASSWORD` generated and stored in `.env` and GitHub Repository Secrets.
- [ ] `JWT_SECRET` generated.
- [ ] `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT` generated.
- [ ] `OWNER_SESSION_TOKEN` generated.
- [ ] `OWNER_ACCOUNT_EMAIL` / `OWNER_ACCOUNT_PASSWORD` set.
- [ ] `OWNER_BIOMETRIC_SECRET` generated.
- [ ] `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT` generated.
- [ ] `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT` generated.
- [ ] `MISTRAL_API_KEY` / `MISTRAL_MODEL` / `MISTRAL_API_BASE_URL` set.
- [ ] `KIMI_API_KEY` / `KIMI_MODEL` / `KIMI_API_BASE_URL` set (optional).
- [ ] `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` / `SMTP_URL` set.
- [ ] `GATEWAY_API_KEY`, `SELF_HEAL_TOKEN`, `REDOT1_API_KEY` generated.
- [ ] `.env` permissions are `600` on every host.

## DNS and TLS

- [ ] Namecheap A records for `@`, `www`, `api`, `admin`, `ai1`, `ai2`, and `headscale` point to the correct IPs.
- [ ] DNS propagation verified with `dig` from multiple locations.
- [ ] Let's Encrypt certificates obtained for `abc-io.com` and `www.abc-io.com`.
- [ ] HTTPS redirect enabled in `config/nginx.conf`.
- [ ] SSL Labs test returns A+ or acceptable rating.

## Billing

- [ ] Stripe products and prices created for all ten tiers.
- [ ] `STRIPE_PRICE_ID_*` variables populated.
- [ ] `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` set.
- [ ] Webhook endpoint `https://abc-io.com/api/v1/billing/webhook` registered in Stripe.
- [ ] Test-mode checkout completes and updates account tier.
- [ ] PayPal skeleton endpoints respond (optional).

## Services and health

- [ ] `docker compose -f compose.prod.yml up -d` starts all services.
- [ ] `./scripts/health-check.sh` passes for all 21 services.
- [ ] Operator Station shows all services online.
- [ ] `gateway` `/api/v1/system/health` reports DB, Redis, Kimi, and Stripe status.
- [ ] `owner-dashboard` login works with rotated password.
- [ ] `public-portal` `/api/signature` returns a valid signature and fingerprint.
- [ ] `mobile-gateway` `/health` responds.
- [ ] `beacon` `/api/v1/beacon/active` responds.
- [ ] `kimi` `/health` and `ai-isp` `/health` respond.

## Security and access

- [ ] No secrets found by `truffleHog3 --json . --no-history`.
- [ ] Branch protection enabled on `master` (and `main` if applicable).
- [ ] Signed commits required.
- [ ] UFW active with only required ports open.
- [ ] Fail2ban installed and running (optional but recommended).

## Backup and recovery

- [ ] `scripts/backup-postgres.sh` runs successfully.
- [ ] Latest backup is encrypted and stored offsite.
- [ ] Restore test completed on a scratch database or staging host.
- [ ] `.env`, TLS certificates, and release archive backed up.

## Documentation

- [ ] `docs/ARCHITECTURE.md`, `docs/DEPLOYMENT.md`, `docs/OPERATIONS.md`, `docs/SECURITY.md`, `docs/BILLING.md`, `docs/ACCOUNT_TIERS.md`, `docs/DATA_ISOLATION.md`, `docs/HELP_CENTER_PLAN.md`, `docs/LAUNCH_CHECKLIST.md`, `docs/OWNER_ACTIONS_REQUIRED.md`, `docs/NAMECHEAP_DEPLOYMENT.md`, `docs/VPS_DEPLOYMENT.md`, and `docs/BACKUP_AND_RECOVERY.md` are current.
- [ ] Legal pages (Terms of Service, Privacy Policy, Support Policy, Refund Policy, Acceptable Use Policy) are present and reachable.
- [ ] Help Center articles are published and reviewed.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: final sign-off that all launch checklist items are complete and verified
- reason: only the owner can authorize public launch and live billing
- where it is needed: launch readiness report, owner dashboard, and status page
- exact steps:
  1. Review this checklist and attached evidence.
  2. Confirm DNS, TLS, Stripe live mode, and owner account passwords are verified.
  3. Update the status page or operator station to `SYSTEM: ON`.
  4. Announce launch internally and on public status channels.
- verification method: all health checks pass, external SSL test passes, a live transaction completes, and the owner dashboard shows `SYSTEM: ON`

`ACTION REQUIRED FROM OWNER`
- item needed: confirm the support mailbox and human-hours messaging are live
- reason: public support commitments must be operational before launch
- where it is needed: `support@abc-io.com`, public portal, help center
- exact steps:
  1. Send a test email to `support@abc-io.com` and confirm delivery.
  2. Verify all public pages display `8am–8pm EST` human support hours.
  3. Confirm AI/autonomous availability is stated as `24/7/365`.
- verification method: support mailbox receives the test email and public pages contain consistent support copy
