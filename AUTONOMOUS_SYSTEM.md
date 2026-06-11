# ABC-IO Autonomous System

## Overview

The ABC-IO Autonomous System is a self-healing, cellular-failsafe control plane for redot2. It ensures the platform remains operational and recoverable even when the primary desktop administration workstation is disconnected from the public internet.

## Components

### 1. Containerized Autonomous Backend (`services/autonomous/`)

Runs inside the Docker Compose stack on the public VPS (redot1) and continuously monitors all services.

- **File:** `services/autonomous/orchestrator.py`
- **Dockerfile:** `services/autonomous/Dockerfile`
- **Checks:** HTTP/TCP health for gateway, operator-station, owner-dashboard, mobile-gateway, public-portal, beacon-pwa, beacon, kimi, ai-isp, postgres, redis
- **Self-heal:** Restarts failed containers via `docker compose restart`
- **Alerts:** Pushes autonomous alerts to Redis queue `redot2:jobs:queue`
- **Mount:** Requires `/var/run/docker.sock` and `/opt/redot2` read-only

### 2. Desktop Orchestrator (`scripts/autonomous-orchestrator.py`)

Runs on the owner's local Windows machine from `Documents/redot2-autonomous/`.

- Monitors public endpoints at `abc-io.com` and AI nodes
- Detects CRITICAL/DEGRADED states
- Attempts SSH self-heal on redot1/ai1/ai2
- Activates cellular fallback mode when public VPS is unreachable
- Logs to `orchestrator.log` and persists state to `orchestrator.state`

Run:
```bash
python scripts/autonomous-orchestrator.py --daemon
```

Status:
```bash
python scripts/autonomous-orchestrator.py --status
```

### 3. Desktop Admin Backend (`admin-desktop/server.py`)

Local web backend for the offline-capable administration center.

- Serves `admin-desktop/index.html` at `http://127.0.0.1:8765`
- Exposes API endpoints for deployment, backup, self-heal, and orchestrator control
- Can start/stop the desktop orchestrator daemon
- Can trigger `scripts/deploy-staged-redot1.py`

Run:
```bash
python admin-desktop/server.py
```

### 4. Autonomous Operator APK (`apk/android-project/`)

Hardcoded owner-only Android application with biometric login.

- **Package:** `com.abcio.gateway`
- **Biometric gate:** Android BiometricPrompt before any control access
- **Owner display only:** Shows "Christopher Porreca / redot1" branding
- **Cellular failsafe gateway:** Runs NanoHTTPD on port 5050
- **Hardcoded backends:**
  - Primary: `162.254.32.142`
  - AI1: `192.227.212.235`
  - AI2: `192.227.212.237`
  - Domain: `abc-io.com`
- **Modes:** RELAY (public online), FAILOVER (public offline, queues beacons)
- **Build script:** `scripts/build-autonomous-apk.sh`

Build:
```bash
bash scripts/build-autonomous-apk.sh
```

Output:
```
apk/redot2-operator-autonomous.apk
```

## Operational Scenarios

### Normal Operation
1. Public VPS serves all traffic.
2. Containerized autonomous backend confirms health every 30 seconds.
3. Desktop orchestrator verifies public endpoints.
4. APK is in standby on the owner's device.

### Degraded Public System
1. Autonomous backend detects failing service(s).
2. It attempts `docker compose restart <service>`.
3. If restart succeeds, system returns to HEALTHY.
4. Alerts are queued for the worker/emailer.

### Critical / Public VPS Offline
1. Desktop orchestrator detects CRITICAL state or unreachable public endpoints.
2. It attempts SSH self-heal up to 3 times.
3. If all attempts fail, it activates **cellular fallback mode**.
4. Owner opens the APK, authenticates biometrically, and starts the autonomous gateway.
5. The mobile device becomes the authoritative owner-operator backend on port 5050.
6. Beacons and critical requests are queued locally and forwarded when the public VPS recovers.
7. The orchestrator continues attempting recovery in the background.

### Recovery
1. When public endpoints respond again, the orchestrator deactivates cellular fallback.
2. The APK flushes queued beacons to the public gateway.
3. Normal operations resume.

## Security Notes

- The APK is owner-only and requires biometric authentication on every launch.
- No personal data is retained on the mobile device.
- Beacon data is anonymized and queued only until relay is possible.
- Desktop orchestrator SSH passwords are read from environment variables, never hardcoded.
- Autonomous backend uses read-only Docker socket mount for container restarts.

## Files Added / Modified

- `services/autonomous/orchestrator.py`
- `services/autonomous/Dockerfile`
- `services/autonomous/requirements.txt`
- `scripts/autonomous-orchestrator.py`
- `scripts/build-autonomous-apk.sh`
- `admin-desktop/server.py`
- `admin-desktop/index.html`
- `apk/android-project/app/build.gradle`
- `apk/android-project/app/src/main/AndroidManifest.xml`
- `apk/android-project/app/src/main/java/com/abcio/gateway/MainActivity.java`
- `apk/android-project/app/src/main/java/com/abcio/gateway/GatewayService.java`
- `apk/android-project/app/src/main/res/layout/activity_main.xml`
- `docker-compose.yml`
- `compose.prod.yml`
- `package.json`
- `AUTONOMOUS_SYSTEM.md`

## Owner Contact

- **Owner:** Christopher Porreca
- **Company:** redot1
- **Email:** cporreca@abc-io.com
- **Phone:** 585-629-9120
- **Domain:** https://abc-io.com
- **Repository:** https://github.com/abc-io-enterprise/redot2
