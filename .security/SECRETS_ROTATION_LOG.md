# Secrets Rotation Log

| Date | Secret(s) | Rotated by | Reason | Verified by |
|------|-----------|------------|--------|-------------|
| YYYY-MM-DD | EXAMPLE | operator | Template row | — |

## Rotation Procedure

1. Generate new value using commands in `SECRETS_INVENTORY.md`.
2. Update the running `.env` on the primary VPS (and any AI nodes).
3. Update the corresponding GitHub Repository Secret.
4. Restart affected services:
   ```bash
   docker compose -f compose.prod.yml up -d --force-recreate <service>
   ./scripts/health-check.sh
   ```
5. If the old secret is believed compromised, revoke any associated tokens at the vendor.
6. Record the rotation in this log.
