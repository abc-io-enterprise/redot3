# AGENTS.md — ABC-IO v2.0 (redot2)

This file contains ground-truth information about the project for AI coding agents. If you are reading this, assume you know nothing about the codebase beyond what is written here.

---

## Project Overview

ABC-IO v2.0 (codename `redot2`) is a containerized multi-service system designed for local development, production deployment, and release packaging. It is orchestrated with Docker Compose and provides:

- **`gateway`** — Central API gateway with JWT/API-key auth, per-tier rate limiting, Stripe billing, email flows, and routing to backend services.
- **`operator-station`** — Operational dashboard that aggregates health/status from the gateway, owner dashboard, mobile gateway, and public portal.
- **`owner-dashboard`** — Privileged admin interface for service lifecycle control, deployment updates, APK backup status, and beacon relay. It executes `docker compose` commands directly.
- **`mobile-gateway`** — Mobile-facing API with signing, stats, and beacon ingestion.
- **`public-portal`** — Public-facing static site with signature verification.
- **`beacon-pwa`** — Minimal location-aware beacon PWA.
- **`beacon`** — Public-safety beacon backend with in-memory storage, 24-hour TTL, haversine region search, and responder acknowledgments.
- **`kimi`** — Python/Flask AI adapter that proxies to Mistral or Kimi with circuit breaker, response cache, retry logic, and offline fallback.
- **`worker`** — Background Python worker that consumes a Redis queue for `ai_inference` and `health_check` jobs.
- **`ai-isp`** — Cross-sensory translation service (Braille, Morse, Haptic, speech-to-text, sign-language stubs) served by Gunicorn.
- **Infrastructure services** — `postgres`, `redis`, `nginx`, `prometheus`, `grafana`, `tracer` (Jaeger), `headscale` (VPN), and a placeholder `logger` (busybox).

The entire stack is intended to run on a single primary VPS or as a multi-host deployment with external DNS.

---

## Technology Stack

| Service | Runtime | Framework / Server | Language | Exposed Port (local) |
|---|---|---|---|---|
| `gateway` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 4000 |
| `operator-station` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8080 |
| `owner-dashboard` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8500 |
| `mobile-gateway` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 5050 |
| `public-portal` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8090 |
| `beacon-pwa` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 3005 |
| `beacon` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 3006 |
| `kimi` | Python 3.12 slim | Flask (dev server) | Python 3 | 5000 |
| `worker` | Python 3.12 Alpine | — | Python 3 | headless |
| `ai-isp` | Python 3.11 slim | Flask + Gunicorn | Python 3 | 7000 |
| `postgres` | PostgreSQL 15 Alpine | — | SQL | 5432 |
| `redis` | Redis Alpine | — | — | 6379 |
| `nginx` | nginx stable-alpine | — | — | 8088 / 8443 |
| `prometheus` | prom/prometheus | — | — | 9091 |
| `grafana` | grafana/grafana | — | — | 14000 |
| `tracer` | jaegertracing/all-in-one | — | — | 16686 |
| `headscale` | headscale/headscale | — | — | 8085 |

**Key architectural notes:**
- All Node.js frontends are vanilla HTML/CSS/JS. There is no React, Vue, TypeScript, or bundler anywhere in the project.
- The `gateway` is the central reverse-proxy target for NGINX and exposes versioned routes under `/api/v1/`.
- The `owner-dashboard` runs `docker compose` commands directly via `child_process.execSync`. It requires host-level Docker access.
- The `kimi` service supports Mistral and Kimi providers. If no API key is configured, it returns an offline fallback response.
- The main background `worker` consumes the Redis list `redot2:jobs:queue` and stores results with a 1-hour TTL.
- `services/kimi/worker.py` is a separate small Redis consumer that uses the list `abc_io_tasks` and result list `abc_io_results`.
- `ai-isp` is fully containerized and implemented, not a placeholder.

---

## Project Structure

