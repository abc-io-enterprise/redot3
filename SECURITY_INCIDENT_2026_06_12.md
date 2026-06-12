# Security Incident Report — Secret Exposure

**Date:** 2026-06-12
**Severity:** Critical
**Status:** Open — owner accepts rotation post-go-live
**Reporter:** Automated agent review

---

## Summary

During the launch-request handoff, plaintext secrets were included in a user message. The secrets listed below must be treated as compromised.

## Exposed Variables

The following environment variable names had live values exposed in chat. Actual values are intentionally not recorded in this file.

- `MISTRAL_API_KEY`
- `KIMI_API_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `SMTP_USER` (value exposed; password status unknown)

## Immediate Actions Required

1. **Rotate all listed secrets** in their respective provider dashboards.
2. **Update `C:\Users\cplexmath\OneDrive\Documents\redot2\.env`** with the new values.
3. **Revoke old keys/passwords** after confirming new ones work.
4. **Do not paste secrets into chat or any unencrypted channel again.**

## Owner Decision

**2026-06-12:** Owner stated secrets will be rotated once the system is live. This creates a vulnerability window between go-live and rotation completion. If proceeding with current secrets, rotation must be the **first post-launch action** and completed before any production traffic or billing events.

**Recommended safer path:**
- Option A: Rotate secrets **before** deployment.
- Option B: Deploy with placeholder/dummy secrets, verify the stack starts, then rotate and recreate containers immediately.

## Verification Checklist

- [ ] Mistral API key rotated and old key revoked
- [ ] Kimi API key rotated and old key revoked
- [ ] PostgreSQL password changed and services restarted
- [ ] Redis password changed and services restarted
- [ ] PayPal credentials rotated and old credentials revoked
- [ ] SMTP password rotated (and username reviewed)
- [ ] `.env` updated with rotated values
- [ ] Local and staging stacks tested with new secrets

## Long-Term Recommendations

- Store production secrets in a secrets manager or GitHub Repository Secrets, not in chat.
- Use `scripts/rotate-internal-secrets.py` for systematic rotation.
- Enable 2FA on all provider dashboards.
- Review access logs for each exposed key/service for unauthorized usage.

---

*ABC-IO — 100 Years Nonstop — Always On, Always Yours, Always Here.*
