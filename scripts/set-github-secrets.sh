#!/usr/bin/env bash
# Upload secrets from a local .env file to GitHub Repository Secrets.
# Requires: gh CLI installed and authenticated with repo scope.
# Usage: ./scripts/set-github-secrets.sh [org/repo]
# WARNING: This script reads plaintext from .env. Run only on a trusted machine.

set -euo pipefail

REPO="${1:-abc-io-enterprise/redot2}"
ENV_FILE=".env"

cd "$(dirname "$0")/.."

if ! command -v gh >/dev/null 2>&1; then
  echo "Error: gh CLI is not installed. Get it from https://cli.github.com"
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "Error: gh CLI is not authenticated. Run: gh auth login"
  exit 1
fi

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found in $(pwd). Copy .env.example to .env and fill it in."
  exit 1
fi

echo "Uploading secrets from $ENV_FILE to $REPO (GitHub Actions)"
echo "----------------------------------------------------------------"

# Read .env line by line and set each non-empty, non-comment variable as a secret.
while IFS='=' read -r key value; do
  # Skip empty lines and comments
  [[ -z "$key" ]] && continue
  [[ "$key" =~ ^[[:space:]]*# ]] && continue

  # Trim whitespace
  key="$(echo "$key" | xargs)"
  value="$(echo "$value" | xargs)"

  [[ -z "$value" ]] && continue

  echo "Setting secret: $key"
  echo "$value" | gh secret set "$key" --repo "$REPO" --body "$value" || {
    echo "Warning: failed to set $key"
  }
done < "$ENV_FILE"

echo "----------------------------------------------------------------"
echo "Actions secrets uploaded. Now uploading PROD_ENV_FILE as a single secret..."

# Also upload the entire .env file as PROD_ENV_FILE for deploy.yml
gh secret set PROD_ENV_FILE --repo "$REPO" --body "$(cat "$ENV_FILE")"

echo "----------------------------------------------------------------"
echo "Done. Verify with: gh secret list --repo $REPO"
echo "Never commit $ENV_FILE to git."
