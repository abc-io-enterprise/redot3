# Enterprise Setup Runbook — ABC-IO v2.0

This runbook describes how to stand up the `abc-io-enterprise` GitHub organization, migrate the `redot2` repository, and configure enterprise-grade controls from a single source of truth.

## Prerequisites

- GitHub account with billing privileges.
- Enterprise email domain (`abc-io.com`) and DNS control.
- Docker Desktop or Docker Engine 24+ on the bootstrap machine.
- `gh` CLI installed and authenticated.
- Primary VPS provisioned with Ubuntu 22.04 LTS (or Debian 12) and SSH key access.

## Phase 1 — Create the GitHub Enterprise Organization

1. Visit [https://github.com/account/organizations/new](https://github.com/account/organizations/new).
2. Choose **Create a new organization**.
3. Enter:
   - **Organization name**: `abc-io-enterprise`
   - **Contact email**: `ops@abc-io.com`
   - **Plan**: GitHub Enterprise Cloud (requires billing approval)
4. Invite the initial organization owners (minimum 2 people).
5. Enable **Two-factor authentication** requirement under `Settings > Authentication security`.

## Phase 2 — Migrate the Repository

1. In `abc-io-enterprise`, create a new empty repository named `redot2`.
   - Do **not** initialize it with README, license, or `.gitignore`.
2. From the local repository root, run the migration script:
   ```bash
   ./scripts/setup-github-enterprise.sh
   ```
3. Update the origin and push all history:
   ```bash
   git remote rename origin old-origin
   git remote add origin https://github.com/abc-io-enterprise/redot2.git
   git push -u origin --all
   git push origin --tags
   ```
4. Verify:
   ```bash
   git remote -v
   gh repo view abc-io-enterprise/redot2
   ```

## Phase 3 — Configure Teams and Access

Create the following teams and grant repository access. See `.security/SAML_SSO_TEMPLATE.md` for IdP group mapping.

| Team | Repository Permission | Responsibility |
|------|----------------------|----------------|
| `platform-maintainers` | Admin | Architecture, releases, emergency changes |
| `sre` | Maintain | Infrastructure, deployments, on-call |
| `security` | Maintain | Vulnerability management, audit, incident response |
| `backend` | Write | Gateway, operator-station, owner-dashboard |
| `ai` | Write | Kimi, worker, ai-isp |
| `mobile` | Write | Mobile-gateway, beacon, beacon-pwa |
| `frontend` | Write | Public-portal, beacon-pwa |
| `data` | Write | Postgres schema, analytics |
| `docs` | Triage | Documentation, runbooks |
| `architecture` | Triage | Long-term design, repository archive |
| `cloud-governance` | Triage | GCP, cost, compliance |

## Phase 4 — Repository Security Settings

1. **Settings > General**
   - Default branch: `master` (or rename to `main` if preferred)
   - Automatically delete head branches: **Enabled**
   - Limit how many branches and tags can be updated in a single push: **3**
2. **Settings > Security > Code security and analysis**
   - Private vulnerability reporting: **Enabled**
   - Dependency graph: **Enabled**
   - Dependabot alerts: **Enabled**
   - Dependabot security updates: **Enabled**
   - CodeQL analysis: **Enabled**
   - Secret scanning: **Enabled**
   - Push protection: **Enabled**
3. **Settings > Secrets and variables > Actions**
   - Populate using `./scripts/set-github-secrets.sh abc-io-enterprise/redot2`.
4. **Settings > Secrets and variables > Dependabot**
   - Replicate only the secrets required for dependency resolution.

## Phase 5 — Branch Protection

Apply the ruleset defined in `.security/BRANCH_PROTECTION.md`:

```bash
./scripts/apply-branch-protection.sh abc-io-enterprise/redot2 master
```

Required status checks:
- `CI / build`
- `Dependency Review`
- `CodeQL`
- `Secret Scanning`

## Phase 6 — SAML SSO and Audit Streaming

Follow the dedicated templates:
- `.security/SAML_SSO_TEMPLATE.md`
- `.security/AUDIT_LOG_STREAMING.md`
- `.security/IP_ALLOWLIST.md`

## Phase 7 — Validate the Setup

Run the operational validation checklist:

```bash
# Local stack
docker compose up -d
sleep 20
./scripts/health-check.sh

# Verify GitHub Actions are active
gh workflow list --repo abc-io-enterprise/redot2
gh run list --repo abc-io-enterprise/redot2 --limit 5
```

## Ongoing Maintenance

- Review Dependabot alerts weekly.
- Rotate secrets monthly (automated reminder issue is created by `.github/workflows/secrets-rotation-reminder.yml`).
- Review CODEOWNERS quarterly for team membership changes.
- Test disaster recovery procedures quarterly.
