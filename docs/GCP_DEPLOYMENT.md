# ABC-IO v2.0 Google Cloud / redot5 Deployment Guide

**Date:** 2026-06-12
**Status:** SYSTEM: READY FOR OWNER REVIEW
**Purpose:** Prepare the ABC-IO system for a future Google Cloud Workspace deployment while preserving the current Docker Compose VPS deployment as the primary production target.

## Scope

The redot5 path is a private Google Cloud migration package, not a live production claim. The repository already includes:

- `infrastructure/gcp/terraform/`
- `infrastructure/gcp/k8s/`
- `.github/workflows/gcp-deploy.yml`
- `docs/ENTERPRISE_DEPLOYMENT.md`
- `docs/GITHUB_ENTERPRISE_MIGRATION.md`

These assets should be treated as the redot5 migration baseline.

## Target model

| Environment | Purpose | Target | Access |
|---|---|---|---|
| Development | Local engineering | Docker Compose | Developer |
| Staging | Pre-production validation | VPS or GCP staging project | Internal only |
| Public Production | Public ABC-IO services | VPS `redot1` and AI replicas | Public |
| Private Operations/Admin | Owner/operator controls | Private admin subdomain or VPN | Owner/operator only |
| Backup/Recovery | Archive and restore | Offsite backup plus GCP cold storage | Owner only |

## Four-bucket data isolation in GCP

| Bucket | GCP storage recommendation | Exposure |
|---|---|---|
| `ai_private` | Private Cloud SQL, Secret Manager references, restricted logs | Service-to-service only |
| `ai_public` | Publicly approved generated content and cached artifacts | Public only after approval |
| `my_private` | Cloud SQL with IAM restrictions and encrypted backups | Account-scoped or owner/admin |
| `my_public` | Cloud Storage static assets and public portal files | Public |

## Migration prerequisites

1. Create or select a Google Cloud project for `redot5`.
2. Enable required APIs: Cloud Run, Artifact Registry, Cloud Build, Secret Manager, Cloud SQL, IAM, and Workload Identity Federation if using GitHub Actions.
3. Create separate environments or projects for staging and production.
4. Store all secrets in Secret Manager and reference only environment variable names in workflows.
5. Do not reuse the Namecheap/VPS `.env` directly in GCP.
6. Confirm public DNS targets for the GCP deployment before cutover.

## Build and publish workflow

The existing `.github/workflows/gcp-deploy.yml` is a placeholder. Before enabling it:

1. Add GCP service account credentials or Workload Identity Federation.
2. Replace placeholder project IDs.
3. Enable Cloud Build and Artifact Registry.
4. Confirm that production secrets are stored only in Secret Manager.
5. Run the workflow manually in a staging project first.

## Rollback

For GCP, rollback should use one of the following:

1. Revert the Git commit that triggered Cloud Build and redeploy the previous image tag.
2. Route traffic back to the VPS production deployment by changing DNS.
3. Restore Cloud SQL from the latest encrypted backup if data rollback is required.

## Backup and restore

1. Export Cloud SQL snapshots on a fixed schedule.
2. Encrypt backups before copying them to cold storage.
3. Keep a current copy of `redot5.zip` in `Documents/` and another encrypted copy in offsite storage.
4. Test restore into a scratch database before any production cutover.

## Owner-gated actions

`ACTION REQUIRED FROM OWNER`
- item needed: Google Cloud project, billing account, and deployment identity
- reason: GCP resources cannot be created without owner-controlled cloud access
- where it is needed: Google Cloud Console, IAM, Artifact Registry, Cloud Build, Secret Manager
- exact steps:
  1. Create or select the GCP project for redot5.
  2. Enable billing.
  3. Create a least-privilege deploy identity.
  4. Store production secrets in Secret Manager.
  5. Run `infrastructure/gcp/terraform` in a staging project before production.
- verification method: `gcloud projects describe <project-id>` succeeds and the deploy identity can publish to Artifact Registry

`ACTION REQUIRED FROM OWNER`
- item needed: approval to keep GCP deployment as a future migration path
- reason: the current live path remains VPS/Namecheap until owner chooses otherwise
- where it is needed: `docs/GCP_DEPLOYMENT.md`, `.github/workflows/gcp-deploy.yml`, and `docs/DEPLOYMENT.md`
- exact steps:
  1. Review this guide.
  2. Confirm whether redot5 should be a backup/future environment or the next production target.
  3. Update `docs/DEPLOYMENT.md` and the GCP workflow accordingly.
- verification method: the selected target is documented and all deployment commands point to the chosen project

## Verification

Before declaring redot5 ready for production:

```bash
gcloud projects describe <PROJECT_ID>
gcloud auth list
gcloud config get-value project
terraform -chdir=infrastructure/gcp/terraform validate
terraform -chdir=infrastructure/gcp/terraform plan
```

Expected result: the project exists, credentials are scoped to the deploy identity, and Terraform produces a reviewable plan.
