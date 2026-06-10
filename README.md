# ABC-IO v2.0

## Overview

ABC-IO v2.0 is a containerized system package for local development, production deployment, and release packaging.

## Quick Start (Local Development)

```bash
cd redot2
docker compose up -d
sleep 20
./scripts/health-check.sh
```

## Local Validation

- API gateway health: `http://localhost:4000/health`
- Gateway AI proxy: `POST http://localhost:4000/api/ai`
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

## Release Packaging

To create a packaged ZIP archive for distribution, run:

```powershell
./scripts/package-release.ps1
```

## Production Deployment

Before production deployment:

1. Copy `.env.example` to `.env`.
2. Set `POSTGRES_PASSWORD` in `.env`.
3. Set `MISTRAL_API_KEY`, `MISTRAL_MODEL`, and `MISTRAL_API_BASE_URL` in `.env` for the Kimi AI service.
4. Review `DEPLOYMENT.md` for VPS provisioning and live rollout.
5. Use `docker compose -f compose.prod.yml up -d`.

## Project structure

- `docker-compose.yml` — primary 10-service orchestration.
- `compose.dev.yml` — developer environment.
- `compose.prod.yml` — production environment.
- `config/` — NGINX and Prometheus configuration.
- `services/` — gateway, dashboard, AI service, owner and mobile portals, and DB schema.
- `scripts/` — release, operations, self-heal, and validation automation.
- `.github/workflows/` — CI and release automation templates.

## Consolidated Repositories

This project now contains a unified index of all 10 ABC-IO ecosystem repositories under `repositories/`.

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

- This environment cannot publish to GitHub or Namecheap automatically without user credentials.
- Use `README.md` and `DEPLOYMENT.md` together when moving to production.
- Review `KEY_SIGNING.md` for the independent owner/mobile/public signing and privacy verification model.
- All 10 repository remotes are configured; run `git remote -v` to view them.
