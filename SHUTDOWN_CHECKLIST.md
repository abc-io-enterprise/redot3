# ABC-IO v2.0 — Zero-Desktop Shutdown Checklist

Use this checklist to verify the system is fully cloud-independent before shutting down the local development desktop permanently.

---

## ✅ Phase 1: Local Verification (Run on Desktop)

### 1.1 All Docker Services Healthy
```bash
docker compose ps
```
- [ ] All 15 services show `Up` status
- [ ] No services in `Restarting` or `Exit` state

### 1.2 Health Endpoints Respond
```bash
npm run health
# or
bash scripts/health-check.sh
```
- [ ] gateway:4000 → 200 OK
- [ ] operator-station:8080 → 200 OK
- [ ] owner-dashboard:8500 → 200 OK
- [ ] mobile-gateway:5050 → 200 OK
- [ ] public-portal:8090 → 200 OK
- [ ] kimi:5000 → 200 OK

### 1.3 Owner Dashboard Verification
1. Open [`http://localhost:8500`](http://localhost:8500)
2. Authenticate with owner credentials
3. Click **"Run Full Verification"**
- [ ] All 6 checklist items show ✅ PASS

---

## ✅ Phase 2: Cloud Deployment Verification

### 2.1 VPS Nodes Deployed
```bash
bash scripts/verify-cloud-deployment.sh
```
- [ ] redot1 (162.254.32.142) — all services respond
- [ ] ai1 (159.203.110.44) — AI worker responds
- [ ] ai2 (159.203.44.3) — AI standby responds

### 2.2 Headscale VPN Mesh
```bash
# On each VPS node:
tailscale status
```
- [ ] All 3 nodes connected to mesh
- [ ] Magic DNS resolving (`redot1.abc-io.com`, `ai1.abc-io.com`, `ai2.abc-io.com`)

### 2.3 AI Provider Operational
- [ ] Mistral API key configured and responding
- [ ] Fallback to Kimi works if Mistral is down

---

## ✅ Phase 3: Android APK Verification

### 3.1 APK Downloadable
1. Open [`http://localhost:8500/download/apk`](http://localhost:8500/download/apk)
- [ ] File downloads successfully
- [ ] File size is ~41 KB

### 3.2 APK Installation
- [ ] Install `redot2-operator.apk` on Android device
- [ ] Grant required permissions (Location, Network, Foreground Service)
- [ ] Tap "Start Gateway" — service starts without errors
- [ ] Visit `http://<phone-ip>:5050/` — backup gateway page loads

---

## ✅ Phase 4: GitHub Backup Verification

### 4.1 All Code Committed
```bash
git status
```
- [ ] Working tree clean (no uncommitted changes)

### 4.2 Pushed to Origin
```bash
git log --oneline origin/master..HEAD
```
- [ ] No unpushed commits

### 4.3 All 10 Repositories Documented
- [ ] `repositories/` directory contains all 10 subdirectories
- [ ] 4 placeholder repos documented as empty upstream

---

## ✅ Phase 5: Final Safety Checks

### 5.1 Environment & Secrets
- [ ] `.env` file is NOT committed to git (`git check-ignore .env` returns `.env`)
- [ ] `.env` backed up to password manager
- [ ] Android keystore (`apk/keystore.jks`) backed up securely

### 5.2 External Backups
- [ ] Local project backup copied to external storage / cloud
- [ ] GitHub repository accessible from another machine

### 5.3 DNS & Domains
- [ ] `abc-io.com` DNS records point to redot1 IP
- [ ] Namecheap API keys configured for automated sync

---

## 🎉 SHUTDOWN AUTHORIZED

When ALL items above are checked:

```bash
# Gracefully stop local services
docker compose down

# Optional: keep data volumes for future local development
docker compose down --volumes  # ONLY if you want to wipe data

# Shutdown the desktop
```

**The system will continue operating from:**
- 🌐 **Public Cloud:** redot1 VPS (162.254.32.142)
- 🤖 **AI Workers:** ai1 (159.203.110.44) + ai2 (159.203.44.3)
- 📱 **Cellular Backup:** Android APK gateway
- 🔒 **Management:** Owner Dashboard + Operator Station

---

## 🆘 Post-Shutdown Recovery

If you need to restore local operations:

```bash
git clone https://github.com/ccplexmath/redot2complete.git
cd redot2complete
cp /path/to/backup/.env .env
docker compose up -d
```

All services will be restored within 60 seconds.
