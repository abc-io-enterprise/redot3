# ABC-IO v5.0.0 — APK Verification Report

**Date:** 2026-06-11  
**APK:** `apk/redot2-operator.apk`  
**Owner:** Christopher Porreca / redot1  
**Classification:** Owner Eyes Only

---

## Summary

✅ **APK is built, signed, and configured correctly for use as a cellular failsafe gateway.**

---

## File Verification

| Property | Value |
|----------|-------|
| Filename | `redot2-operator.apk` |
| Size | 45 KB |
| Package | `com.abcio.gateway` |
| Version Code | `2` |
| Version Name | `2.0.0` |
| Compile SDK | `34` (Android 14) |
| Target SDK | `34` |
| Min SDK | `26` (Android 8.0) |
| Signature | **Present** — `META-INF/ABCIO.RSA` + `ABCIO.SF` |
| Match to Downloads copy | Identical to `Downloads/redot2-operator.apk` |

---

## Permissions

| Permission | Purpose |
|------------|---------|
| `INTERNET` | Required for gateway proxy to VPS |
| `ACCESS_NETWORK_STATE` | Detect cellular vs WiFi connectivity |
| `ACCESS_FINE_LOCATION` | GPS for emergency beacon location |
| `ACCESS_COARSE_LOCATION` | Network-based location fallback |
| `FOREGROUND_SERVICE` / `FOREGROUND_SERVICE_DATA_SYNC` | Keep gateway running in background |
| `POST_NOTIFICATIONS` | Status and alert notifications |
| `READ_PHONE_STATE` | Cellular network awareness |
| `WAKE_LOCK` | Maintain connection during emergencies |

---

## Hardcoded Failsafe Targets

Verified in decompiled source:

| Target | Address | Role |
|--------|---------|------|
| Primary Gateway | `162.254.32.142` | Main VPS (redot1) |
| AI Node 1 | `192.227.212.235` | AI worker (ai1) |
| AI Node 2 | `192.227.212.237` | AI worker (ai2) |

These addresses match the live production infrastructure confirmed in `FINAL_LIVE_CONFIRMATION.md`.

---

## Security Features

- ✅ Biometric owner authentication gate in `MainActivity.java`
- ✅ Owner-only access prompt: "Only the owner may access it"
- ✅ HMAC-style signing logic for mobile gateway requests
- ✅ APK signature block present (tamper-evident)

---

## Functional Status

| Check | Result |
|-------|--------|
| Valid Android package structure | ✅ Pass |
| Signed APK | ✅ Pass |
| Required network/cellular permissions | ✅ Pass |
| Location permissions for beacon | ✅ Pass |
| Hardcoded production hosts | ✅ Pass |
| Biometric owner gate | ✅ Pass |
| Physical device installation test | ⚠️ Requires owner to side-load on Android device |
| Actual cellular-network failover test | ⚠️ Requires field test on cellular data |

---

## Installation Instructions

1. Copy `apk/redot2-operator.apk` to your Android device.
2. On Android, open **Settings → Security → Install unknown apps** and allow your file manager/browser.
3. Tap the APK file to install.
4. Launch **ABC-IO Gateway**.
5. Authenticate with biometric (fingerprint/face) when prompted.
6. Confirm the dashboard shows the primary gateway and AI nodes as online.

---

## Sign-Off

The APK is verified ready for owner deployment. Physical installation and cellular failover testing are the final steps only the owner can perform on-device.

**Verified by:** ABC-AI / Kimi Code CLI  
**On behalf of:** Christopher Porreca, Owner — redot1 / ABC-IO
