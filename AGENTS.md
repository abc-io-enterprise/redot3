<!-- From: c:\Users\cplexmath\OneDrive\Documents\redot2\AGENTS.md -->
# AGENTS.md — ABC-IO v2.0 (redot2)

This file contains ground-truth information about the project for AI coding agents. If you are reading this, assume you know nothing about the codebase beyond what is written here.

---

## Project Overview

ABC-IO v2.0 (codename `redot2`) is a containerized, multi-service platform developed by ABC-IO — the universal silicone and carbon cross-sensory information sharing communications platform. The root `package.json` version is `v5.0.0`, the license is `PROPRIETARY`, and the canonical remote is `https://github.com/abc-io-enterprise/redot2.git`. The current default branch is `master`; CI/CD workflows also trigger on `main` to support migration.

The system is designed for local development, single-primary VPS production, and multi-node deployments. It is orchestrated with Docker Compose and provides:

- **`gateway`** — Central Express.js API gateway with JWT/API-key authentication, per-tier rate limiting, Stripe and PayPal billing, email flows, and routing to backend services.
- **`operator-station`** — Operational dashboard that aggregates health/status from the gateway, owner dashboard, mobile gateway, public portal, and infrastructure services. Renders inline HTML/CSS/JS from a single Express file.
- **`owner-dashboard`** — Privileged admin interface for service lifecycle control, deployment updates, APK backup status, and beacon relay. It executes `docker compose` and `git` commands directly via `child_process.execSync`.
- **`mobile-gateway`** — Mobile-facing API with HMAC signing, cellular backup/failover logic, upstream node health checks, beacon relay, and emergency message caching.
- **`public-portal`** — Public-facing static site with signature verification, help articles, and user progress tracking.
- **`beacon-pwa`** — Minimal location-aware beacon Progressive Web App.
- **`account-pwa`** — Account-aware Progressive Web App for messaging, product management, billing, and quick access to AI translation and beacon services. Served at `/account/` via NGINX.
- **`interface-pwa`** — Touchscreen-first cross-sensory interface PWA for multi-device, multi-modal communication (text, audio, visual, haptic, scent, taste). Served at `/interface/` via NGINX.
- **`beacon`** — Public-safety beacon backend with PostgreSQL storage, 24-hour TTL, haversine region search, and responder acknowledgments.
- **`kimi`** — Python/Flask AI adapter that proxies to Mistral or Kimi with circuit breaker, response cache, retry logic, and offline fallback. Also includes a small standalone Redis consumer (`worker.py`) for the `abc_io_tasks` list.
- **`worker`** — Background Python worker that consumes the Redis list `redot2:jobs:queue` for `ai_inference`, `health_check`, and `security_scan` jobs, storing results with a 1-hour TTL.
- **`ai-isp`** — Cross-sensory translation service (Braille, Morse, Haptic, speech-to-text stubs, sign-language stubs) served by Gunicorn.
- **`autonomous`** — Self-healing orchestrator that monitors core services, restarts failed containers, and queues alerts via Redis.
- **Desktop orchestrator** — `scripts/autonomous-orchestrator.py` monitors public endpoints from the owner's machine and activates cellular fallback.
- **Desktop admin backend** — `admin-desktop/server.py` serves the offline-capable admin UI and proxies local commands.
- **Autonomous APK** — `apk/android-project/` owner-only Android app with biometric login and hardcoded cellular failsafe gateway.
- **Infrastructure services** — `postgres`, `redis`, `nginx`, `prometheus`, `grafana`, `tracer` (Jaeger), `headscale` (WireGuard/Tailscale-compatible VPN control server), and a placeholder `logger` (busybox).

The entire stack is intended to run on a single primary VPS or as a multi-host deployment with external DNS.

---

## v5.0.0 Phase 1 Additions

### Account-aware PWA
- New service `account-pwa` (Node.js 20 Alpine + Express, port `8100` host / `3000` container).
- New service `interface-pwa` (Node.js 20 Alpine + Express, port `8110` host / `3010` container) with cross-sensory sessions, devices, and translation.
- Serves a single-page PWA at `/account/` via NGINX with Web App Manifest and service worker.
- Supports JWT login against the gateway, account dashboard, conversation list, messaging, product catalog, and Stripe checkout.

### Account-scoped messaging
- New PostgreSQL tables: `conversations`, `conversation_participants`, `direct_messages`.
- New gateway routes under `/api/v1/conversations` and `/api/v1/conversations/:id/messages`.
- Messages are scoped to users within the same account; participants must belong to the account.

