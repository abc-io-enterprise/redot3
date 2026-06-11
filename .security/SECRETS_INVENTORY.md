# Secrets Inventory — ABC-IO v2.0 (redot2)

This document lists every secret required by the application and CI/CD pipelines. All values must be stored in **GitHub Repository Secrets** (Actions + Dependabot) or in an enterprise secret manager; they must never be committed to the repository.

## Secret Naming Convention

- Repository secrets are UPPER_SNAKE_CASE.
- Multi-line secrets (PEM keys, full `.env` files) use the `_BASE64` suffix when encoded.
- Rotation dates are tracked in `.security/SECRETS_ROTATION_LOG.md`.

## Application Secrets (Runtime)

| Secret | Service | Purpose | Rotation |
|--------|---------|---------|----------|
| `POSTGRES_PASSWORD` | postgres, gateway | Database authentication | 90 days |
| `MISTRAL_API_KEY` | kimi | Mistral AI provider API key | On compromise |
| `KIMI_API_KEY` | kimi | Kimi AI provider API key | On compromise |
| `OWNER_SESSION_TOKEN` | owner-dashboard | Admin session bearer token | 90 days |
| `OWNER_ACCOUNT_PASSWORD` | owner-dashboard | Hardcoded owner account password | 90 days |
| `OWNER_SIGNING_KEY` | owner-dashboard | HMAC-SHA256 private key for signatures | 180 days |
| `OWNER_BIOMETRIC_SECRET` | owner-dashboard | Biometric token derivation secret | 180 days |
| `MOBILE_SIGNING_KEY` | mobile-gateway | HMAC-SHA256 private key for signatures | 180 days |
| `PUBLIC_SIGNING_KEY` | public-portal | HMAC-SHA256 private key for signatures | 180 days |
| `GATEWAY_API_KEY` | gateway | Internal service API key | 90 days |
| `SELF_HEAL_TOKEN` | operator-station, scripts | Token for self-heal endpoints | 90 days |
| `REDOT1_API_KEY` | gateway, operator-station | Primary node API key | 90 days |
| `JWT_SECRET` | gateway | JWT signing key (>= 32 bytes random) | 180 days |
| `STRIPE_SECRET_KEY` | gateway | Stripe secret key | On compromise |
| `STRIPE_WEBHOOK_SECRET` | gateway | Stripe webhook endpoint secret | On endpoint rotation |
| `STRIPE_PRICE_ID_PRO` | gateway | Stripe price ID for Pro tier | On plan change |
| `STRIPE_PRICE_ID_ENTERPRISE` | gateway | Stripe price ID for Enterprise tier | On plan change |
| `SMTP_URL` / `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_FROM` | gateway | Transactional email credentials | 90 days |
| `HEADSCALE_API_KEY` | headscale | Headscale control server API key | 180 days |
| `GITEA_SECRET_KEY` | gitea | Gitea internal secret key | 180 days |
| `GITEA_INTERNAL_TOKEN` | gitea | Gitea internal API token | 180 days |
| `GITEA_DB_PASSWORD` | gitea | Gitea database password | 90 days |
| `GITEA_SSH_HOST_KEY_PATH` | gitea | Path to SSH host key (usually mounted) | On host rebuild |
| `NAMECHEAP_VPS_API_KEY` | scripts | Namecheap VPS API key | On compromise |
| `NAMECHEAP_SHARED_HOSTING_API_KEY` | scripts | Namecheap shared hosting API key | On compromise |

## CI/CD Secrets (GitHub Actions)

| Secret | Workflow | Purpose |
|--------|----------|---------|
| `VPS_HOST` | deploy.yml | Production VPS IP or hostname |
| `VPS_USER` | deploy.yml | Deployment SSH user |
| `VPS_SSH_KEY` | deploy.yml | Private SSH key for deployment (Ed25519 or RSA 4096) |
| `PROD_ENV_FILE` | deploy.yml | Full `.env` file contents for production |
| `GITHUB_TOKEN` | all | Automatically provided; used for releases and checks |
| `DOCKERHUB_USERNAME` | release.yml | Container registry username (optional) |
| `DOCKERHUB_TOKEN` | release.yml | Container registry PAT (optional) |

## Dependabot Secrets

Dependabot requires its own copy of any secret used during dependency resolution or build:

- `POSTGRES_PASSWORD` (if tests require a live DB)
- `MISTRAL_API_KEY` (only if integration tests are added)
- `VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY` (not recommended; keep deploy-only)

## Generating Secure Values

```bash
# 32-byte hex secret
openssl rand -hex 32

# 24-byte hex key
openssl rand -hex 24

# Strong alphanumeric password
openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32

# Ed25519 deployment key
ssh-keygen -t ed25519 -a 100 -f deploy_key -C "deploy@abc-io.com"
```

## Setting Secrets via Automation

Use the helper script:

```bash
# Ensure .env is filled in and never committed
./scripts/set-github-secrets.sh abc-io-enterprise/redot2
```

## Rotation Log

See `.security/SECRETS_ROTATION_LOG.md` for the rotation history.