```
.
├── docker-compose.yml          # Primary 17-service orchestration (local ports)
├── compose.dev.yml             # Dev environment with volume mounts for gateway + operator-station + postgres
├── compose.prod.yml            # Production environment (ports 80/443, resource limits, json-file logging)
├── .env.example                # Template for required secrets
├── package.json                # Root workspace metadata + npm scripts
├── config/
│   ├── nginx.conf              # Reverse-proxy to gateway:4000, public-portal, owner-dashboard
│   ├── prometheus.yml          # Scrapes gateway, operator-station, owner-dashboard, kimi, mobile-gateway,
│   │                           # public-portal, beacon-pwa, ai-isp, beacon, postgres, redis
│   └── headscale/              # Headscale VPN configuration (mounted into headscale service)
├── services/
│   ├── gateway/src/index.js
│   ├── operator-station/src/index.js
│   ├── owner-dashboard/src/index.js (+ src/public/index.html)
│   ├── mobile-gateway/src/index.js (+ src/public/)
│   ├── public-portal/src/index.js (+ src/public/*.html)
│   ├── beacon-pwa/server.js (+ public/)
│   ├── beacon/src/index.js
│   ├── kimi/app.py, worker.py, requirements.txt
│   ├── worker/worker.py, requirements.txt
│   ├── ai-isp/src/app.py (+ src/translators/), Dockerfile, requirements.txt
│   └── postgres/init.sql
├── scripts/
│   ├── health-check.sh         # Curl all service /health endpoints
│   ├── self-heal.sh            # Restart stack if containers are exited
│   ├── auto-heal.sh            # 7-phase health monitor with auto-restart
│   ├── emergency-recovery.sh   # Stop, prune, and restart the full stack
│   ├── vps-deploy.sh           # Checkout tag and deploy on a VPS
│   ├── vps-setup.sh            # One-time Ubuntu/Debian bootstrap
│   ├── provision-redot1.sh     # Alpine provisioning for the primary node
│   ├── provision-ai-worker.sh  # Bring up only the kimi service
│   ├── github-setup.sh         # Interactive GitHub Enterprise setup
│   ├── build-mobile-apk.ps1   # Build/sign Android APK
│   └── package-release.ps1    # Create release ZIP archive
└── .github/workflows/          # CI/CD definitions (see below)
```

The root `package.json` defines workspaces for `gateway`, `operator-station`, `owner-dashboard`, `mobile-gateway`, `public-portal`, and `beacon-pwa`. `beacon` and `ai-isp` have their own `package.json`/`requirements.txt` but are not included in the root workspace list.

---

## Build and Run Commands

### Local Development

```bash
# Start the full stack
docker compose up -d

# Wait for services to stabilize, then validate
sleep 20
./scripts/health-check.sh
```

### Dev Environment (with live-reload volume mounts)

```bash
docker compose -f compose.dev.yml up -d
```

This mounts `./services/gateway/src` and `./services/operator-station/src` into their containers for live reloading. Only `gateway`, `operator-station`, and `postgres` are defined in `compose.dev.yml`.