### Products and add-ons
- New PostgreSQL tables: `products`, `account_products`.
- New gateway routes: `GET /api/v1/account/products` and `POST /api/v1/account/products/:productId/checkout`.
- Seeded products include the free `global-sensory-interface-communications` feature, `mobile-cellular-node` addon, `ai-isp-premium`, and `enterprise-support`.

### Owner/operator seeding
- `scripts/seed-owner-accounts.js` creates `cporreca@abc-io.com` (always-free owner) and `cplexmath@abc-io.com` (reserved system operator, deactivated).
- Prints temporary passwords to stdout; they must be rotated immediately after deployment.

### Updated pages
- `services/public-portal/src/public/sensory-communications.html` — product page.
- `services/public-portal/src/public/pricing.html` — NYS pricing and lock-in notice.
- `services/public-portal/src/public/mobile-app.html` — Account PWA install instructions.

---

## Technology Stack

| Layer | Technology |
|---|---|
| API Gateway / Dashboards / Portals | Node.js 20 Alpine + Express.js (CommonJS), vanilla HTML/CSS/JS frontends |
| AI Adapter | Python 3.12 + Flask (`services/kimi/app.py`) |
| Cross-Sensory Translation | Python 3.11 + Flask + Gunicorn (`services/ai-isp`) |
| Background Worker | Python 3.12 + Redis + PostgreSQL (`services/worker`) |
| Autonomous Orchestrator | Python 3.12 + Redis + Docker socket (`services/autonomous`) |
| Database | PostgreSQL 15 Alpine |
| Cache / Job Queue | Redis Alpine |
| Reverse Proxy | nginx stable-alpine |
| Monitoring | Prometheus + Grafana |
| Tracing | Jaeger all-in-one |
| VPN / Mesh | Headscale (Tailscale-compatible WireGuard control server) |
| Container Orchestration | Docker Compose |
| CI/CD | GitHub Actions |
| Build Tooling | **None of the following exist at project level:** React, Vue, TypeScript compiler config, Webpack, ESLint, Prettier, Jest, `pyproject.toml`, `Cargo.toml`, `Makefile` |

All Node.js frontends are vanilla HTML/CSS/JS. There is no React, Vue, TypeScript, or bundler anywhere in the project.

---

## Repository Structure

```
.
├── package.json                # Root npm workspace metadata + npm scripts
├── docker-compose.yml          # Local 21-service full-stack orchestration
├── compose.dev.yml             # Dev environment with live-reload mounts
├── compose.staging.yml         # Staging orchestration (alternate host ports)
├── compose.prod.yml            # Production orchestration (ports 80/443, limits, healthchecks)
├── compose.replica.yml         # v5.0.0 replica-node compose template
├── compose.replica-ai1.yml     # Replica-node compose for ai1 (192.227.212.235)
├── compose.replica-ai2.yml     # Replica-node compose for ai2 (192.227.212.237)
├── .env.example                # Template for required secrets
├── .env                        # Populated secrets (gitignored; never commit)
├── .gitignore / .dockerignore
├── config/                     # nginx.conf, locations.conf, prometheus.yml, headscale/
├── services/                   # Active v2.0 service implementations
│   ├── gateway/src/index.js
│   ├── operator-station/src/index.js
│   ├── owner-dashboard/src/index.js (+ src/public/)
│   ├── mobile-gateway/src/index.js (+ src/public/)
│   ├── public-portal/src/index.js (+ src/public/)
│   ├── beacon-pwa/server.js (+ public/)
│   ├── account-pwa/server.js (+ public/)
  ├── interface-pwa/server.js (+ public/)
│   ├── beacon/src/index.js
│   ├── kimi/app.py, worker.py, requirements.txt
│   ├── worker/worker.py, requirements.txt
│   ├── ai-isp/src/app.py (+ src/translators/), Dockerfile, requirements.txt
│   ├── autonomous/orchestrator.py, Dockerfile, requirements.txt
│   └── postgres/init.sql
├── scripts/                    # 40+ operational/automation scripts
├── admin-desktop/              # Local offline admin UI (index.html + server.py)
├── apk/                        # Android APK deliverables, keystore, build scripts
├── docs/                       # Runbooks, roadmaps, audit checklists
├── .security/                  # Secrets inventory, branch protection, SAML template, etc.
├── .github/workflows/          # CI/CD definitions
├── .vscode/                    # Editor settings, launch configs, tasks
├── .devcontainer/              # VS Code dev container config
├── infrastructure/gcp/         # Terraform + Kubernetes placeholder manifests
└── repositories/               # Archive of 10 sibling repos (reference only)
```

