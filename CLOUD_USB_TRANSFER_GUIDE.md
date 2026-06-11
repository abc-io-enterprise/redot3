# ABC-IO v5.0.0 — Cloud & USB Storage Transfer Guide

**Owner:** Christopher Porreca / redot1  
**Date:** 2026-06-11  
**Version:** v5.0.0

---

## Files You Need to Preserve

These files are located in `C:\Users\cplexmath\OneDrive\Documents\redot2\`:

| File | Why Keep It |
|------|-------------|
| `ABC-IO_v5.0.0_Owner_Reference.pdf` | Offline owner/operator manual |
| `redot2-v5.0.0-final-backup.zip` | Full project source/config backup |
| `apk/redot2-operator.apk` | Owner-only cellular failsafe Android app |
| `apk/redot2-operator.apk.idsig` | APK signature verification file |
| `apk/redot2-latest.apk` | Latest signed APK build |
| `FINAL_LIVE_CONFIRMATION.md` | Live verification report |
| `OPERATOR_STATUS_CONFIRMATION.md` | Operator dashboard status snapshot |

---

## Option 1 — USB Flash Drive (Offline Storage)

1. Insert a USB drive with at least **16 GB** free space.
2. Create a folder on the drive named `redot2-v5-backup`.
3. Copy these files into it:
   ```
   ABC-IO_v5.0.0_Owner_Reference.pdf
   redot2-v5.0.0-final-backup.zip
   apk/redot2-operator.apk
   apk/redot2-operator.apk.idsig
   apk/redot2-latest.apk
   FINAL_LIVE_CONFIRMATION.md
   OPERATOR_STATUS_CONFIRMATION.md
   CLOUD_USB_TRANSFER_GUIDE.md
   ```
4. Safely eject the USB drive.
5. Store the USB in a physically secure location (safe, lockbox, or off-site).

**Recommended:** Keep a second USB copy at a different location for disaster recovery.

---

## Option 2 — Cloud Storage

Use one or more of these services for encrypted cloud redundancy:

- **OneDrive** (already in use)
- **Google Drive**
- **Dropbox**
- **iCloud Drive**
- **Proton Drive** (encrypted)

### Steps

1. Create a folder named `redot2-v5-backup` in your cloud storage.
2. Upload the same file list from Option 1.
3. Verify uploads completed by re-downloading one file and opening it.
4. Enable two-factor authentication on the cloud account if not already active.

**Security note:** Do not upload `.env` files or unencrypted keystores (`keystore.jks`). The deliverables above are safe to store because they contain no live secrets.

---

## Option 3 — Final Deliverable ZIP

A single ready-to-copy ZIP is also provided:

- **Path:** `C:\Users\cplexmath\OneDrive\Documents\redot2-v5.final.zip`
- **Contents:** Owner APK, owner reference PDF, live confirmation, operator status confirmation, and this transfer guide

This ZIP is designed to be copied as one item to USB or cloud storage.

---

## Verification Checklist

Before shutting down the desktop, confirm:

- [ ] `redot2-v5.final.zip` exists in `Documents\`
- [ ] ZIP copied to USB **or** cloud storage
- [ ] Files open correctly from the copy location
- [ ] Owner APK copied to Android device or USB
- [ ] Operator dashboard confirms services online (see `OPERATOR_STATUS_CONFIRMATION.md`)
- [ ] Public website `https://abc-io.com` loads from a separate device/phone

---

## After Shutdown Access

If the desktop is off, you can still:

- Visit the public portal: https://abc-io.com
- Access owner dashboard: https://abc-io.com/admin/
- Check mobile backup status: http://162.254.32.142:5050/api/backup/status
- SSH to the VPS: `ssh root@162.254.32.142`
- Use the owner reference PDF on any device

---

**Prepared by:** ABC-AI / Kimi Code CLI  
**For:** Christopher Porreca, Owner — redot1 / ABC-IO
