# AGENTS.md — ABC-IO v2.0 (redot2)

This file contains ground-truth information about the project for AI coding agents. If you are reading this, assume you know nothing about the codebase beyond what is written here.

---

## Project Overview

ABC-IO v2.0 (codename `redot2`) is a containerized multi-service system designed for local development, production deployment, and release packaging. It is a Docker Compose-based microservices architecture that provides:

- An API gateway that proxies AI requests to an internal AI service.
- A Python/Flask AI adapter (`kimi`) that calls the Mistral API with an offline fallback mode.
- An owner dashboard for privileged system administration, service lifecycle control, and deployment updates.
- An operator station for operational monitoring and health aggregation.
- A mobile gateway for emergency beaconing and mobile-specific APIs.
- A public portal for public-facing content with signature verification.
- A beacon PWA for location-aware public beacon data.
- Background Python workers that consume Redis queues for async job processing.
- Observability via Prometheus, Grafana, and Jaeger.

The entire stack is intended to run on a single primary VPS or as a multi-host deployment with external DNS.

---

## Technology Stack

| Service | Runtime | Framework | Language | Port |
|---|---|---|---|---|
| `gateway` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 4000 |
| `operator-station` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8080 |
| `owner-dashboard` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8500 |
| `mobile-gateway` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 5050 |
| `public-portal` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 8090 |
| `beacon-pwa` | Node.js 20 Alpine | Express.js | JavaScript (CommonJS) | 3000 |
| `kimi` | Python 3.12 slim | Flask | Python 3 | 5000 |
| `worker` | Python 3.12 Alpine | — | Python 3 | — (headless) |
| `postgres` | PostgreSQL 15 Alpine | — | SQL | 5432 |
| `redis` | Redis Alpine | — | — | 6379 |
| `nginx` | nginx stable-alpine | — | — | 80 / 443 |
| `prometheus` | prom/prometheus | — | — | 9090 |
| `grafana` | grafana/grafana | — | — | 3000 |
| `tracer` | jaegertracing/all-in-one | — | — | 16686 |

**Key architectural notes:**
- All Node.js frontends are vanilla HTML/CSS/JS. There is no React, Vue, or TypeScript anywhere in the project.
- The `owner-dashboard` service runs `docker compose` commands directly via `child_process.execSync`. It effectively has host-level Docker privileges.
- The `gateway` is the central reverse proxy target for NGINX.
- The `kimi` service abstracts the Mistral API. If `MISTRAL_API_KEY` is unset, it returns offline fallback responses.
- The `worker` consumes a Redis list `redot2:jobs:queue` and stores results with a 1-hour TTL.

---

## Project Structure