**Important:** The `repositories/` folder is an archive for reference and future migration; active v2.0 work happens in the root `services/` and `scripts/` directories. Changes under `repositories/` do not affect the running Docker Compose stack unless explicitly promoted.

---

## Build, Run, and Test Commands

### Local Development (full stack)

```bash
# Start the full stack in the background
docker compose up -d

# Or follow logs
npm run dev:logs

# Wait for services to stabilize, then validate
sleep 20
./scripts/health-check.sh
```

### Dev Environment (live-reload volume mounts)

```bash
docker compose -f compose.dev.yml up -d
```

`compose.dev.yml` only starts `gateway`, `operator-station`, and `postgres`, mounting `./services/gateway/src` and `./services/operator-station/src` for live reloading.

### Production

```bash
# 1. Copy and fill in secrets
cp .env.example .env
# 2. Set POSTGRES_PASSWORD, MISTRAL_API_KEY, OWNER_* signing keys and tokens, etc.
# 3. Deploy
docker compose -f compose.prod.yml up -d
```

### Replica Nodes (ai1 / ai2)

```bash
docker compose -f compose.replica.yml up -d
```

`compose.replica.yml` (and per-node files `compose.replica-ai1.yml`, `compose.replica-ai2.yml`) runs `nginx`, `gateway`, `public-portal`, `mobile-gateway`, `beacon-pwa`, `account-pwa`, `interface-pwa`, `kimi`, `ai-isp`, `beacon`, and `worker`. It expects the primary node's Postgres and Redis to be reachable via `DATABASE_URL` and `REDIS_URL`.

### Root npm Scripts

The root `package.json` exposes:

| Script | Command |
|---|---|
| `npm run dev` | `docker compose -f docker-compose.yml up -d` |
| `npm run dev:logs` | `docker compose -f docker-compose.yml up` |
| `npm run prod` | `docker compose -f compose.prod.yml up -d` |
| `npm run prod:logs` | `docker compose -f compose.prod.yml up` |
| `npm run staging` | `docker compose -f compose.staging.yml up -d` |
| `npm run staging:logs` | `docker compose -f compose.staging.yml up` |
| `npm run replica:ai1` | `docker compose -f compose.replica-ai1.yml up -d` |
| `npm run replica:ai2` | `docker compose -f compose.replica-ai2.yml up -d` |
| `npm run build` | `docker compose build` |
| `npm run stop` | `docker compose down` |
| `npm run health` | `bash scripts/health-check.sh` |
| `npm run verify` | `bash scripts/verify-cloud-deployment.sh` |
| `npm run heal` | `bash scripts/auto-heal.sh` |
| `npm run test` | `echo 'Run individual service tests'` |
| `npm run apk:build` | `bash apk/build-apk-manual.sh` |
| `npm run apk:autonomous` | `bash scripts/build-autonomous-apk.sh` |
| `npm run orchestrator` | `python scripts/autonomous-orchestrator.py` |
| `npm run orchestrator:daemon` | `python scripts/autonomous-orchestrator.py --daemon` |
| `npm run desktop:admin` | `python admin-desktop/server.py` |
| `npm run deploy:vps` | `bash scripts/deploy-vps-cluster.sh` |
| `npm run lint` / `npm run format` | Echo that linting/formatting are not configured |

### Staging
```bash
docker compose -f compose.staging.yml up -d
```

### Release Packaging

- `scripts/package-release.ps1` creates `rd1backupublive-final-2.0.zip`.
- `scripts/prepare-deploy-bundle.sh` creates `abc-io-deploy-<tag>.tar.gz` with embedded `startup.sh`.
- `.github/workflows/release.yml` creates `redot2-<version>.zip` + SHA-256 checksum on tag push.

### Mobile APK Builds

- `apk/build-apk-manual.sh` — manual native Android APK build using build-tools 34.0.0.
- `scripts/build-autonomous-apk.sh` — Gradle-based owner-operator APK with biometric login.
- `scripts/build-apk-failsafe.sh` — minimal WebView-wrapped APK if the Gradle project is missing.
- `scripts/build-mobile-apk.ps1` — PowerShell wrapper that attempts Expo/Gradle build.

---

## Service Architecture

### Compose Service Map

`docker-compose.yml` defines **21 services**: `nginx`, `gateway`, `operator-station`, `owner-dashboard`, `mobile-gateway`, `public-portal`, `beacon-pwa`, `account-pwa`, `interface-pwa`, `kimi`, `postgres`, `prometheus`, `grafana`, `redis`, `worker`, `logger`, `tracer`, `headscale`, `ai-isp`, `beacon`, `autonomous`.

