# Audit Log Streaming — Setup Guide

GitHub Enterprise Cloud can stream audit logs and Git events to external SIEM/SOAR platforms for long-term retention and alerting.

## Supported Destinations

- Amazon S3
- Azure Blob Storage
- Azure Event Hubs
- Google Cloud Storage
- Splunk HTTP Event Collector (HEC)
- Datadog

## Generic Setup (Splunk HEC Example)

1. In GitHub Enterprise: **Settings > Audit log > Streaming > Configure stream**.
2. Select **Splunk**.
3. Enter the HEC endpoint: `https://splunk.abc-io.com:8088/services/collector/event`.
4. Enter the HEC token (stored in the enterprise password manager).
5. Enable **Git events** in addition to audit events.
6. Verify with a test event.

## Retention Policy

| Source | Hot retention | Cold retention | Notes |
|--------|---------------|----------------|-------|
| GitHub web UI | 6 months | — | Searchable only |
| Streamed audit logs | 1 year | 7 years | SIEM index |
| Git events | 1 year | 7 years | SIEM index |

## Alerting Rules

Configure the following SIEM alerts:

1. **Org owner added or removed** — P1 alert to Security.
2. **Repository visibility changed to public** — P1 alert to Security.
3. **Bypass of branch protection** — P2 alert to Platform.
4. **Failed SAML SSO sign-in** (more than 10 in 5 minutes) — P2 alert to Security.
5. **New PAT or SSH key created** — P3 alert to user + manager.
6. **Workflow `deploy.yml` triggered manually** — P3 alert to SRE on-call.

## Periodic Review

- Security reviews high-severity events weekly.
- Platform reviews deployment and repository events monthly.
- Audit log configuration is tested quarterly.
