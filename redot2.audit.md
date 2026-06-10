# redot2.audit.md

## Audit Summary

This document records the final verification steps and completed project work for ABC-IO v2.0.

### Verified Components

- `docker-compose.yml` and `compose.prod.yml` orchestration
- `services/gateway` API gateway
- `services/operator-station` operator UI
- `services/owner-dashboard` owner command center
- `services/mobile-gateway` mobile satellite backup
- `services/public-portal` public portal
- `services/kimi` AI service with offline fallback
- `services/postgres` database schema initialization
- Monitoring via `prometheus` and `grafana`
- Health check and self-heal automation scripts
- Documentation files and deployment guide

### Environment and Secrets

Configuration values are stored in `.env` and `.env.example`.

- `POSTGRES_PASSWORD`
- `OWNER_ACCOUNT_EMAIL`
- `OWNER_ACCOUNT_PASSWORD`
- `OWNER_SESSION_TOKEN`
- `OWNER_SIGNING_KEY`
- `OWNER_SIGNING_FINGERPRINT`
- `MOBILE_SIGNING_KEY`
- `MOBILE_SIGNING_FINGERPRINT`
- `PUBLIC_SIGNING_KEY`
- `PUBLIC_SIGNING_FINGERPRINT`
- `MISTRAL_API_KEY`
- `MISTRAL_MODEL`
- `MISTRAL_API_BASE_URL`

### Security and Privacy

- Owner dashboard uses owner-specific signing and command control.
- Mobile gateway beacon relay is protected by session token.
- Public portal exposes signature data for verification.
- Prometheus port moved to `9091` to avoid conflicts.

### Deployment Notes

Local startup command:

```bash
cd redot2
docker compose up -d
sleep 20
./scripts/health-check.sh
```

Self-healing command:

```bash
./scripts/self-heal.sh
```

### Completed Work

- Added owner session and beacon relay to `services/owner-dashboard`
- Added secure signing and fingerprint variables
- Updated `docker-compose.yml` with restart policies
- Added `scripts/self-heal.sh`
- Updated `README.md` and `PROJECT_INVENTORY.md`
- Created final audit record `redot2.audit.md`

### Status

- Project files are complete and saved.
- Full local deployment is configured, pending available host ports and correct `.env` values.
- No external public services are required to run the system.
