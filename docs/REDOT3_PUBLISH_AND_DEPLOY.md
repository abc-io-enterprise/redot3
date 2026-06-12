# REDOT3 Publish, Namecheap, and VS Code Deployment Guide

**ABC-IO — Universal Silicone & Carbon Cross-Sensory Information Sharing Communications Platform**  
Created by Christopher Porreca / redot1 · 2026  
Live: https://abc-io.com · contact@abc-io.com · (585) 348-7120

---

## 1. Publish to GitHub repository `redot3`

The successor public repository for the complete ABC-IO system is `abc-io-enterprise/redot3`.

### Prerequisites

- GitHub CLI (`gh`) authenticated with permission to create repositories in the `abc-io-enterprise` organization.
- The local repository is on the `master` branch and all changes are committed.

### Create and push

```bash
# From the project root
cd /path/to/redot2

# Create the public repository (adjust --private if needed)
gh repo create abc-io-enterprise/redot3 \
  --public \
  --description "ABC-IO — Universal silicone and carbon cross-sensory information sharing communications platform" \
  --source . \
  --remote redot3 \
  --push
```

If the repository already exists:

```bash
git remote add redot3 https://github.com/abc-io-enterprise/redot3.git
git push redot3 master
```

### Verify

- Open https://github.com/abc-io-enterprise/redot3
- Confirm `master` branch contains the latest commit.

---

## 2. Namecheap DNS setup

The domain `abc-io.com` is managed through Namecheap. To point it at the ABC-IO infrastructure:

### A Records

| Host | Value | TTL |
|---|---|---|
| `@` | `162.254.32.142` | Automatic |
| `www` | `162.254.32.142` | Automatic |
| `ai1` | `192.227.212.235` | Automatic |
| `ai2` | `192.227.212.237` | Automatic |

### Optional records

| Host | Type | Value | Purpose |
|---|---|---|---|
| `headscale` | A | `162.254.32.142` | Headscale control server |
| `grafana` | A | `162.254.32.142` | Grafana dashboards (if exposed) |
| `prometheus` | A | `162.254.32.142` | Prometheus (if exposed) |

### Steps in Namecheap

1. Log in to https://namecheap.com.
2. Go to **Domain List** → click **Manage** next to `abc-io.com`.
3. Open the **Advanced DNS** tab.
4. Delete any conflicting `@` or `www` A records.
5. Add the A records above.
6. Save and wait for DNS propagation (usually 5–30 minutes).

---

## 3. VS Code deployment workflow

The recommended VS Code deployment uses the Remote-SSH extension and the built-in terminal to run the same automated deploy script used in CI.

### Open the project in VS Code

1. Install the **Remote - SSH** extension.
2. Add the primary VPS to `~/.ssh/config`:

```ssh-config
Host redot1
    HostName 162.254.32.142
    User root
    IdentityFile ~/.ssh/redot1

Host ai1
    HostName 192.227.212.235
    User root
    IdentityFile ~/.ssh/ai1

Host ai2
    HostName 192.227.212.237
    User root
    IdentityFile ~/.ssh/ai2
```

3. In VS Code: `F1` → `Remote-SSH: Connect to Host...` → select `redot1`.
4. Open `/opt/redot2` (or clone `redot3` to `/opt/redot3`).

### Deploy from VS Code terminal

```bash
cd /opt/redot2

# Ensure .env is filled in with production secrets
cp .env.example .env
nano .env

# Deploy to all three nodes
python3 scripts/deploy-triple-node.py
```

The script will:

1. Build a deployment bundle.
2. Upload it and `.env` to `redot1`, `ai1`, and `ai2`.
3. Apply the database patch on the primary node.
4. Configure UFW to allow replicas to reach shared Postgres/Redis.
5. Health-check gateway and Kimi on every node.

### After deploy

- Public portal: https://abc-io.com
- Interface PWA: https://abc-io.com/interface/
- Account PWA: https://abc-io.com/account/
- Gateway health: https://abc-io.com/api/v1/ai/health
- Metrics: https://abc-io.com/metrics

---

## 4. Required secrets

Copy `.env.example` to `.env` and fill in at least:

- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`
- `OWNER_SESSION_TOKEN`
- `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`
- `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`
- `MISTRAL_API_KEY` / `MISTRAL_MODEL` / `MISTRAL_API_BASE_URL`
- `KIMI_API_KEY` / `KIMI_MODEL` / `KIMI_API_BASE_URL`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` / `STRIPE_PRICE_ID_*`
- `PAYPAL_CLIENT_ID` / `PAYPAL_CLIENT_SECRET` / `PAYPAL_WEBHOOK_ID`
- `SMTP_*` credentials
- `VPS_REDOT1_PASSWORD`, `VPS_AI1_PASSWORD`, `VPS_AI2_PASSWORD`

See `.security/SECRETS_INVENTORY.md` for the full list and rotation schedule.

---

## 5. 5-environment system summary

ABC-IO is delivered as a purchasable, five-environment platform:

| Environment | File | Use case |
|---|---|---|
| **Dev** | `compose.dev.yml` | Local development with live reload |
| **Staging** | `compose.staging.yml` | Pre-production integration testing |
| **Production** | `compose.prod.yml` | Live public service on redot1 |
| **Replica AI-1** | `compose.replica-ai1.yml` | Redundant node on ai1 |
| **Replica AI-2** | `compose.replica-ai2.yml` | Redundant node on ai2 |

Each environment is containerized with Docker Compose and can be run independently or as a unified triple-node cluster.

---

## 6. Backup and release ZIP

Create a distributable backup:

```bash
# PowerShell
./scripts/package-release.ps1
```

Or manually:

```bash
zip -r redot1-phase1-complete.zip . \
  -x ".git/*" ".venv/*" "node_modules/*" "__pycache__/*" \
     "repositories/*" "android-sdk/*" "*.zip" "*.tar.gz" ".env"
```

The resulting archive can be stored locally, uploaded to GitHub releases, or deployed to any VPS.

---

## 7. Public use and licensing

- The public-facing site is at https://abc-io.com.
- The source is published at https://github.com/abc-io-enterprise/redot3.
- License is `PROPRIETARY` unless otherwise specified in `LICENSE`.
- For personal or professional licensing inquiries, email contact@abc-io.com.

---

## 8. Launch artifacts and legal policies

The following artifacts are maintained at the repository root and in `legal/` to support launch readiness, audit, and compliance:

### System manifests and reports

| File | Purpose |
|---|---|
| `final_system_manifest.json` | Machine-readable inventory of services, pages, workflows, docs, blockers, and verification results |
| `project_audit_report.md` | Detailed audit of components found, created, blockers, and readiness |
| `launch_readiness_report.md` | Executive launch readiness summary and owner action checklist |

### Legal and policy documents

| File | Purpose |
|---|---|
| `legal/TERMS_OF_SERVICE.md` | Terms governing use of the Service |
| `legal/PRIVACY_POLICY.md` | Privacy and data handling practices |
| `legal/SUPPORT_POLICY.md` | Support channels, hours, and response targets |
| `legal/REFUND_POLICY.md` | Refund eligibility and process |
| `legal/ACCEPTABLE_USE_POLICY.md` | Permitted and prohibited use of the Service |

Before publishing `redot3` or going live, replace the `[EFFECTIVE_DATE]` placeholder in each legal document with the actual launch date and ensure the policies are linked from the public portal footer and signup flow.

---

*Last updated: 2026-06-12*
