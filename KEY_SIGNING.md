# Key Signing and Privacy Verification

This project uses independent signing keys for owner, mobile backup, and public system verification.

## Key roles

- `OWNER_SIGNING_KEY` / `OWNER_SIGNING_FINGERPRINT`
  - Used by `services/owner-dashboard`
  - Provides private owner confirmation for system updates and secure access

- `MOBILE_SIGNING_KEY` / `MOBILE_SIGNING_FINGERPRINT`
  - Used by `services/mobile-gateway`
  - Acts as a separate backup mobile gateway signature for emergency communications and beacon validation

- `PUBLIC_SIGNING_KEY` / `PUBLIC_SIGNING_FINGERPRINT`
  - Used by `services/public-portal`
  - Serves as the public host signature for the external system and validation of the live portal

## Validation endpoints

Each service exposes a signature endpoint:

- Owner Dashboard: `/api/signature`
- Mobile Gateway: `/api/signature`
- Public Portal: `/api/signature`

Each response includes:

- `system` — service name
- `payload` — signed metadata
- `signature` — HMAC-SHA256 signature string
- `fingerprint` — configured verification value

## Privacy model

- The owner system and mobile backup use separate keys and fingerprints to ensure independent privacy proof.
- The public portal uses its own public-facing signing fingerprint.
- `README.md` and `SECURITY.md` document the signing model and private key handling.
