# ABC-IO — Universal Silicone & Carbon Cross-Sensory Information Sharing Communications Platform

**Created by Christopher Porreca / redot1 — 2026**  
**Live:** https://abc-io.com  
**Contact:** contact@abc-io.com · (585) 348-7120

## Overview

ABC-IO is a purchasable, containerized multi-service system for personal or professional use. It provides a universal silicone-and-carbon cross-sensory communications platform with AI operations, global mesh networking, cellular backup, and enterprise security. The system is designed to run in 5 environments — local dev, staging, production, and two AI replica nodes — on a single primary VPS or as a multi-host deployment behind external DNS.

## Quick Start (Local Development)

```bash
cd redot2
docker compose up -d
sleep 20
./scripts/health-check.sh
```

## 5 Deployment Environments

| Environment | Compose file | Purpose |
|---|---|---|
| **Dev** | `compose.dev.yml` | Live-reload development for gateway, operator-station, and Postgres |
| **Staging** | `compose.staging.yml` | Full-stack pre-production on alternate ports |
| **Production** | `compose.prod.yml` | Primary public deployment (redot1 / abc-io.com) |
| **Replica AI-1** | `compose.replica-ai1.yml` | Redundant node on `192.227.212.235` |
| **Replica AI-2** | `compose.replica-ai2.yml` | Redundant node on `192.227.212.237` |

Use `npm run prod`, `npm run staging`, `npm run replica:ai1`, or `npm run replica:ai2` to start the corresponding environment.

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

- `docker-compose.yml` — primary 21-service orchestration.
- `compose.dev.yml` — developer environment with live-reload mounts.
- `compose.staging.yml` — staging environment with alternate host ports.
- `compose.prod.yml` — production environment with resource limits.
- `compose.replica-ai1.yml` / `compose.replica-ai2.yml` — redundant AI worker nodes.
- `config/` — NGINX, Prometheus, and Headscale configuration.
- `services/` — gateway, operator/owner/mobile/public portals, account PWA, interface PWA, beacon, beacon PWA, worker, ai-isp, autonomous orchestrator, Kimi AI, Postgres schema, and more.
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

## Publishing to `redot3`

To publish this system to the successor repository `abc-io-enterprise/redot3`:

```bash
gh repo create abc-io-enterprise/redot3 --public --description "ABC-IO — Universal silicone and carbon cross-sensory communications platform"
git remote add redot3 https://github.com/abc-io-enterprise/redot3.git
git push redot3 master
```

See [`docs/REDOT3_PUBLISH_AND_DEPLOY.md`](./docs/REDOT3_PUBLISH_AND_DEPLOY.md) for the full publishing, Namecheap, and VS Code deployment guide.

## Notes

- Review `AGENTS.md` for agent-focused conventions and the full service matrix.
- Review `CONTRIBUTING.md` before opening pull requests.
- Review `SECURITY.md` for the security architecture and responsible disclosure policy.
- All 10 repository remotes are configured; run `git remote -v` to view them.
