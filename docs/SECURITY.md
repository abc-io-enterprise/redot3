# ABC-IO v2.0 Security Guide

## Purpose

This document describes the security model, secret handling, access controls, rate limiting, incident response, and compliance expectations for ABC-IO v2.0.

## Overview

Security is enforced at multiple layers:

- **Edge:** TLS termination by `nginx`; UFW on each VPS.
- **API gateway:** JWT sessions, SHA-256-hashed API keys, tier rate limits, audit logging.
- **Admin plane:** `x-owner-token` header required by `owner-dashboard`; HMAC-SHA256 signing keys for owner, mobile, and public surfaces.
- **AI/services:** Provider API keys stored as environment variables only.
- **Repository:** pre-commit hooks, branch protection, secret scanning, signed commits.
- **Runtime:** least-privilege Docker mounts; `autonomous` mounts the Docker socket read-only.

## Secret management

Production secrets live in `.env` on each host and in GitHub Repository Secrets. The canonical list and rotation schedule are in `.security/SECRETS_INVENTORY.md`.

### Rotation schedule

| Frequency | Secrets |
|---|---|
| Monthly | All secrets reviewed via automated issue |
| 90 days | `POSTGRES_PASSWORD`, `OWNER_SESSION_TOKEN`, `OWNER_ACCOUNT_PASSWORD`, `GATEWAY_API_KEY`, `SELF_HEAL_TOKEN`, `REDOT1_API_KEY`, `SMTP_PASS` |
| 180 days | `OWNER_SIGNING_KEY`, `OWNER_BIOMETRIC_SECRET`, `MOBILE_SIGNING_KEY`, `PUBLIC_SIGNING_KEY`, `JWT_SECRET`, `HEADSCALE_API_KEY` |
| On compromise | All API keys, SSH keys, signing keys |

### Rotation procedure

1. Generate new values using the commands in `.security/SECRETS_INVENTORY.md`.
2. Update `.env` on every host (primary VPS and replicas).
3. Update GitHub Repository Secrets with `./scripts/set-github-secrets.sh`.
4. Recreate affected services:
   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate <service>
   ./scripts/health-check.sh
   ```
5. Record the rotation in `.security/SECRETS_ROTATION_LOG.md`.
6. If the old secret was exposed, revoke it at the vendor.

## Access control

### Gateway authentication

- **JWT:** HS256, 7-day expiry, issuer `abc-io`, signed with `JWT_SECRET` (falling back to `OWNER_SIGNING_KEY`).
- **API keys:** any prefix allowed, stored as SHA-256 hashes with an 8-character prefix in the `api_keys` table.

### Owner dashboard

- Requires the `x-owner-token` header (or `token` in the body) equal to `OWNER_SESSION_TOKEN`.
- Biometric token is computed as `HMAC-SHA256(OWNER_BIOMETRIC_SECRET || OWNER_SIGNING_KEY, email + password)`.

### Public portal

- Fatally exits on startup if `PUBLIC_SIGNING_KEY` or `PUBLIC_SIGNING_FINGERPRINT` is missing.
- Exposes `/api/signature` returning `{ system, payload, signature, fingerprint }`.

## Rate limiting

Per-minute limits keyed by `accountId || ip`:

| Tier | Per-minute limit | Monthly quota |
|---|---|---|
| free | 30 | 1,000 |
| basic | 60 | 5,000 |
| standard | 120 | 10,000 |
| pro | 300 | 50,000 |
| business | 600 | 100,000 |
| team | 1,200 | 200,000 |
| corporate | 2,000 | 500,000 |
| enterprise | 3,000 | 1,000,000 |
| agency | 5,000 | 5,000,000 |
| global | 10,000 | 10,000,000 |

## Vulnerability response

| Severity | Response time | Patch target |
|---|---|---|
| Critical | 1 hour | 24 hours |
| High | 4 hours | 72 hours |
| Medium | 1 business day | 14 days |
| Low | 1 week | Next release |

## Compliance checks

Monthly:

- Verify no secrets are tracked in Git:
  ```bash
  git ls-files | grep -E '\.(env|key|secret)$'
  ```
- Verify `.gitignore` exclusions.
- Review Dependabot alerts and CodeQL findings.
- Confirm audit log streaming is healthy.

Quarterly:

- Test disaster recovery (see `docs/DISASTER_RECOVERY.md` and `docs/BACKUP_AND_RECOVERY.md`).
- Verify branch protection rules are still applied.
- Review IP allowlist entries.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: secure storage and initial generation of signing keys and session tokens
- reason: `owner-dashboard`, `mobile-gateway`, and `public-portal` depend on these keys for signature verification and admin access
- where it is needed: `.env`, GitHub Repository Secrets, and host filesystem permissions
- exact steps:
  1. Generate `OWNER_SIGNING_KEY`, `OWNER_SIGNING_FINGERPRINT`, `OWNER_SESSION_TOKEN`, `OWNER_BIOMETRIC_SECRET`, `MOBILE_SIGNING_KEY`, `MOBILE_SIGNING_FINGERPRINT`, `PUBLIC_SIGNING_KEY`, and `PUBLIC_SIGNING_FINGERPRINT`.
  2. Write them into `.env` on every host.
  3. Run `chmod 600 .env`.
  4. Sync to GitHub Repository Secrets with `./scripts/set-github-secrets.sh`.
  5. Never print, screenshot, or commit the values.
- verification method: `docker compose -f compose.prod.yml up -d owner-dashboard mobile-gateway public-portal` starts without crash and `/api/signature` returns a fingerprint matching `.env`

`ACTION REQUIRED FROM OWNER`
- item needed: enable branch protection and signed commits on the canonical repository
- reason: prevents unauthorized production changes and secret leaks
- where it is needed: GitHub repository `abc-io-enterprise/redot2` on the default branch
- exact steps:
  1. Open repository Settings → Branches.
  2. Add a rule for `master` (and `main` if migration is in progress).
  3. Require 2 approvals, CODEOWNERS review, signed commits, linear history, and status checks (`CI / build`, `Dependency Review`, `CodeQL`, `Secret Scanning`).
  4. Block force pushes and deletions.
  5. Run `./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 main`.
- verification method: `gh api repos/abc-io-enterprise/redot2/branches/master/protection | jq .` shows the required settings

## Verification

Run these checks after any security change:

```bash
# Scan for committed secrets
truffleHog3 --json . --no-history

# Validate branch protection
gh api repos/abc-io-enterprise/redot2/branches/master/protection | jq .

# Confirm no plaintext secrets in source
git ls-files | grep -E '\.(env|key|secret|pem|p12|pfx)$'

# Verify health and rate limits
curl -s https://abc-io.com/api/v1/system/health
curl -s -H "Authorization: Bearer <token>" https://abc-io.com/api/v1/admin/metrics
```

No committed secrets should be found, and all health endpoints should return `ok`.
