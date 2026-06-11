#!/usr/bin/env bash
# Manual checklist script for setting up the abc-io-enterprise GitHub organization.
# This script does NOT perform billing or SAML setup automatically; it prints a
# step-by-step checklist and validates local repository state.

set -euo pipefail

ORG="abc-io-enterprise"
REPO_NAME="redot2"
CURRENT_ORIGIN="ccplexmath/redot2complete"

cat <<EOF
================================================================================
GitHub Enterprise Organization Setup Checklist — $ORG
================================================================================

STEP 1 — Create the organization
--------------------------------
1. Log into GitHub as an existing user with billing access.
2. Visit https://github.com/account/organizations/new
3. Choose "Create a new organization".
4. Organization name: $ORG
5. Contact email: ops@abc-io.com
6. Select "Enterprise" plan (requires billing approval).
7. Add the initial organization owners (at least 2 people).

STEP 2 — Repository migration
-----------------------------
1. In the new org, create an empty repository named "$REPO_NAME".
   Do NOT initialize it with README, license, or .gitignore.
2. Update the local repository remote to point to the new org:

   git remote set-url origin https://github.com/$ORG/$REPO_NAME.git
   git remote add old-origin https://github.com/$CURRENT_ORIGIN.git || true

3. Push all branches and tags:

   git push -u origin --all
   git push origin --tags

4. Verify the new remote:

   git remote -v

STEP 3 — Team and access structure
----------------------------------
Create the following teams under $ORG and grant repository access:

  - platform-maintainers  -> Admin on $REPO_NAME
  - sre                   -> Maintain on $REPO_NAME
  - security              -> Maintain on $REPO_NAME, Admin on Security Advisories
  - backend               -> Write on $REPO_NAME
  - ai                    -> Write on $REPO_NAME
  - mobile                -> Write on $REPO_NAME
  - frontend              -> Write on $REPO_NAME
  - data                  -> Write on $REPO_NAME
  - docs                  -> Triage on $REPO_NAME
  - architecture          -> Triage on $REPO_NAME
  - cloud-governance      -> Triage on $REPO_NAME

STEP 4 — Repository settings
----------------------------
1. Settings > General:
   - Default branch: master (or rename to main after migration)
   - Automatically delete head branches: Enabled
   - Limit how many branches and tags can be updated in a single push: 3
2. Settings > Security > Code security and analysis:
   - Private vulnerability reporting: Enabled
   - Dependency graph: Enabled
   - Dependabot alerts: Enabled
   - Dependabot security updates: Enabled
   - CodeQL analysis: Enabled
   - Secret scanning: Enabled
   - Push protection: Enabled

STEP 5 — Branch protection
--------------------------
Run this script from the repository root:

  ./scripts/apply-branch-protection.sh $ORG/$REPO_NAME master

Or apply the ruleset manually using the definitions in .security/BRANCH_PROTECTION.md.

STEP 6 — Secrets and variables
------------------------------
Populate GitHub Repository Secrets (Actions and Dependabot) using the
inventory in .security/SECRETS_INVENTORY.md and the helper script
scripts/set-github-secrets.sh.

STEP 7 — SAML SSO and audit streaming
-------------------------------------
Follow .security/SAML_SSO_TEMPLATE.md and .security/AUDIT_LOG_STREAMING.md.

STEP 8 — IP allowlist (optional)
--------------------------------
Follow .security/IP_ALLOWLIST.md once primary office/VPN/CI egress IPs are known.

================================================================================
Validation
================================================================================
EOF

cd "$(dirname "$0")/.."

echo "Current repository: $(basename "$(pwd)")"
echo "Current origin: $(git remote get-url origin 2>/dev/null || echo 'none')"
echo "Current branch: $(git branch --show-current 2>/dev/null || echo 'unknown')"
echo "Uncommitted changes: $(git status --short | wc -l) files"

if command -v gh >/dev/null 2>&1; then
  echo "gh CLI: installed ($(gh --version | head -n1))"
else
  echo "gh CLI: NOT installed — install from https://cli.github.com"
fi

echo ""
echo "Run './scripts/apply-branch-protection.sh' after gh login."