```
.
├── docker-compose.yml          # Primary 10+ service orchestration
├── compose.dev.yml             # Dev environment with volume mounts for gateway + operator-station
├── compose.prod.yml            # Production environment
├── .env.example                # Template for required secrets
├── config/
│   ├── nginx.conf              # Reverse-proxy to gateway:4000
│   └── prometheus.yml          # Scrapes gateway, operator-station, kimi
├── services/
│   ├── gateway/src/index.js
│   ├── operator-station/src/index.js
│   ├── owner-dashboard/src/index.js (+ src/public/index.html)
│   ├── mobile-gateway/src/index.js (+ src/public/)
│   ├── public-portal/src/index.js (+ src/public/index.html)
│   ├── beacon-pwa/server.js (+ public/)
│   ├── kimi/app.py, worker.py, requirements.txt
│   ├── worker/worker.py, requirements.txt
│   └── postgres/init.sql
├── scripts/
│   ├── health-check.sh         # Curl all service /health endpoints
│   ├── self-heal.sh            # Restart stack if containers are exited
│   ├── auto-heal.sh            # 7-phase health monitor with auto-restart
│   ├── emergency-recovery.sh   # Nuclear option: stop, prune, restart
│   ├── vps-deploy.sh           # Checkout tag and deploy on VPS
│   ├── vps-setup.sh            # One-time Ubuntu/Debian bootstrap
│   ├── provision-redot1.sh     # Alpine provisioning
│   ├── provision-ai-worker.sh  # Bring up only kimi service
│   ├── github-setup.sh         # Interactive GitHub Enterprise setup
│   ├── build-mobile-apk.ps1    # Build/sign Android APK
│   └── package-release.ps1     # Create release ZIP archive
└── .github/workflows/          # CI/CD definitions (see below)
```

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
# 2. Set POSTGRES_PASSWORD, MISTRAL_API_KEY, signing keys, etc.
# 3. Deploy
docker compose -f compose.prod.yml up -d
```

### Release Packaging

```powershell
./scripts/package-release.ps1
```

Creates `rd1backupublive-final-2.0.zip` for distribution.

---

## Service Endpoints (Local)

| Service | URL |
|---|---|
| API Gateway | `http://localhost:4000/health` |
| Gateway AI Proxy | `POST http://localhost:4000/api/ai` |
| Kimi AI Service | `http://localhost:5000/health` |
| Kimi Generate | `POST http://localhost:5000/ai/generate` |
| Operator Station UI | `http://localhost:8080/` |
| Public Portal UI | `http://localhost:8090/` |
| Mobile Gateway UI | `http://localhost:5050/` |
| Owner Dashboard UI | `http://localhost:8500/` |
| APK Backup Status | `http://localhost:8500/api/backup-status` |
| APK Download | `http://localhost:8500/download/apk` |
| Prometheus | `http://localhost:9091` |
| Grafana | `http://localhost:14000` |
| Jaeger UI | `http://localhost:16686` |

---

## Code Style Guidelines

### JavaScript (Node.js services)
- Use **CommonJS** (`require` / `module.exports`). Do **not** use ES modules.
- Use `const` and `let`; avoid `var`.
- Read the port from `process.env.PORT` with a fallback (e.g., `Number(process.env.PORT || 4000)`).
- Express apps should use `express.json()` middleware for JSON bodies.
- Use `helmet` in production-facing services where it is already present (`owner-dashboard`, `mobile-gateway`, `public-portal`, `beacon-pwa`).
- Frontends are served as static files from `src/public/` (or `public/` in `beacon-pwa`) using `express.static`.
- Inline HTML/CSS/JS in server-rendered responses is acceptable and matches existing patterns.

### Python (kimi, worker)
- Use standard library `logging` with the format `'[%(asctime)s] %(levelname)s: %(message)s'`.
- Read configuration from environment variables via `os.getenv` with sensible defaults.
- Flask apps run on `host='0.0.0.0'` and `port=5000`.
- The worker uses `redis.from_url` and blocking `blpop` with a short timeout for periodic heartbeats.

### General
- There is **no ESLint, Prettier, TypeScript, or Jest** configuration in this project. Do not add them unless explicitly requested.
- Dockerfiles for Node.js services follow a uniform pattern: `FROM node:20-alpine`, `WORKDIR /app`, copy `package.json`, `npm install`, copy `src/`, `CMD ["node", "src/index.js"]`.
- Dockerfiles for Python services follow: `FROM python:3.12-alpine` (or `slim`), install `redis` and `requests`, copy source, `CMD ["python", "app.py"]` or `CMD ["python", "-u", "worker.py"]`.

---

## Testing Instructions

**There are no automated unit tests, integration tests, or test frameworks in this project.** Testing is performed operationally:

1. **Health check script:**
   ```bash
   ./scripts/health-check.sh
   ```
   This curls `/health` on gateway, operator-station, public-portal, mobile-gateway, owner-dashboard, and kimi.

2. **Self-heal script:**
   ```bash
   ./scripts/self-heal.sh
   ```
   Validates all health endpoints and restarts the Docker Compose stack if any containers are exited.

3. **Auto-heal script:**
   ```bash
   ./scripts/auto-heal.sh
   ```
   A comprehensive 7-phase monitor that checks service availability, disk/memory usage, DB/cache connectivity, API health, and network state. It auto-restarts failed containers and prunes stale resources.

