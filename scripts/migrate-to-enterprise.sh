#!/usr/bin/env bash
# Migrate the local redot2 repository to the abc-io-enterprise GitHub organization.
# This script performs the actual remote swap and push. It is safe to re-run if
# the new remote is already configured.
# Usage: ./scripts/migrate-to-enterprise.sh [target-org] [target-repo]

set -euo pipefail

ORG="${1:-abc-io-enterprise}"
REPO_NAME="${2:-redot2}"
NEW_REMOTE="https://github.com/$ORG/$REPO_NAME.git"

cd "$(dirname "$0")/.."

echo "================================================================================"
echo "Repository Migration Tool"
echo "Target: $NEW_REMOTE"
echo "================================================================================"

# Sanity checks
if ! command -v git >/dev/null 2>&1; then
  echo "Error: git is not installed."
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "Warning: gh CLI not found. Some verification steps will be skipped."
fi

# Ensure working tree is clean
if [ -n "$(git status --short)" ]; then
  echo "Error: working tree is not clean. Commit or stash changes before migrating."
  git status --short
  exit 1
fi

CURRENT_ORIGIN_URL=$(git remote get-url origin 2>/dev/null || echo "")
if [ -z "$CURRENT_ORIGIN_URL" ]; then
  echo "Error: no 'origin' remote found."
  exit 1
fi

echo "Current origin: $CURRENT_ORIGIN_URL"

# Rename old origin if it exists and is not already pointing to the target
if [ "$CURRENT_ORIGIN_URL" = "$NEW_REMOTE" ]; then
  echo "Origin already points to the target. Nothing to migrate."
else
  echo "Renaming current origin to 'old-origin'..."
  git remote rename origin old-origin || true
  echo "Adding new origin: $NEW_REMOTE"
  git remote add origin "$NEW_REMOTE"
fi

echo ""
echo "Pushing all branches and tags to $NEW_REMOTE ..."
git push -u origin --all
git push origin --tags

echo ""
echo "================================================================================"
echo "Migration complete."
echo "================================================================================"
git remote -v

if command -v gh >/dev/null 2>&1 && gh auth status >/dev/null 2>&1; then
  echo ""
  echo "Verifying repository on GitHub..."
  gh repo view "$ORG/$REPO_NAME" --web || true
else
  echo ""
  echo "Verify the repository at: https://github.com/$ORG/$REPO_NAME"
fi

echo ""
echo "Next steps:"
echo "  1. Configure repository security settings (see docs/ENTERPRISE_SETUP_RUNBOOK.md)."
echo "  2. Apply branch protection: ./scripts/apply-branch-protection.sh $ORG/$REPO_NAME master"
echo "  3. Upload secrets: ./scripts/set-github-secrets.sh $ORG/$REPO_NAME"
echo "  4. Validate CI/CD by opening a test pull request."
