# Enterprise Deployment Guide — ABC-IO v2.0

> **Note**: This guide has been consolidated with the enterprise runbooks. For the authoritative setup procedures, see:
> - `docs/ENTERPRISE_SETUP_RUNBOOK.md` — GitHub Enterprise org and repository setup.
> - `docs/SECURITY_RUNBOOK.md` — Security operations and incident response.
> - `docs/DISASTER_RECOVERY.md` — Backup and restore procedures.
> - `docs/GITHUB_ENTERPRISE_MIGRATION.md` — Migration plan to `abc-io-enterprise`.
> - `docs/ONBOARDING.md` — New team member guide.

## Quick Reference

### Organization

- **Organization**: `abc-io-enterprise`
- **Repository**: `redot2`
- **Primary contact**: `ops@abc-io.com`
- **Security contact**: `security@abc-io.com`

### Domains

- Primary: `abc-io.com`
- Primary node: `redot1.abc-io.com`
- AI node 1: `ai1.abc-io.com`
- AI node 2: `ai2.abc-io.com`

### Infrastructure

| Node | Services | DNS |
|------|----------|-----|
| Primary (redot1) | All 17 services | `redot1.abc-io.com` |
| AI Node 1 (ai1) | kimi, worker | `ai1.abc-io.com` |
| AI Node 2 (ai2) | kimi, worker | `ai2.abc-io.com` |

### Required DNS Records

- `A @` → Primary VPS IP
- `CNAME redot1` → `abc-io.com`
- `CNAME ai1` → `abc-io.com`
- `CNAME ai2` → `abc-io.com`
- TLS: Let's Encrypt for `abc-io.com` and `*.abc-io.com`

### Deployment Commands

```bash
# Bootstrap a new VPS
bash scripts/vps-setup.sh

# Deploy a release tag
bash scripts/vps-deploy.sh https://github.com/abc-io-enterprise/redot2.git v1.0.0

# Validate
./scripts/health-check.sh
./scripts/auto-heal.sh
```

### Secrets Management

All production secrets are stored in **GitHub Repository Secrets** and synchronized to the VPS `.env` at deploy time. See `.security/SECRETS_INVENTORY.md` for the full list and rotation schedule.

**Never commit `.env`, keys, or passwords to Git.**

### Support Escalation

| Level | Hours | Responsibilities |
|-------|-------|------------------|
| L1 | Business hours | Basic troubleshooting, service restarts, log review |
| L2 | On-call | Deep troubleshooting, emergency patches, system recovery |
| Security | 24/7 for incidents | Incident response, secret rotation, forensics |

- Emergency email: `security@abc-io.com`
- On-call page: via PagerDuty / Opsgenie

## Status

See `FINAL_HANDOFF.md` for the original delivery sign-off. This guide is kept current as the system evolves.