4. **CI build validation:**
   The `ci.yml` workflow builds Docker images for `gateway`, `operator-station`, and `kimi`, and validates `docker-compose.yml` with `docker compose config`.

---

## CI/CD Workflows

All workflows are in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main` | Build gateway, operator-station, kimi images; validate compose file. |
| `branch-protection.yml` | PR to `master` | Enforce PR descriptions, semantic commits (`feat:`, `fix:`, `docs:`, etc.), code-review requirement, and WIP detection. |
| `codeql-analysis.yml` | Push/PR to `master`, weekly | GitHub CodeQL static security analysis for JavaScript and Python. |
| `deploy.yml` | Manual (`workflow_dispatch`) | SSH to VPS, checkout tag, run `docker compose up -d`, execute `health-check.sh`, 30s smoke test. |
| `gcp-deploy.yml` | Manual (`workflow_dispatch`) | GCP Cloud SDK setup; applies Kubernetes manifests from `infrastructure/gcp/k8s/`. |
| `privacy-checks.yml` | Push/PR to `master` | Scan for `.env`/`.key`/`.secret` files in Git, verify `.gitignore` exclusions, scan `docs/` for PII keywords, assert license compliance. |
| `release.yml` | Tag push (`v*.*.*`) | Build containers, create ZIP archive, publish GitHub release. |
| `secret-scanning.yml` | Push/PR to `master` | Install `truffleHog3` and scan for leaked secrets. |
| `secrets-rotation-reminder.yml` | Monthly (1st @ 08:00 UTC) | Auto-create GitHub issue reminding operators to rotate secrets. |

---

## Security Considerations

### Secrets and Environment Variables
- **Never commit `.env`**. It is excluded by `.gitignore`.
- Copy `.env.example` to `.env` and fill in production values before deploying.
- Required secrets include: `POSTGRES_PASSWORD`, `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, and owner/mobile/public signing keys and fingerprints.

### Signing and Privacy Verification
The project uses independent HMAC-SHA256 signing keys for three roles:

- **Owner Dashboard** (`OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`)
- **Mobile Gateway** (`MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`)
- **Public Portal** (`PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`)

Each exposes `/api/signature` returning `{ system, payload, signature, fingerprint }`.

### Access Control
- The `owner-dashboard` uses a hardcoded session token (`OWNER_SESSION_TOKEN`) via the `x-owner-token` header. The login endpoint also accepts a hardcoded `biometricToken` value of `BIO-VALID`.
- NGINX terminates external traffic and forwards it to the gateway.
- `helmet` is used in several services for HTTP security headers.

### Docker Privileges
- The `owner-dashboard` executes `docker compose` commands directly. In production, this implies the container must have access to the host Docker socket or daemon.
- Production compose intends to use non-root containers where possible (per `SECURITY.md`).

---

## Database Schema

PostgreSQL is initialized via `services/postgres/init.sql`:

```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  payload JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

The gateway connects via `DATABASE_URL=postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/abc_io`.

---

## Deployment Architecture

- **Primary node**: runs `compose.prod.yml` with all services (nginx, gateway, operator-station, owner-dashboard, mobile-gateway, public-portal, kimi, worker, postgres, redis, prometheus, grafana).
- **Optional secondary AI nodes**: additional VPS hosts running only `kimi` and `worker` behind DNS entries like `ai1.abc-io.com`.
- **GCP**: There is a placeholder `gcp-deploy.yml` workflow and `infrastructure/gcp/` directory with Kubernetes manifests for future cloud-native expansion.

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

## Notes for Agents

- Do not assume the presence of npm build steps, bundlers, or frontend frameworks. Most Node.js services are run directly with `node src/index.js`.
- Do not assume test files exist. Validation is done via shell scripts and CI compose validation.
- When modifying a Node.js service, remember that `compose.dev.yml` only includes `gateway` and `operator-station`. Other services must be tested with the full `docker-compose.yml`.
- The `ai-isp` service directory contains only a `README.md` placeholder. It is not containerized or deployed.
- The project language for comments and documentation is **English**.