### Production

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# 2. Set POSTGRES_PASSWORD, MISTRAL_API_KEY, OWNER_* signing keys and tokens, etc.
# 3. Deploy
docker compose -f compose.prod.yml up -d
```

### Release Packaging

```powershell
./scripts/package-release.ps1
```

Creates `rd1backupublive-final-2.0.zip` for distribution.

### Root npm Scripts

The root `package.json` also exposes:

- `npm run dev` / `npm run dev:logs` — start local stack
- `npm run prod` / `npm run prod:logs` — start production stack
- `npm run build` — `docker compose build`
- `npm run stop` — `docker compose down`
- `npm run health` — run `scripts/health-check.sh`
- `npm run heal` — run `scripts/auto-heal.sh`
- `npm run test` — currently echoes that tests are not configured

---

## Service Endpoints (Local)

| Service | URL |
|---|---|
| API Gateway health | `http://localhost:4000/health` |
| Gateway AI proxy | `POST http://localhost:4000/api/v1/ai/generate` |
| Gateway AI health | `GET http://localhost:4000/api/v1/ai/health` |
| Gateway auth | `POST http://localhost:4000/api/v1/auth/register` (and `/login`, `/forgot-password`, `/reset-password`, `/verify-email`, `/me`) |
| Gateway billing | `POST http://localhost:4000/api/v1/billing/checkout` (and `/webhook`, `/portal`, `GET /invoices`) |
| Gateway translation | `POST http://localhost:4000/api/v1/translate/:modality` |
| Gateway beacon | `POST http://localhost:4000/api/v1/beacon/emit`, `GET http://localhost:4000/api/v1/beacon/active` |
| Kimi AI Service | `http://localhost:5000/health` |
| Kimi Generate | `POST http://localhost:5000/ai/generate` |
| Operator Station UI | `http://localhost:8080/` |
| Operator Station status | `GET http://localhost:8080/status` |
| Public Portal UI | `http://localhost:8090/` |
| Public Portal signature | `GET http://localhost:8090/api/signature` |
| Mobile Gateway UI | `http://localhost:5050/` |
| Mobile Gateway signature | `GET http://localhost:5050/api/signature` |
| Mobile Gateway beacon | `POST http://localhost:5050/api/beacon` |
| Owner Dashboard UI | `http://localhost:8500/` |
| Owner Dashboard auth | `POST http://localhost:8500/api/auth` |
| Owner Dashboard system health | `GET http://localhost:8500/api/system-health` |
| APK Backup Status | `http://localhost:8500/api/backup-status` |
| APK Download | `http://localhost:8500/download/apk` |
| Beacon service | `http://localhost:3006/` (and `/api/v1/beacon/*`) |
| Beacon PWA | `http://localhost:3005/` (and `/api/beacon`) |
| AI-ISP | `http://localhost:7000/health` (and `/api/v1/translate/*`, `/api/v1/matrix`) |
| NGINX | `http://localhost:8088/` |
| Prometheus | `http://localhost:9091` |
| Grafana | `http://localhost:14000` |
| Jaeger UI | `http://localhost:16686` |
| Headscale | `http://localhost:8085` |

**Note:** Some documentation (including `README.md`) still refers to the legacy route `POST /api/ai`. The actual implemented gateway route is `POST /api/v1/ai/generate`.

---

## Code Style Guidelines

### JavaScript (Node.js services)
- Use **CommonJS** (`require` / `module.exports`). Do **not** use ES modules.
- Use `const` and `let`; avoid `var`.
- Read the port from `process.env.PORT` with a numeric fallback (e.g., `Number(process.env.PORT || 4000)`).
- Express apps should use `express.json()` middleware for JSON bodies.
- Use `helmet` in production-facing services where it is already present (`gateway`, `owner-dashboard`, `mobile-gateway`, `public-portal`, `beacon-pwa`, `beacon`).
- Frontends are served as static files from `src/public/` (or `public/` in `beacon-pwa`) using `express.static`.
- Inline HTML/CSS/JS in server-rendered responses is acceptable and matches existing patterns.
- No React, Vue, TypeScript, Webpack, or similar tooling is used.

### Python (kimi, worker, ai-isp)
- Use standard library `logging` with the format `'[%(asctime)s] %(levelname)s: %(message)s'` (the worker already does this).
- Read configuration from environment variables via `os.getenv` with sensible defaults.
- Flask apps run on `host='0.0.0.0'` (kimi uses port `5000`; ai-isp uses `PORT` env default `7000`).
- The worker uses `redis.from_url` and blocking `blpop` with a short timeout for periodic heartbeats.

### General
- There is **no ESLint, Prettier, TypeScript, or Jest** configuration in this project. Do not add them unless explicitly requested.
- Dockerfiles for Node.js services follow a uniform pattern: `FROM node:20-alpine`, `WORKDIR /app`, copy `package.json`, `npm install`, copy `src/`, `CMD ["node", "src/index.js"]`.
- Dockerfiles for Python services generally follow: `FROM python:3.12-alpine` (or `slim`), install dependencies, copy source, `CMD ["python", "app.py"]` or `CMD ["python", "-u", "worker.py"]`.
- The `ai-isp` Dockerfile is an exception: it uses `python:3.11-slim`, installs `gcc`, and runs under **Gunicorn** (`gunicorn --bind 0.0.0.0:7000 --workers 2 --timeout 60 app:app`).

---

## Testing Instructions

**There are no automated unit tests, integration tests, or test frameworks in this project.** Validation is performed operationally:

1. **Health check script:**
   ```bash
   ./scripts/health-check.sh
   ```
   Curls `/health` on gateway, operator-station, public-portal, mobile-gateway, owner-dashboard, and kimi.

