# Security Framework

## Access Control

- Services use environment variables for secrets.
- Gateway enforces TLS termination through `nginx`.
- API authentication is expected on the gateway layer.

## Hardening

- Production compose uses non-root containers.
- Logging is restricted to secure volumes.
- Monitoring and alerting are configured via Prometheus.

## Secrets

- Do not commit `.env`.
- Use external secret management in production when possible.
- Store private signing keys separately from code and version control.
- The owner app and mobile gateway use distinct signing keys for independent privacy verification.

## Signature Verification

- `owner-dashboard` publishes a private-owner signature for local owner verification.
- `mobile-gateway` publishes a separate mobile backup signature for emergency satellite validation.
- `public-portal` publishes a public host signature for the external system.
- All signatures use HMAC-SHA256 over a system payload and are verified via fingerprint values.