| Service | Runtime | Framework | Entry File | Exposed Port (host) | Role |
|---|---|---|---|---|---|
| `gateway` | Node.js 20 Alpine | Express (CommonJS) | `services/gateway/src/index.js` | `4000` | Central API gateway |
| `operator-station` | Node.js 20 Alpine | Express | `services/operator-station/src/index.js` | `8080` | Operations dashboard |
| `owner-dashboard` | Node.js 20 Alpine | Express + `pg` + `helmet` | `services/owner-dashboard/src/index.js` | `8500` | Privileged owner/admin UI |
| `mobile-gateway` | Node.js 20 Alpine | Express + `redis` + `helmet` | `services/mobile-gateway/src/index.js` | `5050` | Mobile/cellular/satellite gateway |
| `public-portal` | Node.js 20 Alpine | Express + `pg` + `helmet` | `services/public-portal/src/index.js` | via nginx (`8090` in prod/replica) | Public marketing/help site |
| `beacon-pwa` | Node.js 20 Alpine | Express + `helmet` + `cors` | `services/beacon-pwa/server.js` | `3005` | Beacon PWA frontend |
| `account-pwa` | Node.js 20 Alpine | Express + `helmet` + `cors` | `services/account-pwa/server.js` | `8100` | Account-aware PWA frontend |
| `interface-pwa` | Node.js 20 Alpine | Express + `helmet` + `cors` | `services/interface-pwa/server.js` | `8110` | Cross-sensory interface PWA |
| `beacon` | Node.js 20 Alpine | Express + `pg` + `nodemailer` | `services/beacon/src/index.js` | `3006` | Public-safety beacon backend |
| `kimi` | Python 3.12 slim | Flask | `services/kimi/app.py` | `5000` | Mistral/Kimi AI adapter |
| `ai-isp` | Python 3.11 slim | Flask + Gunicorn | `services/ai-isp/src/app.py` | `7000` | Cross-sensory translation engine |
| `worker` | Python 3.12 Alpine | headless Redis consumer | `services/worker/worker.py` | headless | Background job processor |
| `autonomous` | Python 3.12 Alpine | headless monitor | `services/autonomous/orchestrator.py` | headless | Self-healing orchestrator |
| `postgres` | PostgreSQL 15 Alpine | — | `services/postgres/init.sql` | `5432` | Relational database |
| `redis` | Redis Alpine | — | — | `6379` | Cache / job queue |
| `nginx` | nginx stable-alpine | — | `config/nginx.conf` + `config/locations.conf` | `8088` (dev), `80`/`443` (prod) | Reverse proxy |
| `prometheus` | prom/prometheus | — | `config/prometheus.yml` | `9091` | Metrics scraper |
| `grafana` | grafana/grafana | — | — | `14000` | Metrics visualization |
| `tracer` | jaegertracing/all-in-one | — | — | `16686` | Distributed tracing |
| `headscale` | headscale/headscale | — | `config/headscale/config.yaml` | `8085`, `9095`, `41641/udp` | WireGuard VPN control server |
| `logger` | busybox | — | — | headless | Placeholder sleep loop |

### Per-Service Notes