2. **Self-heal script:**
   ```bash
   ./scripts/self-heal.sh
   ```
   Validates the same health endpoints and restarts the Docker Compose stack if any containers are exited.

3. **Auto-heal script:**
   ```bash
   ./scripts/auto-heal.sh
   ```
   A 7-phase monitor that checks service availability, disk/memory usage, DB/cache connectivity, API health, and network state. It auto-restarts failed containers and prunes stale resources. Logs to `/var/log/abc-io-health.log` and writes state to `/tmp/abc-io-health.state`.

4. **CI build validation:**
   The `ci.yml` workflow builds Docker images for `gateway`, `operator-station`, and `kimi`, and validates `docker-compose.yml` with `docker compose config`.

---

## CI/CD Workflows

All workflows are in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main` | Build gateway, operator-station, kimi images; validate compose file. |
| `branch-protection.yml` | PR to `master` | Enforce PR descriptions, semantic commits (`feat:`, `fix:`, `docs:`, etc.), code-review requirement, and WIP detection. |
| `codeql-analysis.yml` | Push/PR to `master`, weekly (`0 3 * * 0`) | GitHub CodeQL static security analysis for JavaScript and Python. |
| `deploy.yml` | Manual (`workflow_dispatch`) | SSH to VPS, checkout tag, run `docker compose up -d --remove-orphans`, execute `health-check.sh`, 30s smoke test. |
| `gcp-deploy.yml` | Manual (`workflow_dispatch`) | GCP Cloud SDK setup; applies Kubernetes manifests from `infrastructure/gcp/k8s/`. |
| `privacy-checks.yml` | Push/PR to `master` | Scan for `.env`/`.key`/`.secret` files in Git, verify `.gitignore` exclusions, scan `docs/` for PII keywords, assert license compliance. |
| `release.yml` | Tag push (`v*.*.*`) | Build containers, create ZIP archive, publish GitHub release with the archive attached. |
| `secret-scanning.yml` | Push/PR to `master` | Install `truffleHog3` and scan for leaked secrets. |
| `secrets-rotation-reminder.yml` | Monthly (1st @ 08:00 UTC) | Auto-create GitHub issue reminding operators to rotate secrets. |

**Branch triggers:** All workflows now trigger on both `main` and `master` to support migration. After the repository is migrated to `abc-io-enterprise/redot2`, standardize on one default branch and update workflow filters accordingly.

---

## Security Considerations

### Secrets and Environment Variables
- **Never commit `.env`**. It is excluded by `.gitignore`.
- Copy `.env.example` to `.env` and fill in production values before deploying.
- Required secrets in `.env.example` include: `POSTGRES_PASSWORD`, `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, `KIMI_API_KEY`, `KIMI_MODEL`, `KIMI_API_BASE_URL`, owner/mobile/public signing keys and fingerprints, `OWNER_SESSION_TOKEN`, `OWNER_ACCOUNT_EMAIL`, `OWNER_ACCOUNT_PASSWORD`, `OWNER_BIOMETRIC_SECRET`, `GATEWAY_API_KEY`, `SELF_HEAL_TOKEN`, `JWT_SECRET`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_ENTERPRISE`, `PUBLIC_URL`, `CORS_ORIGIN`, and `SMTP_*` (`SMTP_URL`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`), plus Headscale/Gitea/Namecheap placeholders. See `.security/SECRETS_INVENTORY.md` for the canonical list and rotation schedule.
- Production secrets are stored in **GitHub Repository Secrets** and synchronized to the VPS `.env` at deploy time via `scripts/set-github-secrets.sh`.

### Signing and Privacy Verification
The project uses independent HMAC-SHA256 signing keys for three roles:

- **Owner Dashboard** (`OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`)
- **Mobile Gateway** (`MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`)
- **Public Portal** (`PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`)

Each service exposes `/api/signature` returning `{ system, payload, signature, fingerprint }`.

