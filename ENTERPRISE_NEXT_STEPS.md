# Enterprise Setup — Immediate Next Steps

All preparatory work is complete and pushed to `https://github.com/ccplexmath/redot2complete.git`. This file contains the exact actions required to finish the GitHub Enterprise configuration.

## Status

| Item | Status |
|------|--------|
| Repository hardening (CODEOWNERS, templates, workflows) | ✅ Complete |
| Security policies and secrets inventory | ✅ Complete |
| Enterprise runbooks (setup, security, DR, onboarding) | ✅ Complete |
| Migration scripts | ✅ Complete |
| Pushed to current origin | ✅ Complete |
| GitHub Enterprise org created | ⏳ Needs your GitHub login / billing |
| Repository migrated to `abc-io-enterprise/redot2` | ⏳ Blocked on org creation |
| Secrets uploaded to GitHub | ⏳ Blocked on org creation |
| Branch protection applied | ⏳ Blocked on org creation |
| SAML SSO / audit streaming configured | ⏳ Blocked on Enterprise Cloud subscription |

## Path A — Browser Automation (Recommended)

If you want me to drive the GitHub UI for you:

1. Install the Kimi WebBridge browser extension:
   - https://www.kimi.com/features/webbridge
   - https://www.kimi.com/zh-cn/features/webbridge (中文)
2. Open your browser and log into the GitHub account that will own the enterprise org.
3. Have a payment method ready (GitHub Enterprise Cloud is a paid subscription).
4. Tell me: "WebBridge is connected, proceed with GitHub org creation."

I will then:
- Navigate to GitHub organization creation
- Fill in `abc-io-enterprise` and `ops@abc-io.com`
- Pause for you to confirm billing
- Create the empty `redot2` repository
- Run the migration script
- Apply branch protection
- Guide you through secret upload

## Path B — Manual Setup (Fastest if you prefer)

If you want to do this yourself, run these exact steps:

### Step 1 — Create the organization

1. Go to https://github.com/account/organizations/new
2. Choose **Create a new organization**
3. Fill in:
   - **Organization name**: `abc-io-enterprise`
   - **Contact email**: `ops@abc-io.com`
   - **Plan**: GitHub Enterprise Cloud
4. Complete billing and invite the initial owners.

### Step 2 — Create the repository

1. Inside `abc-io-enterprise`, create a new repository named `redot2`.
2. **Do NOT** initialize it with README, license, or `.gitignore`.

### Step 3 — Migrate this repository

Open Git Bash in `C:\Users\cplexmath\OneDrive\Documents\redot2` and run:

```bash
./scripts/migrate-to-enterprise.sh
```

This will rename the current origin to `old-origin`, add `abc-io-enterprise/redot2` as the new origin, and push all branches and tags.

### Step 4 — Configure repository settings

In the GitHub UI for `abc-io-enterprise/redot2`:

1. **Settings > General**
   - Default branch: `master`
   - Automatically delete head branches: **Enabled**
2. **Settings > Security > Code security and analysis**
   - Private vulnerability reporting: **Enabled**
   - Dependency graph: **Enabled**
   - Dependabot alerts: **Enabled**
   - Dependabot security updates: **Enabled**
   - CodeQL analysis: **Enabled**
   - Secret scanning: **Enabled**
   - Push protection: **Enabled**

### Step 5 — Apply branch protection

In Git Bash:

```bash
# Requires gh CLI: https://cli.github.com
# Run: gh auth login
./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 master
```

Or apply manually using `.security/BRANCH_PROTECTION.md`.

### Step 6 — Upload secrets

1. Copy `.env.example` to `.env` and fill in real production values.
2. Generate strong secrets using the commands in `.security/SECRETS_INVENTORY.md`.
3. Upload to GitHub:

```bash
./scripts/set-github-secrets.sh abc-io-enterprise/redot2
```

### Step 7 — Configure SAML and audit streaming

Follow:
- `.security/SAML_SSO_TEMPLATE.md`
- `.security/AUDIT_LOG_STREAMING.md`
- `.security/IP_ALLOWLIST.md`

### Step 8 — Validate

```bash
docker compose up -d
sleep 20
./scripts/health-check.sh
```

Open a test pull request to confirm CI, Dependency Review, CodeQL, and Secret Scanning all pass.

## Critical Security Reminders

1. **Rotate example credentials immediately**: `FINAL_HANDOFF.md` contains placeholder/demo credentials. Generate real values and update `.env` before uploading secrets.
2. **Do not commit `.env`**: it is already in `.gitignore`, but verify before pushing.
3. **Review `scripts/deploy-python.py`**: it uses password-based SSH authentication. Replace with key-based auth for enterprise compliance.
4. **Enable 2FA** for all organization members.
5. **Store the `.env` backup** in your enterprise password manager, not in this repository.

## Support

If anything fails, check the detailed runbooks:
- `docs/ENTERPRISE_SETUP_RUNBOOK.md`
- `docs/GITHUB_ENTERPRISE_MIGRATION.md`
- `docs/SECURITY_RUNBOOK.md`
- `docs/DISASTER_RECOVERY.md`
