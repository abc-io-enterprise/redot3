# ABC-IO v2.0 Master Index

Welcome to the ABC-IO v2.0 system deployment package. This index guides you through the full workspace and the core handoff deliverables.

## Navigation

- `README.md` — Quick start, architecture, and environment overview.
- `DEPLOYMENT.md` — VPS setup, deployment sequence, and production rollout.
- `SECURITY.md` — Security hardening, access controls, and encryption model.
- `DISASTER_RECOVERY.md` — Backup, restore, and failover procedures.
- `SIGN_OFF.md` — Production acceptance and certification details.
- `TEST_REPORT.md` — Test summary and verification results.
- `PROJECT_INVENTORY.md` — Checklist of completed components.
- `COMPLETION_SUMMARY.md` — Final project summary and readiness statement.

## Service Layers

- `docker-compose.yml` — Main 10-service orchestration.
- `compose.dev.yml` — Development environment variant.
- `compose.prod.yml` — Production-ready variant.
- `config/nginx.conf` — Reverse proxy configuration.
- `config/prometheus.yml` — Metrics and monitoring configuration.

## Service Projects

- `services/gateway/` — API gateway and edge routing service.
- `services/operator-station/` — Dashboard and operator UI.
- `services/kimi/` — AI service backend.
- `services/owner-dashboard/` — Owner access portal with biometric authentication and system signature.
- `services/mobile-gateway/` — Mobile satellite gateway with beaconing and backup status.
- `services/public-portal/` — Public-facing portal with signature validation.
- `services/postgres/` — Database initialization schema.
- `KEY_SIGNING.md` — Independent system signing and privacy verification.

## Automation

- `scripts/health-check.sh` — Local system validation.
- `scripts/provision-redot1.sh` — Primary VPS provisioning.
- `scripts/provision-ai-worker.sh` — AI worker node bootstrap.

## Quick Start

1. Review `README.md`.
2. Run `docker compose up -d` for local development.
3. Validate with `./scripts/health-check.sh`.
