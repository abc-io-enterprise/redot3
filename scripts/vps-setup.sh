#!/usr/bin/env bash
set -euo pipefail

# VPS setup for redot2 — Ubuntu/Debian
# Creates a non-root deploy user, installs Docker and Docker Compose plugin,
# enables UFW, and configures basic firewall rules.

DEPLOY_USER=redot2
SSH_PORT=2222

if [ "$EUID" -ne 0 ]; then
  echo "Run this script as root or with sudo"
  exit 1
fi

apt update && apt upgrade -y

# Create deploy user
id -u $DEPLOY_USER &>/dev/null || useradd -m -s /bin/bash $DEPLOY_USER
usermod -aG sudo $DEPLOY_USER

# Install dependencies
apt install -y ca-certificates curl gnupg lsb-release ufw chrony git

# Install Docker
mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
apt update
apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Enable docker
systemctl enable --now docker

# UFW basic rules
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Time sync
systemctl enable --now chronyd || systemctl enable --now chrony || true

echo "VPS bootstrapped. Next: copy repo and create .env for production as non-root user: $DEPLOY_USER"

exit 0
