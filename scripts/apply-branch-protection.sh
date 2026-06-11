#!/usr/bin/env bash
# Apply enterprise branch protection rules to the redot2 repository.
# Requires: gh CLI installed and authenticated with admin:repo scope.
# Usage: ./scripts/apply-branch-protection.sh [org/repo] [branch]

set -euo pipefail

REPO="${1:-abc-io-enterprise/redot2}"
BRANCH="${2:-master}"

echo "Applying branch protection to $REPO::$BRANCH"

gh api "repos/$REPO/branches/$BRANCH/protection" \
  --method PUT \
  --header "Accept: application/vnd.github+json" \
  --header "X-GitHub-Api-Version: 2022-11-28" \
  --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "CI / build",
      "Dependency Review",
      "CodeQL",
      "Secret Scanning"
    ]
  },
  "enforce_admins": true,
  "required_pull_request_reviews": {
    "required_approving_review_count": 2,
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true,
    "dismissal_restrictions": {}
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "required_signatures": true,
  "required_deployments": [
    {
      "environment": "production"
    }
  ]
}
EOF

echo "Branch protection applied successfully."
