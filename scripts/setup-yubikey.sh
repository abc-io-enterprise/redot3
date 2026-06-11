#!/usr/bin/env bash
# ABC-IO YubiKey Setup Script
# Owner: Christopher Porreca / redot1
# Contact: cporreca@abc-io.com | 585-629-9120

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ADMIN_DIR="${PROJECT_ROOT}/admin-desktop"

REDS="\033[0;31m"
GRNS="\033[0;32m"
YELS="\033[1;33m"
NC="\033[0m"

echo -e "${YELS}==================================${NC}"
echo -e "${YELS}ABC-IO YubiKey Setup${NC}"
echo -e "${YELS}==================================${NC}"
echo ""
echo "Insert your YubiKey now and press Enter..."
read -r

# Check for YubiKey
if ! command -v ykman &> /dev/null; then
  echo -e "${REDS}ykman not found. Install YubiKey Manager CLI to continue.${NC}"
  exit 1
fi

echo -e "${GRNS}YubiKey detected.${NC}"
mkdir -p "$ADMIN_DIR"

# Generate resident SSH key
echo "Generating resident SSH key on YubiKey..."
SSH_KEY="${ADMIN_DIR}/yubikey-ssh"
if [ ! -f "${SSH_KEY}.pub" ]; then
  ssh-keygen -t ed25519-sk -O resident -O verify-required -f "$SSH_KEY" -N "" -C "abcio-yubikey-$(date +%Y%m%d)"
  echo -e "${GRNS}SSH key created: ${SSH_KEY}.pub${NC}"
fi

# Copy public key to VPS nodes
echo "Adding SSH key to VPS nodes..."
for host in 162.254.32.142 192.227.212.235 192.227.212.237; do
  echo "  -> $host"
  ssh-copy-id -i "${SSH_KEY}.pub" "root@${host}" 2>/dev/null || echo "    (manual add required for $host)"
done

# Export GPG public key if card has OpenPGP
echo "Exporting GPG public key from YubiKey..."
if gpg --card-status &>/dev/null; then
  gpg --armor --export cporreca@abc-io.com > "${ADMIN_DIR}/yubikey-gpg.asc" 2>/dev/null || \
    echo "No OpenPGP key found on YubiKey. Configure via gpg --card-edit."
fi

echo ""
echo -e "${GRNS}YubiKey setup complete.${NC}"
echo "Files created:"
echo "  ${SSH_KEY}.pub"
echo "  ${ADMIN_DIR}/yubikey-gpg.asc"
echo ""
echo "Next steps:"
echo "  1. Set YUBIKEY_ENABLED=true in .env"
echo "  2. Update OWNER_BIOMETRIC_SECRET with YubiKey-backed derivation"
echo "  3. Store the physical YubiKey in a safe location"
