# Security Incident Report — Secret Exposure

**Date:** 2026-06-12
**Severity:** Critical
**Status:** Resolved — secrets rotated
**Reporter:** Automated agent review

---

## Summary

During the launch-request handoff, plaintext secrets were included in a user message. The owner has confirmed that all exposed values have been rotated and replaced.

## Exposed Variables (Historical)

The following environment variable names had live values exposed in chat. Actual values are intentionally not recorded in this file.

- `MISTRAL_API_KEY`
- `KIMI_API_KEY`
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `PAYPAL_CLIENT_ID`
- `PAYPAL_CLIENT_SECRET`
- `SMTP_USER`

## Resolution

**2026-06-12:** Owner confirmed all exposed environment variables have been changed/rotated. Old values should be considered revoked.

## Verification Checklist

- [x] Mistral API key rotated
- [x] Kimi API key rotated
- [x] PostgreSQL password changed
- [x] Redis password changed
- [x] PayPal credentials rotated
- [x] SMTP credentials reviewed/changed
- [ ] `.env` updated with new values on all deployment targets
- [ ] Services restarted with new secrets

## Remaining Deployment Steps

1. Update `C:\Users\cplexmath\OneDrive\Documents\redot2\.env` with the new rotated values.
2. Copy `.env` to each VPS node (`/opt/redot2/.env`).
3. Deploy or recreate containers so new secrets take effect.
4. Verify with `scripts/health-check.sh` on each node.

## Long-Term Recommendations

- Store production secrets in a secrets manager or GitHub Repository Secrets, not in chat.
- Use `scripts/rotate-internal-secrets.py` for systematic rotation.
- Enable 2FA on all provider dashboards.
- Review access logs for each exposed service for unauthorized usage.

---

*ABC-IO — 100 Years Nonstop — Always On, Always Yours, Always Here.*
