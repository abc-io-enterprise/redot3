#!/bin/bash
set -e

# Primary VPS Bootstrap — Ubuntu/Debian
# Run as root on redot1 (162.254.32.142)

apt-get update
apt-get install -y docker.io docker-compose-plugin curl git ufw certbot python3-certbot-nginx jq

systemctl enable docker
systemctl start docker

# Firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5050/tcp
ufw allow 3005/tcp
ufw allow 3006/tcp
ufw allow 7000/tcp
ufw allow 8085/tcp
ufw allow 9091/tcp
ufw allow 14000/tcp
ufw allow 16686/tcp
ufw allow 41641/udp
ufw --force enable

# Create deploy user and directory
useradd -m -s /bin/bash deploy 2>/dev/null || true
usermod -aG docker deploy
mkdir -p /opt/redot2
chown deploy:deploy /opt/redot2

# Backup directory
mkdir -p /backups/postgres
chmod 700 /backups/postgres

echo "Primary node provisioned. Next:"
echo "  1. Clone redot2 repo to /opt/redot2"
echo "  2. Create .env with all production secrets"
echo "  3. Run: docker compose -f compose.prod.yml up -d --build"
echo "  4. Run: ./scripts/health-check.sh"
