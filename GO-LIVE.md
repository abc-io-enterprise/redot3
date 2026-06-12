# ABC-IO v2.0 — GO LIVE CHECKLIST
**Prepared:** June 10, 2026
**Deploy Bundle:** `abc-io-deploy-049a363.tar.gz` (24 MB)

---

## ✅ Pre-Flight (Local Desktop) — COMPLETE

| Check | Status |
|-------|--------|
| All 17 Docker services running | ✅ |
| All 10 health endpoints return 200 | ✅ |
| APK built and downloadable | ✅ (45.6 KB) |
| Git working tree clean | ✅ |
| All code pushed to GitHub | ✅ (`049a363`) |
| .env has 52 keys configured | ✅ |
| Deploy bundle created | ✅ (`abc-io-deploy-049a363.tar.gz`) |

---

## 🚀 GO-LIVE STEPS

### Step 1: Verify VPS Access

Test SSH to all 3 nodes. If any fail, resolve before deploying.

```bash
# Test redot1 (full stack)
ssh root@162.254.32.142 "echo 'redot1 OK'"

# Test ai1 (AI worker)
ssh root@192.227.212.235 "echo 'ai1 OK'"

# Test ai2 (AI standby)
ssh root@192.227.212.237 "echo 'ai2 OK'"
```

**If SSH uses password auth**, install `sshpass` and use:
```bash
# Debian/Ubuntu VPS
apt-get update && apt-get install -y sshpass

# Then deploy with passwords (set these env vars first):
#   REDOT1_ROOT_PASSWORD
#   AI1_ROOT_PASSWORD
#   AI2_ROOT_PASSWORD
bash scripts/deploy-with-password.sh
```

**If SSH uses key auth**, copy your key first:
```bash
ssh-copy-id root@162.254.32.142
ssh-copy-id root@192.227.212.235
ssh-copy-id root@192.227.212.237
bash scripts/deploy-vps-cluster.sh
```

---

### Step 2: Copy .env to VPS (CRITICAL)

`.env` contains all secrets and is NOT in git. You must copy it manually.

```bash
# Copy to redot1
scp .env root@162.254.32.142:/opt/abc-io/

# Copy to ai1
scp .env root@192.227.212.235:/opt/abc-io/

# Copy to ai2
scp .env root@192.227.212.237:/opt/abc-io/
```

---

### Step 3: Deploy with Bundle (Recommended)

The bundle contains everything needed — code, APK, startup script.

```bash
# Deploy bundle is already built locally:
ls abc-io-deploy-049a363.tar.gz

# Option A: SCP manually to each node
scp abc-io-deploy-049a363.tar.gz root@162.254.32.142:/opt/
ssh root@162.254.32.142 "cd /opt && tar -xzf abc-io-deploy-049a363.tar.gz && cd abc-io && bash startup.sh"

# For ai1 and ai2, only start AI services:
ssh root@192.227.212.235 "cd /opt/abc-io && docker compose -f compose.prod.yml up -d kimi worker redis headscale"
ssh root@192.227.212.237 "cd /opt/abc-io && docker compose -f compose.prod.yml up -d kimi worker redis headscale"

# Option B: Use the password deploy script (if sshpass installed)
bash scripts/deploy-with-password.sh
```

---

### Step 4: Sync Namecheap DNS

```bash
# Run from local desktop
bash scripts/sync-namecheap-dns.sh
```

This sets A records for:
- `abc-io.com` → 162.254.32.142
- `www.abc-io.com` → 162.254.32.142
- `redot1.abc-io.com` → 162.254.32.142
- `ai1.abc-io.com` → 192.227.212.235
- `ai2.abc-io.com` → 192.227.212.237
- `admin.abc-io.com` → 162.254.32.142

Wait 5-30 minutes for DNS propagation.

---

### Step 5: Verify Cloud Deployment

```bash
bash scripts/verify-cloud-deployment.sh
```

Expected output:
```
[redot1] Gateway Health: 200 OK
[redot1] Owner Dashboard: 200 OK
[redot1] Public Portal: 200 OK
[ai1] AI Health: 200 OK
[ai2] AI Health: 200 OK
All checks passed.
```

---

### Step 6: Install APK on Android Phone

1. Download from owner dashboard: `http://162.254.32.142:8500/download/apk`
2. Transfer to your Google Fold 9
3. Enable "Install unknown apps" in Settings
4. Install and grant all permissions
5. Tap **START BACKUP GATEWAY**
6. Confirm notification appears with "Privacy Mode" status

---

### Step 7: Final Verification Before Desktop Shutdown

Open Owner Dashboard → click **"Run Full Verification"**

All 6 checks must show ✅:
1. Public Cloud Services
2. Android APK
3. GitHub Backup
4. VPN Mesh
5. AI Provider
6. Local Backup

Then follow `SHUTDOWN_CHECKLIST.md` for safe desktop shutdown.

---

## 📡 Post-Go-Live URLs

| Service | URL |
|---------|-----|
| Public Portal | `https://abc-io.com` |
| Owner Dashboard | `https://admin.abc-io.com` or `http://162.254.32.142:8500` |
| Gateway API | `http://162.254.32.142:4000` |
| AI Service | `http://162.254.32.142:5000` |
| Prometheus | `http://162.254.32.142:9091` |
| Grafana | `http://162.254.32.142:14000` |
| APK Download | `http://162.254.32.142:8500/download/apk` |

---

## 🆘 If Deployment Fails

**VPS not reachable?**
- Check firewall: `ufw status` on VPS
- Check port 22: `nc -zv YOUR_IP 22`
- Verify credentials with hosting provider

**Docker not installed on VPS?**
```bash
ssh root@YOUR_VPS_IP "apt-get update && apt-get install -y docker.io docker-compose git curl"
```

**.env missing on VPS?**
```bash
scp .env root@YOUR_VPS_IP:/opt/abc-io/
```

**Services won't start?**
```bash
ssh root@162.254.32.142 "cd /opt/abc-io && docker compose -f compose.prod.yml logs --tail 50"
```

---

## 🎉 GO-LIVE CONFIRMATION

When all steps above are complete, the system is **LIVE** and your desktop can be shut down.

**Operating independently:**
- 🌐 Public cloud on 3 VPS nodes
- 🤖 AI services via Mistral API
- 🔒 WireGuard mesh VPN
- 📱 Android cellular backup gateway
- 📊 Full observability (Prometheus/Grafana)

**System will run 24/7 without the local desktop.**
