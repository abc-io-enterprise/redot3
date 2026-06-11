# Security Runbook — ABC-IO v2.0

This runbook is for the Security and Platform teams. It covers day-to-day security operations, incident response, and compliance tasks.

## Table of Contents

1. [Secret Management](#secret-management)
2. [Vulnerability Response](#vulnerability-response)
3. [Incident Response Playbooks](#incident-response-playbooks)
4. [Access Reviews](#access-reviews)
5. [Compliance Checks](#compliance-checks)
6. [Useful Commands](#useful-commands)

## Secret Management

### Storage

All production secrets live in **GitHub Repository Secrets** (Actions + Dependabot). The single source of truth for secret names and rotation cadence is `.security/SECRETS_INVENTORY.md`.

### Rotation Schedule

| Frequency | Secrets |
|-----------|---------|
| Monthly | All secrets reviewed via automated issue |
| 90 days | POSTGRES_PASSWORD, OWNER_SESSION_TOKEN, OWNER_ACCOUNT_PASSWORD, GATEWAY_API_KEY, SELF_HEAL_TOKEN, REDOT1_API_KEY, SMTP_PASS, GITEA_DB_PASSWORD |
| 180 days | OWNER_SIGNING_KEY, OWNER_BIOMETRIC_SECRET, MOBILE_SIGNING_KEY, PUBLIC_SIGNING_KEY, JWT_SECRET, HEADSCALE_API_KEY, GITEA_SECRET_KEY, GITEA_INTERNAL_TOKEN |
| On compromise | All API keys, SSH keys, signing keys |

### Rotation Procedure

1. Generate new values using commands in `.security/SECRETS_INVENTORY.md`.
2. Update the `.env` file on every running host (primary VPS and AI nodes).
3. Update GitHub Repository Secrets using `./scripts/set-github-secrets.sh`.
4. Recreate affected services:
   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate <service>
   ./scripts/health-check.sh
   ```
5. Record the rotation in `.security/SECRETS_ROTATION_LOG.md`.
6. If the old secret was exposed, revoke it at the vendor (Stripe, Mistral, Kimi, SMTP provider).

## Vulnerability Response

### Receiving Reports

- External: [Private security advisory](../../security/advisories/new)
- Internal: Slack `#security` or email `security@abc-io.com`
- Emergency: page on-call SRE

### Triage

| Severity | Response Time | Patch Target | Disclosure |
|----------|---------------|--------------|------------|
| Critical | 1 hour | 24 hours | Coordinated, expedited |
| High | 4 hours | 72 hours | Coordinated |
| Medium | 1 business day | 14 days | Standard 90-day |
| Low | 1 week | Next release | Standard 90-day |

### Patch and Release

1. Create a `security/` branch from the latest tag.
2. Apply the fix. Add a regression test if the project has a test framework.
3. Request expedited review from `@abc-io-enterprise/security` and the relevant CODEOWNERS.
4. Tag the release as `vX.Y.Z+security`.
5. Deploy via `deploy.yml` with environment `production`.
6. Publish a GitHub Security Advisory after the fix is confirmed in production.

## Incident Response Playbooks

### Compromised GitHub Account

1. Suspend the user in the organization immediately.
2. Rotate all organization-level secrets and PATs.
3. Review audit logs for unauthorized pushes, secret reads, or settings changes.
4. Force SAML reauthentication for all members if SSO is enabled.
5. Notify affected stakeholders within 24 hours.

### Leaked Repository Secret

1. Identify the secret from the GitHub secret scanning alert.
2. Revoke the secret at the vendor or service immediately.
3. Generate a replacement and update GitHub Repository Secrets.
4. Update `.env` on all hosts and recreate services.
5. Investigate whether the secret was exploited.
6. Document in `.security/SECRETS_ROTATION_LOG.md`.

### Unauthorized Production Deployment

1. Check `deploy.yml` run history to identify who triggered it.
2. If unauthorized, stop the running containers on the VPS:
   ```bash
   docker compose -f compose.prod.yml down
   ```
3. Roll back to the last known-good tag:
   ```bash
   git checkout <last-known-good-tag>
   docker compose -f compose.prod.yml up -d
   ```
4. Rotate `VPS_SSH_KEY` and `PROD_ENV_FILE` secrets.
5. Review branch protection and environment protection rules.

### DDoS or Abuse Spike

1. Enable emergency rate limits in `gateway` if not already active.
2. Review Prometheus metrics for offending IPs or accounts.
3. Add offending IPs to the VPS firewall deny list.
4. Consider enabling Cloudflare or similar DDoS protection.
5. Preserve logs for post-incident analysis.

## Access Reviews

- **Quarterly**: review organization members, team memberships, and repository collaborators.
- **Quarterly**: review GitHub PATs, SSH keys, and GitHub Apps.
- **After offboarding**: remove user from organization, rotate shared secrets they had access to, revoke any PATs they created.

## Compliance Checks

Monthly:
- Verify no secrets are tracked in Git (run `git ls-files | grep -E '\.(env|key|secret)$'`).
- Verify `.gitignore` exclusions.
- Review Dependabot alerts and CodeQL findings.
- Confirm audit log streaming is healthy.

Quarterly:
- Test disaster recovery (see `docs/DISASTER_RECOVERY.md`).
- Verify branch protection rules are still applied.
- Review IP allowlist entries.

## Useful Commands

```bash
# List all repository secrets (names only)
gh secret list --repo abc-io-enterprise/redot2

# View recent audit events
gh api /orgs/abc-io-enterprise/audit-log --paginate | jq '.[] | {actor, action, created_at}'

# Check branch protection
gh api repos/abc-io-enterprise/redot2/branches/master/protection | jq .

# Scan local repo for secrets
truffleHog3 --json . --no-history
```
