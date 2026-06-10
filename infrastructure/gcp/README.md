# ABC-IO — GCP Production Deployment

This directory contains production-ready Terraform Infrastructure-as-Code and Kubernetes manifests for deploying **ABC-IO** to Google Cloud Platform.

---

## Prerequisites

1. **GCP Project** with billing enabled.
2. **Terraform** `>= 1.3.0` installed.
3. **gcloud** CLI authenticated with appropriate permissions:
   ```bash
   gcloud auth application-default login
   gcloud config set project YOUR_PROJECT_ID
   ```
4. **kubectl** configured to interact with GKE.
5. A **Cloud DNS zone** (or external DNS provider) for your domain.

---

## Directory Structure

```
infrastructure/gcp/
├── terraform/
│   ├── backend.tf      # GCS remote state configuration
│   ├── main.tf         # Core GCP infrastructure
│   ├── outputs.tf      # Terraform outputs
│   └── variables.tf    # Input variables
├── k8s/
│   ├── namespace.yaml
│   ├── configmap.yaml
│   ├── secrets.yaml
│   ├── gateway-deployment.yaml
│   ├── owner-dashboard-deployment.yaml
│   ├── kimi-deployment.yaml
│   └── ingress.yaml
└── README.md           # This file
```

---

## 1. Terraform Infrastructure

### 1.1 Create the State Bucket (one-time)

The `backend.tf` expects a GCS bucket named `abc-io-terraform-state`. Create it first:

```bash
gsutil mb -l us-central1 gs://abc-io-terraform-state
gsutil versioning set on gs://abc-io-terraform-state
```

### 1.2 Configure Variables

Create a `terraform.tfvars` file in `terraform/`:

```hcl
project_id              = "your-gcp-project-id"
region                  = "us-central1"
zone                    = "us-central1-a"
domain_name             = "abc-io.yourdomain.com"
storage_bucket_name     = "abc-io-artifacts-your-project-id"
db_password             = "CHANGE_ME_TO_A_STRONG_PASSWORD"
machine_type            = "e2-medium"
db_tier                 = "db-f1-micro"
```

> **Security:** Never commit `terraform.tfvars` to version control. Add it to `.gitignore`.

### 1.3 Initialize & Apply

```bash
cd infrastructure/gcp/terraform

terraform init
terraform plan -out=tfplan
terraform apply tfplan
```

### 1.4 Outputs

After apply, note the following outputs:

| Output | Description |
|--------|-------------|
| `cluster_endpoint` | GKE control plane endpoint |
| `cluster_name` | GKE cluster name |
| `load_balancer_ip` | Global LB IPv4 address — point your DNS A-record here |
| `database_connection_name` | Cloud SQL connection name (for Cloud SQL Proxy) |
| `database_private_ip` | Cloud SQL private IP |
| `redis_host` / `redis_port` | Memorystore Redis endpoint |
| `storage_bucket_url` | GCS bucket self-link |
| `managed_ssl_certificate_status` | SSL provisioning status |

---

## 2. Kubernetes Deployment

### 2.1 Authenticate to GKE

```bash
gcloud container clusters get-credentials abc-io-gke --region=us-central1
```

### 2.2 Apply Base Resources

```bash
cd infrastructure/gcp/k8s

kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
```

### 2.3 Configure Secrets

**Do NOT apply `secrets.yaml` as-is.** It contains placeholder values.

Generate the secret with real values and apply:

```bash
kubectl create secret generic abc-io-secrets \
  --from-literal=db_password='YOUR_DB_PASSWORD' \
  --from-literal=db_host='YOUR_DB_PRIVATE_IP' \
  --from-literal=redis_host='YOUR_REDIS_HOST' \
  --from-literal=redis_password='' \
  --from-literal=jwt_secret='YOUR_JWT_SECRET' \
  --from-literal=api_key='YOUR_API_KEY' \
  -n abc-io --dry-run=client -o yaml > secrets-generated.yaml

kubectl apply -f secrets-generated.yaml
```

> If Memorystore Redis has **AUTH disabled**, leave `redis_password` empty.

### 2.4 Update Ingress Host

Edit `ingress.yaml` and replace `abc-io.example.com` with your actual domain.