- **`gateway`** — Single-file Express app (`services/gateway/src/index.js`). Exposes versioned routes under `/api/v1/`. Connects to PostgreSQL via `DATABASE_URL`, to AI services via `KIMI_ENDPOINTS`, to the translation service at `http://ai-isp:7000`, to the beacon service at `http://beacon:3000`, and to Stripe/PayPal APIs.
- **`operator-station`** — Polls hard-coded internal health URLs and TCP ports, reads `/tmp/abc-io-health.state`, and serves a single inline HTML dashboard.
- **`owner-dashboard`** — Requires `x-owner-token` equal to `OWNER_SESSION_TOKEN`. Login computes the biometric token as `HMAC-SHA256(OWNER_BIOMETRIC_SECRET || OWNER_SIGNING_KEY, email + password)`. Executes `docker compose`/`git` commands directly; production compose mounts `/var/run/docker.sock`.
- **`mobile-gateway`** — Maintains in-memory backup state (`standby`/`active`/`recovery`) with beacon cache (max 500) and emergency messages (max 1000). Upstream nodes default to `primary` (`162.254.32.142:4000`), `ai1` (`192.227.212.235:5000`), and `ai2` (`192.227.212.237:5000`).
- **`public-portal`** — Fatally exits on startup if `PUBLIC_SIGNING_KEY` or `PUBLIC_SIGNING_FINGERPRINT` is missing. Serves ~30 static HTML pages and help-article/progress APIs backed by PostgreSQL.
- **`beacon`** — Uses PostgreSQL haversine queries, 24-hour TTL, external HTTPS calls to Open-Meteo, BigDataCloud, and Overpass API, and SMTP alerts.
- **`beacon-pwa`** — Proxies `/api/v1/beacon` to the `beacon` service and serves static PWA assets.
- **`kimi`** — Proxies to Mistral or Kimi chat-completions endpoints with circuit breaker, retry, 5-minute in-memory cache, and offline fallback. `services/kimi/worker.py` consumes Redis list `abc_io_tasks` and pushes results to `abc_io_results`.
- **`worker`** — Consumes `redot2:jobs:queue`. Job types: `ai_inference`, `health_check`, `security_scan`. Stores results in Redis with key `redot2:jobs:processed:<job_id>` and a 1-hour TTL.
- **`ai-isp`** — Fully implemented. Translation endpoints include `speech-to-text`, `text-to-braille`, `text-to-morse`, `text-to-haptic`, `braille-to-text`, `morse-to-text`, `haptic-to-text`, `text-to-speech`, `text-to-sign`, `sign-to-text`, plus `/api/v1/translate/universal` and `/api/v1/matrix`.
- **`autonomous`** — HTTP/TCP-checks all core services every `CHECK_INTERVAL_SECONDS` (default 30) and restarts failed containers via `docker compose -f /opt/redot2/compose.prod.yml restart <service>` (max 3 heals per service). Pushes `autonomous_alert` jobs to `redot2:jobs:queue`.

### Desktop / Offline Components

| Component | File | Runtime | Port |
|---|---|---|---|
| Desktop orchestrator | `scripts/autonomous-orchestrator.py` | Python 3 (optional `paramiko`) | headless |
| Desktop admin backend | `admin-desktop/server.py` | Python 3 stdlib `http.server` | `8765` (default) |

### Android APK

- Source: `apk/android-project/`
- Keystore: `apk/keystore.jks` (password `abcio123` in build scripts)
- Output: `apk/redot2-latest.apk`, `apk/redot2-operator.apk`

---

## Code Style Guidelines

### JavaScript (Node.js services)

- Use **CommonJS** (`require` / `module.exports`). Do **not** use ES modules.
- Use `const` and `let`; avoid `var`.
- Prefer `async/await` over raw callbacks.
- Read the port from `process.env.PORT` with a numeric fallback, e.g. `Number(process.env.PORT || 4000)`.
- Express apps should use `express.json()` middleware for JSON bodies.
- Use `helmet` in production-facing services where it is already present (`gateway`, `owner-dashboard`, `mobile-gateway`, `public-portal`, `beacon-pwa`, `account-pwa`, `interface-pwa`, `beacon`). `operator-station` does not currently use helmet.
- Frontends are served as static files from `src/public/` (or `public/` in `beacon-pwa`) using `express.static`.
- Inline HTML/CSS/JS in server-rendered responses is acceptable and matches existing patterns.

### Python (`kimi`, `worker`, `ai-isp`, `autonomous`)

- Use standard library `logging` with the format `'[%(asctime)s] %(levelname)s: %(message)s'`.
- Read configuration from environment variables via `os.getenv` with sensible defaults.
- Flask apps run on `host='0.0.0.0'` (`kimi` uses port `5000`; `ai-isp` uses `PORT` env default `7000`).
- Type hints are encouraged.

### Docker

- Dockerfiles for Node.js services follow a uniform pattern: `FROM node:20-alpine`, `WORKDIR /app`, copy `package.json` + `package-lock.json*`, `npm install --production`, copy `src/`, `CMD ["node", "src/index.js"]`.
- `beacon-pwa`, `account-pwa`, and `interface-pwa` are exceptions: flat layout, `server.js` entrypoint. `beacon-pwa` and `account-pwa` expose `3000`; `interface-pwa` exposes `3010`.
- `beacon` Dockerfile additionally drops to `USER node`.
- Python service Dockerfiles generally follow: `FROM python:3.12-alpine` (or `slim`), install dependencies, copy source, `CMD ["python", "app.py"]` or `CMD ["python", "-u", "worker.py"]`.
- `ai-isp` uses `python:3.11-slim`, installs `gcc`, sets `PYTHONPATH=/app/src`, and runs under **Gunicorn** (`gunicorn --bind 0.0.0.0:7000 --workers 2 --timeout 60 app:app`).
- `autonomous` Dockerfile installs `docker-cli` and `bash` and mounts the Docker socket.

