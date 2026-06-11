# GitHub Enterprise Migration Plan — redot2

This document is the authoritative migration plan for moving the `redot2` repository from the current namespace to the `abc-io-enterprise` GitHub Enterprise organization.

## Current State

- **Current origin**: `https://github.com/ccplexmath/redot2complete.git`
- **Current branch**: `master`
- **Current remotes**: Multiple sibling repositories under `repositories/`
- **Target organization**: `abc-io-enterprise`
- **Target repository**: `redot2`
- **Target default branch**: `master` (can be renamed to `main` post-migration)

## Migration Phases

### Phase 0 — Pre-Migration Checklist

- [ ] Confirm `abc-io-enterprise` GitHub Enterprise organization is created and billing is active.
- [ ] Confirm at least two organization owners are designated.
- [ ] Confirm the primary contact email `ops@abc-io.com` is reachable.
- [ ] Audit current repository for secrets using `truffleHog3` and GitHub secret scanning.
- [ ] Ensure all open PRs are either merged or closed.
- [ ] Ensure the working tree is clean on the bootstrap machine.
- [ ] Back up the repository to a secure offline location:
  ```bash
  git bundle create redot2-pre-migration.bundle --all
  ```

### Phase 1 — Create Target Repository

1. In `abc-io-enterprise`, create an empty repository named `redot2`.
2. Do **not** initialize with README, license, or `.gitignore`.
3. Note the new clone URL: `https://github.com/abc-io-enterprise/redot2.git`.

### Phase 2 — Push Code and History

From the local repository root:

```bash
# Preserve current origin
git remote rename origin old-origin

# Add new enterprise origin
git remote add origin https://github.com/abc-io-enterprise/redot2.git

# Push all branches and tags
git push -u origin --all
git push origin --tags
```

Verify:

```bash
git remote -v
gh repo view abc-io-enterprise/redot2
```

### Phase 3 — Configure Repository Settings

Follow `docs/ENTERPRISE_SETUP_RUNBOOK.md` sections **Phase 4** and **Phase 5**:

- Security settings (Dependabot, CodeQL, secret scanning, push protection).
- Repository secrets via `./scripts/set-github-secrets.sh`.
- Branch protection via `./scripts/apply-branch-protection.sh`.

### Phase 4 — Team Setup

Create teams and map IdP groups per `.security/SAML_SSO_TEMPLATE.md`. Add members and assign repository permissions.

### Phase 5 — Validate CI/CD

1. Trigger `ci.yml` manually or open a test PR.
2. Confirm `Dependency Review`, `CodeQL`, and `Secret Scanning` complete successfully.
3. Validate `deploy.yml` with a staging deployment.

### Phase 6 — Cut Over

1. Update internal documentation and runbooks to reference `abc-io-enterprise/redot2`.
2. Update `AGENTS.md` if it references the old origin.
3. Archive or delete the old repository after a 30-day observation window.
4. Announce the migration to all stakeholders.

## Post-Migration Verification

```bash
# Verify default branch and protection
gh api repos/abc-io-enterprise/redot2/branches/master/protection

# Verify secrets are populated
gh secret list --repo abc-io-enterprise/redot2

# Verify workflows are active
gh workflow list --repo abc-io-enterprise/redot2

# Run local health check
docker compose up -d
sleep 20
./scripts/health-check.sh
```

## Rollback Plan

If a critical issue is discovered within 48 hours of migration:

1. Revert the remote URL to the old origin.
2. Push any new commits made after migration back to the old repository.
3. Notify the team to avoid merging to the new repository until the issue is resolved.
4. Reattempt migration after root cause is fixed.

## Timeline

| Step | Estimated Duration | Owner |
|------|-------------------|-------|
| Pre-migration audit | 1 hour | Security |
| Create org and repo | 30 minutes | Platform |
| Push code and history | 15 minutes | Platform |
| Configure settings and protection | 1 hour | Platform |
| Team and SSO setup | 2 hours | Security |
| CI/CD validation | 2 hours | SRE |
| Cut over and announcement | 30 minutes | Platform |
