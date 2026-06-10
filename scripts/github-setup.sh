#!/bin/bash
# ABC-IO v2.0 - GitHub Enterprise Configuration
# Sets up GitHub authentication, SSH keys, and repository configuration
# Run this ONCE on initial setup

set -e

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"
}

log "=== ABC-IO GITHUB ENTERPRISE SETUP ===" 
log "This script configures Git for GitHub Enterprise deployment"
log ""

# Prompt for GitHub settings
echo "Enter GitHub Organization (e.g., abc-io-enterprises):"
read -r ORG_NAME
echo "Enter GitHub Repository (e.g., redot2):"
read -r REPO_NAME
echo "Enter GitHub Personal Access Token (for authentication):"
read -rs GH_TOKEN
echo ""

REPO_URL="https://${GH_TOKEN}@github.com/${ORG_NAME}/${REPO_NAME}.git"

log "Configuring Git with:"
log "  Organization: $ORG_NAME"
log "  Repository: $REPO_NAME"
log ""

# Configure Git credentials
log "Step 1: Configuring Git global settings..."
git config --global user.email "cporreca@abc-io.com"
git config --global user.name "ABC-IO Operator"
git config --global credential.helper store

log "Step 2: Setting up GitHub Enterprise remote..."
git remote remove origin 2>/dev/null || true
git remote add origin "$REPO_URL"

log "Step 3: Configuring SSH key deployment (if exists)..."
if [ -f ~/.ssh/id_ed25519 ]; then
  log "✓ SSH key found - GitHub SSH ready"
  GIT_SSH_COMMAND="ssh -i ~/.ssh/id_ed25519" git ls-remote origin HEAD 2>/dev/null || log "Warning: SSH test failed"
else
  log "ℹ SSH key not found - using HTTPS authentication"
fi

log "Step 4: Testing GitHub connection..."
if git ls-remote origin HEAD > /dev/null 2>&1; then
  log "✓ GitHub connection successful"
else
  log "✗ GitHub connection failed - verify token and permissions"
fi

log ""
log "=== SETUP COMPLETE ===" 
log "Repository configured: $REPO_URL"
log "Next steps:"
log "  1. Push to GitHub: git push -u origin master"
log "  2. Configure GitHub Actions secrets"
log "  3. Set up deployment webhooks"