### SQL

- Database initialization is in `services/postgres/init.sql`.
- Migrations must be idempotent; never drop production columns without a deprecation window.

### General

- There is **no ESLint, Prettier, TypeScript, or Jest** configuration in this project. Do not add them unless explicitly requested.
- The project language for comments and documentation is **English**.

---

## Testing Instructions

**There are no automated unit tests, integration tests, or test frameworks in this project.** Validation is performed operationally:

1. **Health check script:**
   ```bash
   ./scripts/health-check.sh
   ```
   Curls `/health` on gateway, operator-station, public-portal, mobile-gateway, owner-dashboard, kimi, beacon, beacon-pwa, account-pwa, interface-pwa, ai-isp, nginx, prometheus, grafana, tracer, and headscale; TCP-checks postgres and redis.

2. **Cluster health check:**
   ```bash
   ./scripts/health-check-cluster.sh
   ```
   Triple-node checks against redot1, ai1, and ai2.

3. **Self-heal script:**
   ```bash
   ./scripts/self-heal.sh
   ```
   Validates core health endpoints and restarts the Docker Compose stack if any containers are exited.

4. **Auto-heal script:**
   ```bash
   ./scripts/auto-heal.sh
   ```
   A 7-phase monitor that checks service availability, disk/memory usage, DB/cache connectivity, API health, and network state. Auto-restarts failed containers and prunes stale resources. Logs to `/var/log/abc-io-health.log` and writes state to `/tmp/abc-io-health.state`.

5. **Operational validation:**
   ```bash
   python scripts/operational-validation.py
   ```
   Public HTTPS validation of `abc-io.com` pages/APIs, DNS/SSL checks, optional SSH VPS checks. Generates `OPERATIONAL_REPORT.md`.

6. **Full system audit:**
   ```bash
   python scripts/full-system-audit.py
   ```
   Validates required files, compose files, git status/tags, APK artifacts, public endpoints, autonomous wiring, and documentation presence.

7. **CI build validation:**
   The `ci.yml` workflow builds Docker images for all services and validates `docker-compose.yml`, `compose.dev.yml`, `compose.staging.yml`, `compose.prod.yml`, `compose.replica.yml`, `compose.replica-ai1.yml`, and `compose.replica-ai2.yml` with `docker compose config`.

---

## Security Considerations

### Secrets and Environment Variables

- **Never commit `.env`**. It is excluded by `.gitignore`.
- Copy `.env.example` to `.env` and fill in production values before deploying.
- Production secrets are stored in **GitHub Repository Secrets** and synchronized to the VPS `.env` at deploy time via `scripts/set-github-secrets.sh`.
- Required secret groups include: `POSTGRES_PASSWORD`, `MISTRAL_API_KEY`, `MISTRAL_MODEL`, `MISTRAL_API_BASE_URL`, `KIMI_API_KEY`, `KIMI_MODEL`, `KIMI_API_BASE_URL`, `KIMI_ENDPOINTS`, owner/mobile/public signing keys and fingerprints, `OWNER_SESSION_TOKEN`, `OWNER_ACCOUNT_EMAIL`, `OWNER_ACCOUNT_PASSWORD`, `OWNER_BIOMETRIC_SECRET`, `GATEWAY_API_KEY`, `SELF_HEAL_TOKEN`, `JWT_SECRET`, Stripe secrets + 10 `STRIPE_PRICE_ID_*`, PayPal secrets, `PUBLIC_URL`, `CORS_ORIGIN`, `SMTP_*`, Headscale/Gitea/Namecheap placeholders, and VPS SSH passwords.
- See `.security/SECRETS_INVENTORY.md` for the canonical list and rotation schedule.

### Signing and Privacy Verification

The project uses independent HMAC-SHA256 signing key pairs for three roles:

- **Owner Dashboard** — `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`
- **Mobile Gateway** — `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`
- **Public Portal** — `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`

Each signing service exposes `/api/signature` returning `{ system, payload, signature, fingerprint }`.

### Access Control

