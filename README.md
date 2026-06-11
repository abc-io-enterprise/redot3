# ABC-IO v2.0

## Overview

ABC-IO v2.0 is a containerized multi-service system for local development, production deployment, and release packaging. It is designed to run on a single primary VPS or as a multi-host deployment behind external DNS.

## Quick Start (Local Development)

```bash
cd redot2
docker compose up -d
sleep 20
./scripts/health-check.sh
```

## Local Validation

- API gateway health: `http://localhost:4000/health`
- Gateway AI proxy: `POST http://localhost:4000/api/v1/ai/generate`
- Kimi service health: `http://localhost:5000/health`
- Kimi AI endpoint: `POST http://localhost:5000/ai/generate`
- Operator Station UI: `http://localhost:8080/`
- Public Portal UI: `http://localhost:8090/`
- Mobile Gateway UI: `http://localhost:5050/`
- Owner Dashboard UI: `http://localhost:8500/`
- APK backup status: `http://localhost:8500/api/backup-status`
- APK download endpoint: `http://localhost:8500/download/apk`
- Prometheus: `http://localhost:9091`
- Grafana: `http://localhost:14000`
- Jaeger UI: `http://localhost:16686`

## Enterprise Setup

This repository is prepared for the `abc-io-enterprise` GitHub organization. See the enterprise runbooks for full setup, migration, and security procedures:

- [`docs/ENTERPRISE_SETUP_RUNBOOK.md`](./docs/ENTERPRISE_SETUP_RUNBOOK.md) — Create the org, migrate the repo, configure teams.
- [`docs/GITHUB_ENTERPRISE_MIGRATION.md`](./docs/GITHUB_ENTERPRISE_MIGRATION.md) — Step-by-step migration plan.
- [`docs/SECURITY_RUNBOOK.md`](./docs/SECURITY_RUNBOOK.md) — Security operations and incident response.
- [`docs/DISASTER_RECOVERY.md`](./docs/DISASTER_RECOVERY.md) — Backup and restore procedures.
- [`docs/ONBOARDING.md`](./docs/ONBOARDING.md) — New team member guide.

Automation helpers:

```bash
# Print the enterprise setup checklist
./scripts/setup-github-enterprise.sh

# Migrate this repo to abc-io-enterprise/redot2
./scripts/migrate-to-enterprise.sh

# Apply branch protection
./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 master

# Upload secrets from .env to GitHub Repository Secrets
./scripts/set-github-secrets.sh abc-io-enterprise/redot2
```

## Release Packaging

To create a packaged ZIP archive for distribution, run:

```powershell
./scripts/package-release.ps1
```

## Production Deployment

Before production deployment:

1. Copy `.env.example` to `.env`.
2. Fill in all required secrets per `.security/SECRETS_INVENTORY.md`.
3. Review `DEPLOYMENT.md` and `docs/ENTERPRISE_DEPLOYMENT.md` for VPS provisioning and rollout.
4. Use `docker compose -f compose.prod.yml up -d`.

## Project Structure

- `docker-compose.yml` — primary 17-service orchestration.
- `compose.dev.yml` — developer environment with live-reload mounts.
- `compose.prod.yml` — production environment with resource limits.
- `config/` — NGINX, Prometheus, and Headscale configuration.
- `services/` — gateway, dashboard, AI services, owner/mobile/public portals, beacon, beacon PWA, worker, ai-isp, and DB schema.
- `scripts/` — release, operations, self-heal, validation, and enterprise setup automation.
- `.github/workflows/` — CI, dependency review, CodeQL, secret scanning, deploy, release, and GCP workflows.
- `.security/` — enterprise security policies, secrets inventory, branch protection, SAML/SSO templates, audit streaming, and IP allowlist guidance.

## Security

- Never commit `.env`, keys, or secrets. See `.security/SECRETS_INVENTORY.md` for the canonical list.
- Branch protection, required reviews, and status checks are defined in `.security/BRANCH_PROTECTION.md`.
- Report vulnerabilities via the [Security tab](../../security/advisories/new) or email `security@abc-io.com`.

## Consolidated Repositories

This project contains a unified index of all 10 ABC-IO ecosystem repositories under `repositories/`.

| # | Repository | Status | Description |
|---|------------|--------|-------------|
| 01 | `rd2live` | ✅ Base | Current project — ABC-IO v2.0 microservices |
| 02 | `rd1aii` | ✅ Archived | v1.x AI ISP installer and web portal |
| 03 | `redot1system` | ✅ Archived | Global Interfacing Provider (TypeScript/React) |
| 04 | `rd1backupublive` | ⚠️ Remote Only | Backup/sync to public_html on 3 VPS nodes |
| 05 | `rd1nc` | ⚠️ Remote Only | Namecheap DNS/domain backup |
| 06 | `abc-ai-node-2` | ✅ Archived | PAIOS + API marketplace + multi-user node |
| 07 | `redot1live` | ⚠️ Remote Only | Live redot1 deployment state |
| 08 | `redot1abc-ai` | ✅ Archived | redot1abc-ai swarm (TypeScript) |
| 09 | `abc-io-system` | ✅ Archived | ON-LIVE AI ISP shell deployment system |
| 10 | `abc-ai` | ✅ Archived | ABC-AI HTML gateway and AI core |

See [`REPOSITORIES.md`](./REPOSITORIES.md) for the full consolidation map, git remotes, and integration roadmap.

## Notes

- Review `AGENTS.md` for agent-focused conventions and the full service matrix.
- Review `CONTRIBUTING.md` before opening pull requests.
- Review `SECURITY.md` for the security architecture and responsible disclosure policy.
- All 10 repository remotes are configured; run `git remote -v` to view them.
