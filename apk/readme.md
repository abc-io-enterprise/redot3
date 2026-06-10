# ABC-IO Mobile APK / Backup Gateway

## Status
Native Android APK build requires Android SDK (not available on this desktop).

## Available Backup Gateway Options

### Option 1: Installable PWA (Recommended — No Build Required)
1. On your Android phone, open: `http://<desktop-ip>:5050/backup-gateway.html`
2. Tap "Add to Home Screen" in Chrome
3. The PWA will:
   - Monitor primary gateway health every 10s
   - Auto-detect outages and prompt backup activation
   - Send emergency beacons with GPS
   - Cache beacons when offline

### Option 2: Termux Native Gateway (Advanced)
1. Install Termux from F-Droid on Android
2. Run:
   ```bash
   curl -fsSL https://raw.githubusercontent.com/ccplexmath/redot2complete/main/scripts/termux-backup-gateway.sh | bash
   ~/abc-io-backup-gateway/start.sh
   ```
3. Full Node.js backup server runs on port 5050

### Option 3: Native APK Build (Requires Android SDK)
When Android SDK is available, run:
```powershell
./scripts/build-mobile-apk.ps1 -BuildType Release -OutputPath ./apk
```

## Owner Dashboard Download
The owner dashboard serves the backup gateway at:
- `http://localhost:8500/download/apk` — redirects to latest available package
- `http://localhost:8500/api/backup-status` — shows backup system status