### Access Control
- **Gateway:** Uses JWT signed with `JWT_SECRET` (falling back to `OWNER_SIGNING_KEY`), issuer `'abc-io'`, 7-day expiry. Also supports API keys prefixed with `ak_`, stored as SHA-256 hashes with an 8-character prefix in `api_keys`.
- **Owner Dashboard:** Requires the `x-owner-token` header (or `token` in the body) to equal `OWNER_SESSION_TOKEN`. The login endpoint computes the expected biometric token as `HMAC-SHA256(OWNER_BIOMETRIC_SECRET || OWNER_SIGNING_KEY, email + password)`; there is **no** hardcoded `BIO-VALID` value in the current source.
- **Public Portal:** Fatally exits on startup if `PUBLIC_SIGNING_KEY` or `PUBLIC_SIGNING_FINGERPRINT` is missing.
- **Stripe webhooks:** Verified with `STRIPE_WEBHOOK_SECRET`.
- **Rate limits:** Per-minute limits keyed by `accountId || ip` are `free=30`, `pro=300`, `enterprise=3000`.

### Docker Privileges
- The `owner-dashboard` executes `docker compose` commands directly (`restart`, `stop`, `start`, `pull`, `up -d`). In production, this implies the container must have access to the host Docker socket or daemon.
- Production compose sets `deploy.resources.limits.memory` per service and uses `json-file` logging with 10 MB rotation.

---

## Database Schema

PostgreSQL is initialized via `services/postgres/init.sql`. It defines the following tables:

- `accounts` — tenant accounts with tier (`free`/`pro`/`enterprise`) and Stripe IDs.
- `users` — account users with password hash, role, email verification, and login tracking.
- `email_verifications` — verification tokens with expiry.
- `password_resets` — reset tokens with expiry.
- `sessions` — session token hashes with expiry and revocation.
- `api_keys` — per-account API keys with scopes, rate limits, and revocation.
- `subscriptions` — Stripe subscription records.
- `invoices` — Stripe invoice records.
- `usage_logs` — per-request usage tracking (endpoint, method, status, response time).
- `audit_logs` — security/operational audit events with JSONB payloads and severity.

The schema seeds a default system account with ID `00000000-0000-0000-0000-000000000000`.

The gateway connects via `DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/abc_io`.

---

## Deployment Architecture

- **Primary node**: runs `compose.prod.yml` with all services (`nginx`, `gateway`, `operator-station`, `owner-dashboard`, `mobile-gateway`, `public-portal`, `beacon-pwa`, `beacon`, `kimi`, `worker`, `ai-isp`, `postgres`, `redis`, `prometheus`, `grafana`, `tracer`, `headscale`, `logger`).
- **Optional secondary AI nodes**: additional VPS hosts running only `kimi` and/or `worker` behind DNS entries like `ai1.abc-io.com`.
- **GCP**: There is a placeholder `gcp-deploy.yml` workflow and `infrastructure/gcp/` directory with Kubernetes manifests for future cloud-native expansion.
- **VPN**: `headscale` provides a self-hosted WireCoord / Tailscale-compatible control server on ports `8085` (HTTP) and `41641/udp`.

---

## Key Files for Common Tasks

| Task | File(s) |
|---|---|
| Add a new API route to the gateway | `services/gateway/src/index.js` |
| Change AI model behavior or offline fallback | `services/kimi/app.py` |
| Add a new background job type | `services/worker/worker.py` |
| Modify owner dashboard UI or admin logic | `services/owner-dashboard/src/index.js` and `src/public/index.html` |
| Update database initialization | `services/postgres/init.sql` |
| Change NGINX routing | `config/nginx.conf` |
| Add Prometheus targets | `config/prometheus.yml` |
| Modify CI behavior | `.github/workflows/ci.yml` |
| Build/release packaging | `scripts/package-release.ps1` |
| Mobile APK build | `scripts/build-mobile-apk.ps1` |
| Add cross-sensory translation | `services/ai-isp/src/app.py` and `src/translators/*.py` |
| Change beacon behavior | `services/beacon/src/index.js` |
| Set up / migrate GitHub Enterprise org | `docs/ENTERPRISE_SETUP_RUNBOOK.md`, `docs/GITHUB_ENTERPRISE_MIGRATION.md`, `scripts/setup-github-enterprise.sh`, `scripts/migrate-to-enterprise.sh` |
| Apply branch protection | `.security/BRANCH_PROTECTION.md`, `scripts/apply-branch-protection.sh` |
| Manage production secrets | `.security/SECRETS_INVENTORY.md`, `scripts/set-github-secrets.sh` |
| Security incident response | `docs/SECURITY_RUNBOOK.md` |
| Disaster recovery | `docs/DISASTER_RECOVERY.md` |
| Onboard a new team member | `docs/ONBOARDING.md` |

