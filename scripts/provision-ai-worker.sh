#!/bin/bash
set -e

# AI Worker Node Bootstrap — Ubuntu/Debian
# Run as root on ai1 and ai2

apt-get update
apt-get install -y docker.io docker-compose-plugin curl git ufw

systemctl enable docker
systemctl start docker

# Basic firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 5000/tcp   # kimi
ufw allow 6379/tcp   # redis (internal mesh)
ufw --force enable

mkdir -p /opt/redot2
chown $(logname 2>/dev/null || echo "$SUDO_USER"): /opt/redot2

echo "AI worker node provisioned. Next:"
echo "  1. Clone redot2 repo to /opt/redot2"
echo "  2. Create .env with AI_PROVIDER and MISTRAL_API_KEY"
echo "  3. Run: docker compose -f compose.prod.yml up -d kimi worker redis"
