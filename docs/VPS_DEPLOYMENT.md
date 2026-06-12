# ABC-IO v2.0 VPS Deployment Guide

## Purpose

This guide describes how to provision, harden, and deploy ABC-IO v2.0 on the primary VPS (`redot1`) and the AI worker nodes (`ai1`, `ai2`).

## Overview

| Node | Role | Services |
|---|---|---|
| `redot1` | Primary gateway | Full 21-service stack |
| `ai1` | AI worker 1 | `kimi`, `worker`, plus replica gateway/public services |
| `ai2` | AI worker 2 | `kimi`, `worker`, plus replica gateway/public services |

Replica nodes share the primary `postgres` and `redis` via `DATABASE_URL` and `REDIS_URL`.

## Bootstrap the primary node

```bash
# SSH into the primary VPS
ssh root@<PRIMARY_VPS_IP>

# Run the bootstrap script
./scripts/vps-setup.sh

# Create deploy user and application directory
useradd -m -s /bin/bash deploy
mkdir -p /opt/redot2
chown deploy:deploy /opt/redot2

# Install Docker if not already present
curl -fsSL https://get.docker.com | sh
usermod -aG docker deploy
systemctl enable docker
systemctl start docker
```

## Security hardening

### UFW firewall

```bash
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 5050/tcp
ufw allow 8085/tcp
ufw allow 41641/udp
ufw allow 9091/tcp
ufw allow 14000/tcp
ufw enable
```

Restrict Prometheus (`9091`) and Grafana (`14000`) to monitoring/admin IPs in production.

### Docker socket

- Mount `/var/run/docker.sock` read-only into `owner-dashboard` and `autonomous`.
- Ensure only the `deploy` user and `docker` group have access to the socket.
- No other containers should receive socket access.

### Fail2ban (optional)

```bash
apt install fail2ban
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/access.log
bantime = 600
maxretry = 10
EOF
systemctl restart fail2ban
```

## Deploy the stack

### Staged deployment (recommended for 4 GB VPS)

```bash
export VPS_REDOT1_PASSWORD="$VPS_REDOT1_PASSWORD"
python3 scripts/deploy-staged-redot1.py
```

The script deploys in seven waves to avoid out-of-memory conditions.

### Full deployment (8 GB+ VPS)

```bash
cd /opt/redot2
git checkout <release-tag>

# Ensure .env is present and locked down
chmod 600 .env

# Deploy
docker compose -f compose.prod.yml up -d --build --remove-orphans
sleep 30
./scripts/health-check.sh
```

## Deploy AI worker nodes

On each replica:

```bash
cd /opt/redot2
git checkout <release-tag>
chmod 600 .env
docker compose -f compose.replica-ai1.yml up -d --build --remove-orphans
# or compose.replica-ai2.yml on ai2
./scripts/health-check.sh
```

## Headscale VPN mesh

On `redot1`:

```bash
docker compose -f compose.prod.yml up -d headscale
docker compose -f compose.prod.yml exec headscale headscale namespaces create abc-io
docker compose -f compose.prod.yml exec headscale headscale preauthkeys create -e 24h -n abc-io
```

On `ai1` and `ai2`, run the client setup script and join the mesh with the pre-auth key.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: provision VPS instances for `redot1`, `ai1`, and `ai2`
- reason: physical/virtual infrastructure must exist before automation can deploy
- where it is needed: VPS provider dashboard and SSH client
- exact steps:
  1. Order or confirm three VPS instances with at least 4 GB RAM (8 GB recommended for the primary).
  2. Note the public IPs.
  3. Add SSH public keys for the deploy user.
  4. Run `scripts/vps-setup.sh` on each node.
- verification method: `ssh deploy@<IP>` succeeds on all three nodes and `docker --version` reports a current version

`ACTION REQUIRED FROM OWNER`
- item needed: upload the production `.env` to `/opt/redot2` on all nodes
- reason: services cannot start without required secrets
- where it is needed: primary VPS and both AI worker nodes
- exact steps:
  1. Generate or retrieve the production `.env` from the password manager.
  2. Copy it securely to each node (e.g., `scp .env deploy@<IP>:/opt/redot2/.env`).
  3. Run `chmod 600 /opt/redot2/.env` on each node.
  4. Confirm `.env` is not in Git.
- verification method: `docker compose -f compose.prod.yml config` resolves all `${}` placeholders without error

`ACTION REQUIRED FROM OWNER`
- item needed: obtain and install TLS certificates
- reason: HTTPS is required for public trust and payment-provider webhooks
- where it is needed: primary VPS host
- exact steps:
  1. Install Certbot.
  2. Run `certbot certonly --standalone -d abc-io.com -d www.abc-io.com`.
  3. Mount `/etc/letsencrypt` into the `nginx` container.
  4. Set up auto-renewal (`certbot renew --dry-run`).
- verification method: `openssl s_client -connect abc-io.com:443` shows a valid certificate

## Verification

```bash
# On redot1
./scripts/health-check.sh
./scripts/auto-heal.sh

# Public endpoints
curl -s https://abc-io.com/health
curl -s https://abc-io.com/api/v1/system/health
curl -s https://abc-io.com/admin/health
curl -s https://abc-io.com:5050/health

# AI worker nodes
curl -s https://ai1.abc-io.com:5000/health
curl -s https://ai2.abc-io.com:5000/health

# SSL validity
openssl s_client -connect abc-io.com:443 -servername abc-io.com < /dev/null 2>/dev/null | openssl x509 -noout -dates
```

All checks must pass before declaring the VPS deployment complete.
