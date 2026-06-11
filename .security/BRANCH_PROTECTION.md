# Branch Protection Rules — redot2

This document defines the branch protection policy for the `redot2` repository. The rules below should be applied to the default branch (`main` or `master`) via the GitHub UI or by running `scripts/apply-branch-protection.sh`.

## Required Ruleset (default branch)

| Setting | Value | Rationale |
|---------|-------|-----------|
| Restrict pushes that create files larger than 100 MiB | **Enabled** | Prevents accidental commit of large binaries. |
| Restrict deletions | **Enabled** | Prevents force-deletion of the default branch. |
| Require linear history | **Enabled** | Enforces rebase or squash-merge for clean history. |
| Require a pull request before merging | **Enabled** | No direct pushes to default branch. |
| Require approvals | **2** | All changes need two independent reviews. |
| Dismiss stale PR approvals when new commits are pushed | **Enabled** | Ensures reviewers see the final code. |
| Require review from CODEOWNERS | **Enabled** | Mandatory domain-expert review per path. |
| Require status checks to pass | **Enabled** | Blocks merge on CI failure. |
| Required status checks | `CI / build`, `Dependency Review`, `CodeQL`, `Secret Scanning` | See `.github/workflows/`. |
| Require conversation resolution before merging | **Enabled** | All review threads must be resolved. |
| Require signed commits | **Enabled** | Cryptographic provenance for all commits. |
| Include administrators | **Enabled** | Rules apply to org owners and admins. |

## Tag Protection

- Protect tags matching `v*.*.*` so only releases created via `release.yml` can publish version tags.

## Deployment Branch

- A `production` branch may be used for GitHub Environments. Protect it with the same rules as the default branch plus an environment protection rule requiring two reviewers to approve `production` deployments.

## Automation Exception

- The `dependabot[bot]` and `github-actions[bot]` accounts are exempt from the "2 approvals" requirement but still require CI status checks to pass.