- **Gateway JWT:** HS256, 7-day expiry, signed with `JWT_SECRET` (falling back to `OWNER_SIGNING_KEY`), issuer `'abc-io'`.
- **API keys:** Any prefix allowed, stored as SHA-256 hashes with an 8-character prefix in `api_keys`.
- **Owner Dashboard:** Requires the `x-owner-token` header (or `token` in the body) to equal `OWNER_SESSION_TOKEN`. The biometric token is computed as `HMAC-SHA256(OWNER_BIOMETRIC_SECRET || OWNER_SIGNING_KEY, email + password)`.
- **Public Portal:** Fatally exits on startup if `PUBLIC_SIGNING_KEY` or `PUBLIC_SIGNING_FINGERPRINT` is missing.
- **Stripe webhooks:** Verified with `STRIPE_WEBHOOK_SECRET`.
- **PayPal webhooks:** Skeleton implementation present in gateway.

### Rate Limiting

Per-minute limits keyed by `accountId || ip`:

| Tier | Limit |
|---|---|
| free | 30 |
| basic | 60 |
| standard | 120 |
| pro | 300 |
| business | 600 |
| team | 1200 |
| corporate | 2000 |
| enterprise | 3000 |
| agency | 5000 |
| global | 10000 |

### Docker Privileges

- The `owner-dashboard` executes `docker compose` and `git` commands directly via `child_process.execSync`. In production it mounts `/var/run/docker.sock`.
- The `autonomous` service mounts `/var/run/docker.sock:ro` and `/opt/redot2:ro` to restart failed containers.
- Production compose sets `deploy.resources.limits.memory` per service and uses `json-file` logging with 10 MB rotation and 3 files.

### Branch Protection and Pre-Commit

