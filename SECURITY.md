# Security Policy — ABC-IO v2.0 (redot2)

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 2.0.x   | :white_check_mark: Full support |
| 1.x     | :x: End of life    |

## Reporting a Vulnerability

**Please do not file public issues for security vulnerabilities.**

- Preferred: Open a [private security advisory](../../security/advisories/new) on GitHub.
- Alternative: Email `security@abc-io.com` with the subject `[SECURITY] redot2 — <short description>`.
- Emergency / active exploitation: page the on-call SRE via `+1-555-ABC-IO-911`.

We follow a 90-day responsible disclosure timeline by default. Critical vulnerabilities affecting production may be patched and disclosed sooner in coordination with the reporter.

## Security Architecture

### Network

- TLS termination happens at NGINX (`nginx:stable-alpine`).
- Internal service communication inside Docker Compose uses the default bridge network; no TLS is enforced between containers on the same host.
- Headscale provides a WireGuard-compatible VPN overlay for multi-host deployments.

### Authentication and Authorization

- **Gateway**: JWT signed with `JWT_SECRET` (fallback to `OWNER_SIGNING_KEY`), 7-day expiry. API keys are SHA-256 hashed and stored in Postgres with an 8-character prefix.
- **Owner Dashboard**: requires `x-owner-token` equal to `OWNER_SESSION_TOKEN`. Biometric login computes an HMAC over `OWNER_BIOMETRIC_SECRET || OWNER_SIGNING_KEY`.
- **Public / Mobile / Owner signatures**: independent HMAC-SHA256 signing keys and fingerprints for privacy verification.

### Secrets Management

- `.env` is excluded from version control via `.gitignore`.
- Production secrets should be stored in **GitHub Repository Secrets** for CI/CD and rotated every 90 days.
- Long-lived signing keys must never be logged, printed, or committed.
- Docker containers should run as non-root in production (`compose.prod.yml`).

### Rate Limits

Per-tier per-minute limits keyed by `accountId || ip`:

| Tier       | Requests / minute |
|------------|-------------------|
| free       | 30                |
| pro        | 300               |
| enterprise | 3000              |

## Hardening Checklist

- [ ] TLS 1.2+ only at NGINX; HSTS enabled.
- [ ] `helmet` middleware enabled on public-facing Node.js services.
- [ ] Postgres initialized with strong `POSTGRES_PASSWORD`.
- [ ] Redis has `requirepass` set in production.
- [ ] `OWNER_SIGNING_KEY`, `MOBILE_SIGNING_KEY`, `PUBLIC_SIGNING_KEY` are unique per environment.
- [ ] `JWT_SECRET` is at least 32 bytes of cryptographic randomness.
- [ ] Stripe webhook secrets are validated on every request.
- [ ] VPS SSH keys are 4096-bit RSA or Ed25519 and stored in GitHub Secrets only.
- [ ] `owner-dashboard` Docker socket access is restricted to the production host.
- [ ] Audit logs are exported to cold storage monthly.
- [ ] Dependency Review, CodeQL, and secret-scanning workflows are enabled and required.

## Incident Response

1. **Detect**: Prometheus alerts, auto-heal logs, or external report.
2. **Contain**: Rotate compromised secrets, revoke sessions/API keys, isolate affected containers.
3. **Eradicate**: Patch, rebuild containers, redeploy via `deploy.yml`.
4. **Recover**: Verify with `./scripts/health-check.sh` and `./scripts/auto-heal.sh`.
5. **Post-incident**: Update this document and the [Operational Audit](./.security/OPERATIONAL_AUDIT.md) within 5 business days.

## Compliance Notes

- This project does not process credit-card data directly; Stripe handles PCI scope.
- Do not store PII in `audit_logs.payload` without encryption at rest.
- Retain `usage_logs` and `audit_logs` per your jurisdiction's data-retention policy.
