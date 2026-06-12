# ABC-IO v2.0 Namecheap Deployment Guide

## Purpose

This guide documents how to point the `abc-io.com` domain at the ABC-IO production and replica infrastructure using Namecheap.

## Overview

Namecheap is the authoritative DNS provider for `abc-io.com`. DNS records route public traffic to the primary VPS and the AI worker nodes. This guide covers manual configuration and optional API-based sync.

## Required DNS records

### A records

| Host | Value | Purpose |
|---|---|---|
| `@` | Primary VPS IP | Root domain |
| `www` | Primary VPS IP | WWW redirect |
| `api` | Primary VPS IP | API gateway |
| `admin` | Primary VPS IP | Owner dashboard |
| `ai1` | AI worker 1 IP | Primary AI worker |
| `ai2` | AI worker 2 IP | Standby AI worker |
| `headscale` | Primary VPS IP | Headscale control server |

### CNAME records

| Host | Value | Purpose |
|---|---|---|
| `grafana` | `@` | Grafana dashboards (if exposed) |
| `prometheus` | `@` | Prometheus (if exposed) |
| `redot1` | `@` | Primary node alias |

### TXT / SPF / DMARC (optional)

If `support@abc-io.com` sends mail from the VPS or a third-party relay, add SPF and DMARC records per the mail provider instructions. Do not add them until the mail provider is confirmed.

## Manual configuration steps

1. Log in to https://namecheap.com.
2. Go to **Domain List** → click **Manage** next to `abc-io.com`.
3. Open the **Advanced DNS** tab.
4. Delete any conflicting `@`, `www`, `api`, or `admin` records.
5. Add the A and CNAME records from the tables above.
6. Save changes.
7. Wait for propagation (usually 5–30 minutes; up to 24 hours globally).

## Automated sync (optional)

```bash
# Requires a Namecheap API key and the VPS IP whitelisted in Namecheap settings
export NAMECHEAP_VPS_API_KEY="$NAMECHEAP_VPS_API_KEY"
./scripts/namecheap-dns-sync.sh
```

The script reads record definitions from repository configuration and pushes them to Namecheap. It is a convenience only; manual review is recommended after the first run.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: Namecheap account access and API key (if using sync)
- reason: DNS is the authoritative path to the platform and cannot be modified by automation without owner credentials
- where it is needed: Namecheap Dashboard, primary VPS, and `.env`
- exact steps:
  1. Sign in to the Namecheap account that owns `abc-io.com`.
  2. Confirm the domain registration is active and not near expiry.
  3. Add or update A/CNAME records per the tables above.
  4. If using the sync script, enable API access and whitelist the primary VPS IP.
  5. Copy the API key into `NAMECHEAP_VPS_API_KEY` in `.env` (do not commit `.env`).
- verification method: `dig abc-io.com`, `dig www.abc-io.com`, and `dig ai1.abc-io.com` resolve to the expected IPs from at least two external resolvers

`ACTION REQUIRED FROM OWNER`
- item needed: confirmation that the primary VPS and AI worker IPs are correct before DNS cutover
- reason: wrong A records will send public traffic to the wrong host
- where it is needed: VPS provider dashboard and Namecheap DNS
- exact steps:
  1. Verify the public IP of the primary VPS.
  2. Verify the public IPs of `ai1` and `ai2`.
  3. Update A records if any IP has changed.
  4. Wait for propagation and re-verify.
- verification method: `nslookup abc-io.com` and `nslookup ai1.abc-io.com` return the current VPS IPs

## Verification

```bash
# Check root domain
dig abc-io.com +short

# Check subdomains
dig www.abc-io.com +short
dig api.abc-io.com +short
dig ai1.abc-io.com +short
dig ai2.abc-io.com +short

# Global propagation check
nslookup abc-io.com 8.8.8.8
nslookup abc-io.com 1.1.1.1

# HTTPS smoke test
curl -s -o /dev/null -w "%{http_code}" https://abc-io.com/
curl -s -o /dev/null -w "%{http_code}" https://api.abc-io.com/api/v1/system/health
```

Expected: all records resolve to the correct IPs, the root domain returns HTTP 200, and the API health endpoint returns a JSON payload.
