# SAML Single Sign-On (SSO) — Setup Template

This template documents the SAML SSO configuration for the `abc-io-enterprise` GitHub Enterprise Cloud organization.

## Prerequisites

- GitHub Enterprise Cloud subscription (Cloud or Server).
- Identity Provider (IdP) with SAML 2.0 support: Entra ID (Azure AD), Okta, Google Workspace, or OneLogin.
- Organization owner permissions on `abc-io-enterprise`.

## Configuration Steps

### 1. Enable SAML in GitHub

1. Navigate to `https://github.com/enterprises/abc-io-enterprise/security`.
2. Under **Authentication security**, click **Require SAML authentication**.
3. Enter the IdP metadata URL or paste the raw XML.
4. Set **Authentication context class** to `urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport`.
5. Enable **Require SSO for all members** after a grace period.

### 2. IdP Application Registration

Create a SAML application in your IdP with the following values:

| Field | Value |
|-------|-------|
| ACS URL | `https://github.com/orgs/abc-io-enterprise/saml/consume` |
| Entity ID | `https://github.com/orgs/abc-io-enterprise` |
| Start URL | `https://github.com/orgs/abc-io-enterprise/sso` |
| Name ID format | `persistent` |
| Application username | `email` |

### 3. Attribute Mapping

Map IdP attributes to GitHub user fields:

| GitHub Attribute | IdP Claim / Attribute |
|------------------|-----------------------|
| `username` | `user.mail` or `user.userprincipalname` |
| `full_name` | `user.displayname` |
| `emails` | `user.mail` |
| `groups` | `groups` (for team mapping) |

### 4. Team Mapping (Optional)

Map IdP groups to GitHub teams for automated access control:

| IdP Group | GitHub Team | Repository Access |
|-----------|-------------|-------------------|
| `Platform Engineering` | `platform-maintainers` | Admin on `redot2` |
| `SRE` | `sre` | Maintain on `redot2` |
| `Security` | `security` | Maintain on `redot2`, Triage on advisories |
| `Backend Engineers` | `backend` | Write on `redot2` |
| `AI Engineers` | `ai` | Write on `redot2` |
| `Mobile Engineers` | `mobile` | Write on `redot2` |

### 5. SCIM Provisioning (Recommended)

Enable SCIM to automatically deprovision members when they leave the IdP:

1. In GitHub: **Settings > Authentication security > Configure SAML SSO > Enable SCIM**.
2. Copy the SCIM endpoint and token.
3. Enter them into your IdP provisioning settings.

### 6. Recovery

Designate at least two organization owners with linked recovery codes. Store the codes in the enterprise password manager, not in this repository.
