# New Team Member Onboarding — ABC-IO v2.0

Welcome to the ABC-IO platform team. This guide will get you oriented with the codebase, security practices, and operational workflows.

## Day 1 — Access and Accounts

1. **IdP / SAML**: Ensure you can sign in to the `abc-io-enterprise` GitHub organization via SSO.
2. **Teams**: Confirm you are in the correct GitHub team(s) (see `docs/ENTERPRISE_SETUP_RUNBOOK.md`).
3. **Slack/Teams**: Join `#platform-ops`, `#security`, and your discipline channel.
4. **Password manager**: Request access to the enterprise vault for read-only secrets.
5. **VPS access**: Provide your SSH public key (Ed25519) to the SRE team for `.authorized_keys`.

## Day 1 — Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/abc-io-enterprise/redot2.git
   cd redot2
   ```
2. Copy environment template:
   ```bash
   cp .env.example .env
   ```
   Fill in local development values (do not use production secrets).
3. Start the stack:
   ```bash
   docker compose up -d
   sleep 20
   ./scripts/health-check.sh
   ```
4. Verify key endpoints:
   - Gateway: `http://localhost:4000/health`
   - Owner Dashboard: `http://localhost:8500`
   - Operator Station: `http://localhost:8080`
   - Prometheus: `http://localhost:9091`
   - Grafana: `http://localhost:14000`

## Day 2 — Read the Docs

Read these documents in order:

1. `AGENTS.md` — ground truth for AI agents; also good for humans who want the quick reference.
2. `docs/ENTERPRISE_SETUP_RUNBOOK.md` — how the org and repo are configured.
3. `SECURITY.md` — security architecture and responsibilities.
4. `docs/SECURITY_RUNBOOK.md` — day-to-day security operations.
5. `docs/DISASTER_RECOVERY.md` — what to do when things break.
6. `CONTRIBUTING.md` — how we write code and open PRs.
7. `.github/CODEOWNERS` — who reviews what.

## Day 2 — Make a Test Change

1. Create a branch: `git checkout -b docs/onboarding-<your-name>`.
2. Add your name to `docs/ONBOARDING.md` under **Team Roster** (optional) or fix a typo.
3. Open a PR and go through the full review process.
4. Verify CI passes before merging.

## Week 1 — Operational Rotation

All platform engineers spend half a day on operational rotation during their first month:

1. Run `./scripts/health-check.sh` and `./scripts/auto-heal.sh`.
2. Review Prometheus dashboards and Grafana alerts.
3. Walk through a simulated deployment with a senior SRE.
4. Read the last three incident postmortems (if any).

## Security Expectations

- Never commit secrets, `.env` files, or keys.
- Use the password manager for any secret you need to share.
- Lock your workstation when away.
- Report suspected security issues immediately to `#security`.
- Enable 2FA on all work accounts.

## Escalation

| Situation | Contact |
|-----------|---------|
| Can't access GitHub org | `#platform-ops` |
| Local stack won't start | `#platform-ops` |
| Suspected secret leak | `#security` (do not paste the secret) |
| Production incident | Page on-call SRE via PagerDuty/Opsgenie |
| Emergency (legal/physical) | `security@abc-io.com` or `+1-555-ABC-IO-911` |

## Team Roster

| Name | Role | GitHub | Slack |
|------|------|--------|-------|
|      |      |        |       |

*Edit this table as the team grows.*
