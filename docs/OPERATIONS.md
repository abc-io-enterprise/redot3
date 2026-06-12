# ABC-IO v2.0 Operations Guide

## Purpose

This guide defines how to run, observe, and maintain ABC-IO v2.0 in steady state and during incidents. It covers health checks, self-healing, escalation policies, and owner-controlled operational boundaries.

## Overview

ABC-IO is designed as an autonomous-first platform. Automated monitoring and remediation run continuously. Human escalation is preferred during the published support window of **8am–8pm EST, Monday through Friday**. Outside that window, the system self-heals first and escalates only for critical or non-recoverable failures.

## Operating modes

| Mode | When used | Primary control | Escalation model |
|---|---|---|---|
| Autonomous / Off-hours | Outside 8am–8pm EST | Automation observes and heals | Escalate on critical or nonrecoverable failures |
| Assisted / Human hours | 8am–8pm EST Mon–Fri | Automation first, human review second | Escalate rapidly for customer-facing issues |
| Maintenance | Planned work or controlled response | Restricted automation | Human-approved changes only |
| Recovery | Partial outage or failover | Automation with incident logging | Human review if recovery is incomplete |

## Status model

Only use these statuses:

- `SYSTEM: BUILDING`
- `SYSTEM: READY FOR OWNER REVIEW`
- `SYSTEM: READY FOR STAGING`
- `SYSTEM: READY FOR PRODUCTION`
- `SYSTEM: ON`
- `SYSTEM: MAINTENANCE`

Use `SYSTEM: ON` only after production verification is current and all core communication paths pass.

## Core service domains

1. Public business website (`public-portal`, `nginx`).
2. Communication services (`gateway`, `mobile-gateway`, `beacon`, `beacon-pwa`).
3. Account and portal services (`account-pwa`, `interface-pwa`, `gateway`).
4. AI processing and orchestration (`kimi`, `ai-isp`, `worker`).
5. Owner/admin and operations systems (`owner-dashboard`, `operator-station`, `autonomous`).
6. Backup, recovery, and trust systems (`postgres`, `redis`, scripts, manifests).

## Daily operational checks

```bash
# Full health check
./scripts/health-check.sh

# Auto-heal pass (also logs to /var/log/abc-io-health.log)
./scripts/auto-heal.sh

# Cluster health across redot1, ai1, ai2
./scripts/health-check-cluster.sh
```

## Service management commands

```bash
# View running services
docker compose -f compose.prod.yml ps

# Restart a single service
docker compose -f compose.prod.yml restart gateway

# Follow logs
docker compose -f compose.prod.yml logs -f gateway

# Database CLI
docker compose -f compose.prod.yml exec postgres psql -U postgres -d abc_io

# Redis CLI
docker compose -f compose.prod.yml exec redis redis-cli
```

## Self-healing boundaries

The `autonomous` service may:

- restart containers or workers
- retry idempotent background jobs
- rebuild static assets from the last known good release
- republish fallback status or maintenance banners
- invalidate caches and repopulate them
- open incidents and append audit logs

The `autonomous` service may **not**:

- reveal or rotate secrets
- approve legal or policy changes
- alter payment-provider live settings
- perform owner-only GitHub, VPS, DNS, or registrar actions
- claim that production is live without verification evidence

## Human escalation triggers

Escalate to the owner or on-call operator for:

- billing or payment-provider changes
- registrar, DNS, GitHub, VPS, or cloud-admin actions
- legal or policy approval
- unresolved accessibility issues during support hours
- customer-impacting outage not fixed by first automated recovery
- suspected security compromise

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: approve maintenance windows that affect billing, DNS, or owner-dashboard access
- reason: these actions can interrupt customer access or expose privileged controls
- where it is needed: production VPS, DNS registrar, Stripe Dashboard, GitHub repository
- exact steps:
  1. Open the operator station and confirm current service health.
  2. Announce the maintenance window in the status channel.
  3. Perform the change through the owner-dashboard or approved runbook.
  4. Run `./scripts/health-check.sh` and `./scripts/auto-heal.sh` after the change.
  5. Close the maintenance window and update the status page.
- verification method: Operator Station shows `SYSTEM: ON` or `SYSTEM: MAINTENANCE` as appropriate, and health checks pass

`ACTION REQUIRED FROM OWNER`
- item needed: review and sign off on incident postmortems and autonomous actions that touched customer data
- reason: autonomous recovery may have side effects that require owner awareness
- where it is needed: incident tracker, audit logs, `.security/AUDIT_LOG_STREAMING.md`
- exact steps:
  1. Inspect `/var/log/abc-io-health.log` and `autonomous` container logs.
  2. Review any incident files created in `docs/` or the configured incident tracker.
  3. Confirm whether customer-facing data was changed.
  4. Approve or correct follow-up actions.
- verification method: incident status is marked resolved with owner sign-off and no unresolved P0 blockers remain

## Verification

Before claiming the platform is healthy, verify:

1. `abc-io.com` resolves globally.
2. TLS certificate is valid and not near expiry.
3. Homepage, Help Center, and Contact Center load with consistent identity.
4. `gateway` `/health` and `/api/v1/system/health` respond.
5. `owner-dashboard` responds with a valid owner token.
6. `kimi` and `ai-isp` health endpoints respond.
7. Recent PostgreSQL backup exists.
8. No unresolved P0 blocker is open.