### 2.5 Deploy Workloads

```bash
kubectl apply -f gateway-deployment.yaml
kubectl apply -f owner-dashboard-deployment.yaml
kubectl apply -f kimi-deployment.yaml
kubectl apply -f ingress.yaml
```

### 2.6 Verify

```bash
kubectl get pods -n abc-io
kubectl get svc -n abc-io
kubectl get ingress -n abc-io
```

The GCE Ingress may take **5–15 minutes** to provision the load balancer and SSL certificate. Monitor progress with:

```bash
kubectl describe ingress abc-io-ingress -n abc-io
kubectl get managedcertificate abc-io-managed-cert -n abc-io
```

Once the `ManagedCertificate` is active and the LB is ready, your application will be reachable via HTTPS.

> **Note:** GKE Ingress provisions its own global IP automatically. The Terraform-managed load balancer IP (`load_balancer_ip`) is dedicated to the Compute Engine VPS backend and is separate from the GKE Ingress endpoint.

---

## 3. Compute Engine VPS Instances

Terraform also provisions **3 managed Compute Engine instances** (`e2-medium` by default) as a VPS-style alternative to GKE. These are grouped under an instance group manager and attached to the global load balancer backend service.

To access them directly:

```bash
gcloud compute instance-groups managed list-instances \
  abc-io-vps-group --zone=us-central1-a
```

You can deploy containerized or native workloads directly on these VMs if you prefer not to use GKE Autopilot for certain services.

---

## 4. Production Checklist

- [ ] `terraform.tfvars` created with strong passwords and correct project IDs.
- [ ] DNS A-record points to `load_balancer_ip`.
- [ ] Secrets are applied with real values (not placeholder YAML).
- [ ] Container images exist in **Artifact Registry** (replace `gcr.io/abc-io-project/*:latest` with your registry paths).
- [ ] Cloud SQL backups are enabled (configured in `main.tf`).
- [ ] GCS bucket lifecycle policies are active (180-day auto-delete).
- [ ] Firewall rules reviewed and restricted if necessary.
- [ ] `deletion_protection = true` is set on Cloud SQL.
- [ ] OS Login is enabled on Compute Engine instances.
- [ ] IAM least-privilege principles applied to service accounts.

---

## 5. Cost Optimization Notes

| Resource | Baseline Tier | Estimated Monthly Cost |
|----------|---------------|------------------------|
| GKE Autopilot | ~2 nodes (e2-medium equiv.) | ~$70–$150 |
| Cloud SQL PostgreSQL | db-f1-micro | ~$7–$10 |
| Memorystore Redis | STANDARD_HA, 2 GB | ~$50–$70 |
| Cloud Storage | Standard class | ~$5 (depends on usage) |
| Load Balancer + SSL | Global L7 | ~$20–$30 |
| Compute Engine (3x) | e2-medium | ~$60–$90 |

> Scale `db_tier`, `machine_type`, and `memory_size_gb` in Terraform to match your workload.

---

## 6. Destroying Infrastructure

To tear everything down:

```bash
cd infrastructure/gcp/terraform
terraform destroy
```

> **Warning:** Cloud SQL has `deletion_protection = true`. You must manually disable it in the console or set `deletion_protection = false` in Terraform before running `terraform destroy`.

---

## 7. Troubleshooting

**Issue:** Ingress shows `UNKNOWN` or `404` for extended period.  
**Fix:** Ensure health checks on port 80 `/health` are responding on the Compute Engine backend, or ensure GKE NodePort services are healthy.

**Issue:** SSL certificate stuck on `PROVISIONING`.  
**Fix:** Verify DNS A-record points to the load balancer IP. GCP must resolve the domain to authorize the certificate.

**Issue:** Pods cannot reach Cloud SQL.  
**Fix:** Confirm private VPC peering is active. Use the Cloud SQL Auth Proxy sidecar or connect via the private IP output by Terraform.

**Issue:** Redis connection refused.  
**Fix:** Memorystore uses private service access. Pods running in the same VPC/subnet (GKE Autopilot with private nodes) can reach it via the private IP.

---

*Generated for ABC-IO production deployment on Google Cloud Platform.*
