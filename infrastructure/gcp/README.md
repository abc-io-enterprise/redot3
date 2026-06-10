GCP Deployment Templates (Terraform + Kubernetes)

This folder contains starter templates and guidance for deploying ABC-IO to Google Cloud Platform when budget allows (~$700+/month baseline).

Contents:
- terraform/: GCP project, VPC, GKE cluster, Cloud SQL, Memorystore Redis.
- k8s/: Kubernetes manifests for services and ingress (TLS via cert-manager).
- ci/: GitHub Actions workflow snippets for building images and deploying to GKE.

Note: These templates are intentionally minimal and require project IDs, billing account, and service account keys to be filled in.
