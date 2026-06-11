# IP Allowlist — Enterprise Policy

This document defines the IP allowlist policy for the `abc-io-enterprise` GitHub organization.

## Policy

- IP allowlisting is **recommended** once the primary office, VPN egress, and CI/CD egress IPs are stable.
- Do not enable the allowlist until all members and integrations (Actions runners, Dependabot, GitHub Apps) have been mapped to allowed IPs.

## Allowed IP Ranges

| Range | Description | CIDR |
|-------|-------------|------|
| Primary office | Corporate HQ egress | `203.0.113.0/24` *(example)* |
| VPN egress | Headscale / corporate VPN | `198.51.100.0/24` *(example)* |
| Primary VPS | Production deployment target | Replace with actual VPS IP /32 |
| GitHub Actions | GitHub-hosted runner ranges | Use `api.github.com/meta` to pull dynamically |

## Implementation

1. Go to `https://github.com/organizations/abc-io-enterprise/settings/security`.
2. Under **IP allow list**, click **Add**.
3. Enter each CIDR with a descriptive name.
4. Check **Enable IP allow list** only after validating all members can access the org.

## Automation

Use the GitHub API to keep the allowlist in sync with your infrastructure:

```bash
# Fetch current GitHub Actions IP ranges
curl -s https://api.github.com/meta | jq -r '.actions[]'

# Add an IP range (requires org-owner PAT with admin:org scope)
curl -X POST \
  -H "Authorization: token $GITHUB_TOKEN" \
  -H "Accept: application/vnd.github.v3+json" \
  https://api.github.com/orgs/abc-io-enterprise/ip_allow_list_entries \
  -d '{"name":"Primary VPS","ip_address":"1.2.3.4/32"}'
```

## Exception Process

Traveling or home-office employees may request a temporary /32 exception via `security@abc-io.com`. Exceptions expire after 7 days unless renewed.