- Default branch protection requires 2 approvals, CODEOWNERS review, signed commits, linear history, no force pushes/deletions, and required status checks (`CI / build`, `Dependency Review`, `CodeQL`, `Secret Scanning`).
- `.githooks/pre-commit` blocks commits of `.env`, `.key`, `.secret`, `.pem`, `.p12`, `.pfx` files and warns on `password = ...` patterns.
- Conventional Commits are required (`feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `security`, `revert`).

### Vulnerability Response

Severity-based SLAs (from `docs/SECURITY_RUNBOOK.md`):

- Critical — 1-hour response / 24-hour patch
- High — 4-hour response / 72-hour patch
- Medium — 1 business day / 14 days
- Low — 1 week / next release

---

## Deployment Architecture

- **Single-primary VPS mode:** run `compose.prod.yml` with all 21 services; NGINX listens on `80`/`443` and terminates/proxies traffic.
- **Local dev mode:** `docker compose up -d` uses `docker-compose.yml` with local ports (`4000`, `8080`, `8500`, `5050`, `3005`, `8100`, `8110`, `5000`, `7000`, `3006`, `8088`, `9091`, `14000`, `16686`, `8085`, etc.). Note: `public-portal` host port `8090` is intentionally removed in local compose; access it via NGINX.
- **Live-reload dev mode:** `compose.dev.yml` only starts `gateway`, `operator-station`, and `postgres` with volume mounts.
- **Replica / multi-node mode:** `compose.replica-ai1.yml` and `compose.replica-ai2.yml` run gateway, public-portal, mobile-gateway, beacon-pwa, account-pwa, interface-pwa, kimi, ai-isp, beacon, worker, and nginx on `ai1`/`ai2`, sharing the primary DB/Redis.
- **Headscale mesh:** `scripts/deploy-vps-cluster.sh` and `scripts/deploy-triple-node.py` deploy a 3-node topology (redot1 full stack + ai1/ai2 replicas) and join them into a Headscale WireGuard mesh.
- **Staged deployment:** `scripts/deploy-staged-redot1.py` deploys the stack in **7 ordered waves** (infra → gateway → dashboards → AI → beacon → monitoring/autonomous → nginx) to avoid OOM on a 4GB VPS.
- **GCP:** `infrastructure/gcp/terraform/` and `infrastructure/gcp/k8s/` contain Terraform and Kubernetes manifests. `.github/workflows/gcp-deploy.yml` is currently a placeholder with commented-out build/push/apply steps.

### Hard-Coded Default IPs / Domain

- Primary (`redot1`): `162.254.32.142`
- AI worker 1 (`ai1`): `192.227.212.235`
- AI worker 2 (`ai2`): `192.227.212.237`
- Public domain: `abc-io.com`
- Headscale: `headscale.abc-io.com:8085`

---

## CI/CD Workflows

All workflows live in `.github/workflows/`:

| Workflow | Trigger | Purpose |
|---|---|---|
| `ci.yml` | Push/PR to `main`/`master` (ignores `**.md`, `docs/**`, `.security/**`) | Build all service Docker images; validate `docker-compose.yml`, `compose.dev.yml`, `compose.staging.yml`, `compose.prod.yml`, `compose.replica.yml`, `compose.replica-ai1.yml`, and `compose.replica-ai2.yml`. |
| `branch-protection.yml` | PR to `main`/`master` | Enforce PR descriptions, semantic commits, no WIP/Draft markers, and linked-issue hint. |
| `codeql-analysis.yml` | Push/PR to `main`/`master`, weekly (`0 3 * * 0`) | GitHub CodeQL static security analysis for JavaScript and Python. |
| `dependency-review.yml` | PR to `main`/`master` | Scan dependency changes, fail on `moderate` severity, enforce license compliance. **Allows:** MIT, Apache-2.0, BSD, ISC, Python-2.0, Unlicense, CC0-1.0, 0BSD, BlueOak-1.0.0. **Denies:** GPL, AGPL, and LGPL variants. |
| `deploy.yml` | Manual (`workflow_dispatch`) | SSH to VPS, checkout tag, write secrets to `.env`, run `docker compose -f compose.prod.yml up -d --remove-orphans`, execute `health-check.sh`, 30s smoke test. |
| `gcp-deploy.yml` | Manual (`workflow_dispatch`) | GCP Workload Identity Federation setup; commented-out build/push and `kubectl apply` for `infrastructure/gcp/k8s/`. |
| `privacy-checks.yml` | Push/PR to `main`/`master` | Scan for tracked `.env`/`.key`/`.secret` files, verify `.gitignore` exclusions, scan `docs/` for PII keywords, assert license compliance. |
| `release.yml` | Tag push (`v*.*.*`) | Build containers, create ZIP archive, generate SHA-256 checksum, publish GitHub release, and attest build provenance. |
| `secret-scanning.yml` | Push/PR to `main`/`master` | Install `truffleHog3` and scan for leaked secrets. |
| `secrets-rotation-reminder.yml` | Monthly (`0 8 1 * *`) + manual | Open GitHub issue reminding operators to rotate secrets. |

---

## Key Files for Common Tasks

| Task | File(s) |
|---|---|
| Add a new API route to the gateway | `services/gateway/src/index.js` |
| Change AI model behavior or offline fallback | `services/kimi/app.py` |
| Add a new background job type | `services/worker/worker.py` |
| Modify owner dashboard UI or admin logic | `services/owner-dashboard/src/index.js` and `src/public/index.html` |
| Update database initialization | `services/postgres/init.sql` |
| Change NGINX routing | `config/nginx.conf`, `config/locations.conf` |
| Add Prometheus targets | `config/prometheus.yml` |
| Modify CI behavior | `.github/workflows/ci.yml` |
| Build/release packaging | `scripts/package-release.ps1`, `scripts/prepare-deploy-bundle.sh` |
| Mobile APK build | `apk/build-apk-manual.sh`, `scripts/build-autonomous-apk.sh`, `scripts/build-mobile-apk.ps1` |
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

---

## Notes for Agents

- Do not assume the presence of npm build steps, bundlers, or frontend frameworks. Most Node.js services are run directly with `node src/index.js` (or `server.js` for `beacon-pwa`, `account-pwa`, and `interface-pwa`).
- The `autonomous` service and the `owner-dashboard` require Docker socket access (`/var/run/docker.sock`) to restart failed containers or execute compose commands.
- The desktop orchestrator expects SSH passwords in environment variables (`VPS_REDOT1_PASSWORD`, `VPS_AI1_PASSWORD`, `VPS_AI2_PASSWORD`).
- The autonomous APK uses `androidx.biometric` and NanoHTTPD; build via `scripts/build-autonomous-apk.sh` or Android Studio.
- Do not assume test files exist. Validation is done via shell scripts and CI compose validation.
- When modifying a Node.js service, remember that `compose.dev.yml` only includes `gateway`, `operator-station`, and `postgres`. Other services must be tested with the full `docker-compose.yml` or `compose.prod.yml`.
- The `ai-isp` service directory is fully implemented and deployed; it is **not** a placeholder.
- The project language for comments and documentation is **English**.
- When creating or updating enterprise documentation, keep sensitive values (passwords, keys, tokens) out of Git. Reference `.security/SECRETS_INVENTORY.md` instead.
- Node.js Dockerfiles in `services/*` run `npm install --production` inside the image; they no longer rely on copying a pre-existing `node_modules` directory.
- `.env` is gitignored and blocked from being read by agent tools; treat any values you need as sourced from `.env.example` and the service compose environment blocks.
