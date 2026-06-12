# ABC-IO v2.0 Owner Actions Required

## Purpose

This document collects every action that must be performed by the owner (Christopher Porreca) or another authorized human because they require external dashboards, live credentials, legal approval, or infrastructure access that automation must not perform.

## Rules

- Automation must stop at every item in this document.
- No AI assistant or script may claim these actions are complete without owner verification.
- Use the exact format below for each owner-gated boundary.

---

`ACTION REQUIRED FROM OWNER`
- item needed: domain registration and DNS records for `abc-io.com`
- reason: public traffic cannot reach the platform without authoritative DNS
- where it is needed: Namecheap or current registrar, and the primary VPS
- exact steps:
  1. Log in to the Namecheap account.
  2. Confirm `abc-io.com` is registered and not near expiry.
  3. Add or update A/CNAME records per `docs/NAMECHEAP_DEPLOYMENT.md`.
  4. Whitelist the primary VPS IP if using the Namecheap API for sync.
- verification method: `dig abc-io.com` and `dig www.abc-io.com` resolve to the primary VPS IP from multiple regions

---

`ACTION REQUIRED FROM OWNER`
- item needed: TLS/SSL certificates for `abc-io.com` and `www.abc-io.com`
- reason: HTTPS is required for secure API, admin, and billing traffic
- where it is needed: primary VPS host and `nginx` container
- exact steps:
  1. Provision a VPS with a public IP.
  2. Install Certbot.
  3. Run `certbot certonly --standalone -d abc-io.com -d www.abc-io.com`.
  4. Mount `/etc/letsencrypt` into the `nginx` container in `compose.prod.yml`.
  5. Uncomment the HTTPS redirect in `config/nginx.conf`.
- verification method: `openssl s_client -connect abc-io.com:443` returns a valid, unexpired certificate

---

`ACTION REQUIRED FROM OWNER`
- item needed: production `.env` populated with real secrets and synchronized to GitHub Repository Secrets
- reason: services will not start or will run degraded without required secrets
- where it is needed: primary VPS, replica nodes, and GitHub Repository Secrets
- exact steps:
  1. Fill `.env` from `.env.example` with production values.
  2. Run `chmod 600 .env` on every host.
  3. Run `./scripts/set-github-secrets.sh abc-io-enterprise/redot2`.
  4. Never commit `.env` to Git.
- verification method: `docker compose -f compose.prod.yml config` resolves all placeholders and `gh secret list` shows the expected names

---

`ACTION REQUIRED FROM OWNER`
- item needed: Stripe live account with products, prices, and webhook signing secret
- reason: paid tier activation depends on Stripe checkout and webhook events
- where it is needed: Stripe Dashboard, `.env`, GitHub Repository Secrets, and `gateway`
- exact steps:
  1. Create Stripe products and prices for each tier and add-on.
  2. Copy price IDs into `STRIPE_PRICE_ID_*` variables.
  3. Copy the live secret key into `STRIPE_SECRET_KEY`.
  4. Register `https://abc-io.com/api/v1/billing/webhook` and copy the signing secret into `STRIPE_WEBHOOK_SECRET`.
  5. Redeploy `gateway`.
- verification method: a test-mode checkout completes and the corresponding account tier updates in `postgres`

---

`ACTION REQUIRED FROM OWNER`
- item needed: live AI provider API key for Mistral (and optionally Kimi)
- reason: `kimi` proxies AI requests to external providers; without keys it falls back to offline mode
- where it is needed: Mistral/Kimi console, `.env`, GitHub Repository Secrets, and `kimi` container
- exact steps:
  1. Generate production API keys in the Mistral AI console and Kimi console.
  2. Set `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, and optional Kimi variables.
  3. Sync to GitHub Repository Secrets.
  4. Redeploy `kimi`.
- verification method: `curl https://abc-io.com/api/v1/ai/health` returns `ok` with the provider reachable

---

`ACTION REQUIRED FROM OWNER`
- item needed: SMTP relay credentials for `support@abc-io.com`
- reason: help center, beacon alerts, and billing emails require a working mail relay
- where it is needed: mail provider, `.env`, `gateway`, and `beacon`
- exact steps:
  1. Create or confirm the `support@abc-io.com` mailbox.
  2. Obtain SMTP host, port, user, and password.
  3. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, and `SMTP_URL`.
  4. Sync to GitHub Repository Secrets and restart `gateway` and `beacon`.
- verification method: send a test email and confirm delivery to `support@abc-io.com`

---

`ACTION REQUIRED FROM OWNER`
- item needed: branch protection and signed commits on the canonical repository
- reason: prevents unauthorized production changes and secret leaks
- where it is needed: GitHub repository `abc-io-enterprise/redot2`
- exact steps:
  1. Add branch protection rules for `master` (and `main` if applicable).
  2. Require 2 approvals, CODEOWNERS review, signed commits, linear history, and required status checks.
  3. Block force pushes and deletions.
  4. Run `./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 main`.
- verification method: `gh api repos/abc-io-enterprise/redot2/branches/master/protection | jq .` shows the required settings

---

`ACTION REQUIRED FROM OWNER`
- item needed: rotation of temporary passwords printed by `scripts/seed-owner-accounts.js`
- reason: the seed script outputs plaintext passwords that must not remain in effect
- where it is needed: `owner-dashboard` and database `users.password_hash`
- exact steps:
  1. Log in to the owner dashboard with the seeded credentials.
  2. Set a strong passphrase through the profile or password-reset flow.
  3. Store the new password in the enterprise password manager.
  4. Activate and rotate the operator account password if that account is needed.
- verification method: login succeeds only with the new password

---

`ACTION REQUIRED FROM OWNER`
- item needed: approval of public help center copy, accessibility statement, and legal pages
- reason: published content represents the business and must be accurate
- where it is needed: `services/public-portal/src/public/`, `legal/`, and help center
- exact steps:
  1. Review help articles, accessibility statement, terms, privacy, support, refund, and acceptable-use policies.
  2. Confirm support hours and contact information match public commitments.
  3. Merge reviewed copy through the normal PR process.
  4. Deploy `public-portal`.
- verification method: `curl https://abc-io.com/help/` returns approved content with consistent contact information

---

`ACTION REQUIRED FROM OWNER`
- item needed: offsite backup destination and encryption passphrase
- reason: `my_private` and operational data must be recoverable after host failure
- where it is needed: backup scripts, password manager, and offsite storage
- exact steps:
  1. Choose an offsite destination (S3-compatible bucket, rsync target, or cold storage).
  2. Generate a strong GPG passphrase and store it in the password manager.
  3. Configure `scripts/backup-postgres.sh` to reference the passphrase by environment variable name only.
  4. Test restore to a scratch database.
- verification method: a backup runs, is encrypted, is copied offsite, and restores successfully

---

`ACTION REQUIRED FROM OWNER`
- item needed: final launch sign-off and status declaration
- reason: only the owner can authorize public launch and live billing
- where it is needed: launch checklist, operator station, and public status channels
- exact steps:
  1. Review `docs/LAUNCH_CHECKLIST.md` and attached evidence.
  2. Confirm DNS, TLS, Stripe live mode, support mailbox, and owner passwords are verified.
  3. Update the operator station or status page to `SYSTEM: ON`.
  4. Announce launch internally.
- verification method: all health checks pass, external SSL test passes, a live transaction completes, and the owner dashboard shows `SYSTEM: ON`