---

## Consolidated Repository Archive

This project has been consolidated with 9 sibling repositories under `repositories/`:

| # | Directory | Source Repo | Status |
|---|-----------|-------------|--------|
| 01 | `repositories/01-rd2live-base/` | `ccplexmath/rd2live` | Base (this project) |
| 02 | `repositories/02-rd1aii/` | `ccplexmath/rd1aii` | Copied locally |
| 03 | `repositories/03-redot1system/` | `ccplexmath/redot1system` | Copied locally |
| 04 | `repositories/04-rd1backupublive/` | `ccplexmath/rd1backupublive` | Remote only — fetch with auth |
| 05 | `repositories/05-rd1nc/` | `ccplexmath/rd1nc` | Remote only — fetch with auth |
| 06 | `repositories/06-abc-ai-node-2/` | `ccplexmath/abc-ai-node-2` | Copied locally |
| 07 | `repositories/07-redot1live/` | `ccplexmath/redot1live` | Remote only — fetch with auth |
| 08 | `repositories/08-redot1abc-ai/` | `ccplexmath/redot1abc-ai` | Extracted from archive |
| 09 | `repositories/09-abc-io-system/` | `ccplexmath/abc-io-system` | Copied locally |
| 10 | `repositories/10-abc-ai/` | `ccplexmath/abc-ai` | Copied locally |

All remotes are pre-configured. Run `git remote -v` to view them. Private repos require a GitHub PAT to fetch.

**Important:** When editing the active v2.0 services, work in the root `services/` and `scripts/` directories. The `repositories/` folder is an archive for reference and future migration; changes there do not affect the running Docker Compose stack unless explicitly promoted.

## Enterprise Configuration

The repository is prepared for migration to the `abc-io-enterprise` GitHub organization. Key artifacts:

- **Organization setup runbook**: `docs/ENTERPRISE_SETUP_RUNBOOK.md`
- **Migration plan**: `docs/GITHUB_ENTERPRISE_MIGRATION.md`
- **Security runbook**: `docs/SECURITY_RUNBOOK.md`
- **Disaster recovery**: `docs/DISASTER_RECOVERY.md`
- **Onboarding**: `docs/ONBOARDING.md`
- **Branch protection rules**: `.security/BRANCH_PROTECTION.md`
- **SAML/SSO template**: `.security/SAML_SSO_TEMPLATE.md`
- **Audit log streaming**: `.security/AUDIT_LOG_STREAMING.md`
- **IP allowlist policy**: `.security/IP_ALLOWLIST.md`
- **Secrets inventory**: `.security/SECRETS_INVENTORY.md`
- **Setup checklist script**: `scripts/setup-github-enterprise.sh`
- **Migration script**: `scripts/migrate-to-enterprise.sh`
- **Branch protection script**: `scripts/apply-branch-protection.sh`
- **Secrets upload script**: `scripts/set-github-secrets.sh`

Automation helpers:

```bash
# Print the full setup checklist
./scripts/setup-github-enterprise.sh

# Perform the repository migration
./scripts/migrate-to-enterprise.sh

# Apply enterprise branch protection
./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 master

# Upload secrets from .env to GitHub Repository Secrets
./scripts/set-github-secrets.sh abc-io-enterprise/redot2
```

## Notes for Agents

- Do not assume the presence of npm build steps, bundlers, or frontend frameworks. Most Node.js services are run directly with `node src/index.js` (or `server.js` for `beacon-pwa`).
- Do not assume test files exist. Validation is done via shell scripts and CI compose validation.
- When modifying a Node.js service, remember that `compose.dev.yml` only includes `gateway`, `operator-station`, and `postgres`. Other services must be tested with the full `docker-compose.yml` or `compose.prod.yml`.
- The `ai-isp` service directory is fully implemented and deployed; it is **not** a placeholder.
- The project language for comments and documentation is **English**.
- When creating or updating enterprise documentation, keep sensitive values (passwords, keys, tokens) out of Git. Reference `.security/SECRETS_INVENTORY.md` instead.
