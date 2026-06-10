terraform {
  required_version = ">= 1.3.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
  zone    = var.zone
}

# ---------------------------------------------------------------------------
# Enable APIs
# ---------------------------------------------------------------------------
resource "google_project_service" "apis" {
  for_each = toset([
    "compute.googleapis.com",
    "container.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "servicenetworking.googleapis.com",
    "storage.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "secretmanager.googleapis.com",
  ])
  service            = each.value
  disable_on_destroy = false
}

# ---------------------------------------------------------------------------
# VPC Network & Subnet
# ---------------------------------------------------------------------------
resource "google_compute_network" "vpc" {
  name                    = var.vpc_name
  auto_create_subnetworks = false
  routing_mode            = "GLOBAL"
}

resource "google_compute_subnetwork" "subnet" {
  name          = var.subnet_name
  ip_cidr_range = "10.0.0.0/20"
  region        = var.region
  network       = google_compute_network.vpc.id

  private_ip_google_access = true

  secondary_ip_range {
    range_name    = "pods"
    ip_cidr_range = "10.4.0.0/14"
  }

  secondary_ip_range {
    range_name    = "services"
    ip_cidr_range = "10.8.0.0/20"
  }
}

# ---------------------------------------------------------------------------
# Private Service Connection for Cloud SQL & Memorystore
# ---------------------------------------------------------------------------
resource "google_compute_global_address" "private_ip_alloc" {
  name          = "private-ip-alloc"
  purpose       = "VPC_PEERING"
  address_type  = "INTERNAL"
  prefix_length = 16
  network       = google_compute_network.vpc.id
}

resource "google_service_networking_connection" "private_vpc_connection" {
  network                 = google_compute_network.vpc.id
  service                 = "servicenetworking.googleapis.com"
  reserved_peering_ranges = [google_compute_global_address.private_ip_alloc.name]

  depends_on = [google_project_service.apis]
}

# ---------------------------------------------------------------------------
# GKE Autopilot Cluster
# ---------------------------------------------------------------------------
resource "google_container_cluster" "primary" {
  provider = google-beta

  name     = var.gke_cluster_name
  location = var.region
  network  = google_compute_network.vpc.id

  subnetwork = google_compute_subnetwork.subnet.id

  enable_autopilot = true

  ip_allocation_policy {
    cluster_secondary_range_name  = "pods"
    services_secondary_range_name = "services"
  }

  private_cluster_config {
    enable_private_nodes    = true
    enable_private_endpoint = false
    master_ipv4_cidr_block  = "172.16.0.0/28"
  }

  release_channel {
    channel = "REGULAR"
  }

  network_policy {
    enabled = true
  }

  depends_on = [
    google_project_service.apis,
    google_compute_subnetwork.subnet,
  ]
}

# ---------------------------------------------------------------------------
# Cloud SQL — PostgreSQL
# ---------------------------------------------------------------------------
resource "google_sql_database_instance" "postgres" {
  name             = "${var.project_id}-postgres"
  database_version = "POSTGRES_15"
  region           = var.region

  settings {
    tier = var.db_tier

    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.vpc.id
    }

    backup_configuration {
      enabled    = true
      start_time = "03:00"
    }

    maintenance_window {
      day  = 7
      hour = 3
    }
  }

  deletion_protection = true

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.apis,
  ]
}

resource "google_sql_database" "default" {
  name     = var.db_name
  instance = google_sql_database_instance.postgres.name
}

resource "google_sql_user" "default" {
  name     = var.db_user
  instance = google_sql_database_instance.postgres.name
  password = var.db_password
}

# ---------------------------------------------------------------------------
# Cloud Memorystore — Redis
# ---------------------------------------------------------------------------
resource "google_redis_instance" "redis" {
  name               = var.redis_name
  tier               = "STANDARD_HA"
  memory_size_gb     = 2
  region             = var.region
  authorized_network = google_compute_network.vpc.id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"
  redis_version      = "REDIS_7_0"
  display_name       = "ABC-IO Redis Cache"

  depends_on = [
    google_service_networking_connection.private_vpc_connection,
    google_project_service.apis,
  ]
}

# ---------------------------------------------------------------------------
# Cloud Storage — APK Artifacts
# ---------------------------------------------------------------------------
resource "google_storage_bucket" "artifacts" {
  name          = var.storage_bucket_name
  location      = var.region
  storage_class = "STANDARD"

  versioning {
    enabled = true
  }

  uniform_bucket_level_access = true

  lifecycle_rule {
    action {
      type = "Delete"
    }
    condition {
      age = 180
    }
  }
}

resource "google_storage_bucket_iam_member" "artifacts_allusers" {
  bucket = google_storage_bucket.artifacts.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# ---------------------------------------------------------------------------
# Managed SSL Certificate
# ---------------------------------------------------------------------------
resource "google_compute_managed_ssl_certificate" "default" {
  name = var.managed_ssl_certificate

  managed {
    domains = [var.domain_name]
  }
}

# ---------------------------------------------------------------------------
# Global Load Balancer (L7)
# ---------------------------------------------------------------------------
resource "google_compute_global_address" "lb_ip" {
  name = "abc-io-lb-ip"
}

resource "google_compute_health_check" "default" {
  name = "abc-io-health-check"

  http_health_check {
    port         = 80
    request_path = "/health"
  }
}

resource "google_compute_backend_service" "default" {
  name        = "abc-io-backend"
  port_name   = "http"
  protocol    = "HTTP"
  timeout_sec = 30

  health_checks = [google_compute_health_check.default.id]

  backend {
    group = google_compute_instance_group_manager.vps_group.instance_group
  }
}

resource "google_compute_url_map" "default" {
  name            = "abc-io-url-map"
  default_service = google_compute_backend_service.default.id
}

resource "google_compute_target_https_proxy" "default" {
  name    = "abc-io-https-proxy"
  url_map = google_compute_url_map.default.id
  ssl_certificates = [
    google_compute_managed_ssl_certificate.default.id
  ]
}

resource "google_compute_global_forwarding_rule" "https" {
  name       = "abc-io-https-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.lb_ip.address
}

resource "google_compute_url_map" "http_redirect" {
  name = "abc-io-http-redirect"

  default_url_redirect {
    https_redirect = true
    strip_query    = false
  }
}

resource "google_compute_target_http_proxy" "http_redirect" {
  name    = "abc-io-http-proxy"
  url_map = google_compute_url_map.http_redirect.id
}

resource "google_compute_global_forwarding_rule" "http" {
  name       = "abc-io-http-forwarding-rule"
  target     = google_compute_target_http_proxy.http_redirect.id
  port_range = "80"
  ip_address = google_compute_global_address.lb_ip.address
}

# ---------------------------------------------------------------------------
# Compute Engine — VPS-style Instances (3x)
# ---------------------------------------------------------------------------
resource "google_compute_instance_template" "vps" {
  name_prefix  = "${var.compute_instance_prefix}-template-"
  machine_type = var.machine_type
  region       = var.region

  disk {
    source_image = "family/debian-12"
    auto_delete  = true
    boot         = true
    disk_size_gb = 20
    disk_type    = "pd-balanced"
  }

  network_interface {
    network    = google_compute_network.vpc.id
    subnetwork = google_compute_subnetwork.subnet.id

    access_config {
      # Ephemeral public IP
    }
  }

  metadata = {
    enable-oslogin = "TRUE"
  }

  service_account {
    scopes = ["cloud-platform"]
  }

  lifecycle {
    create_before_destroy = true
  }
}

resource "google_compute_instance_group_manager" "vps_group" {
  name = "${var.compute_instance_prefix}-group"
  zone = var.zone

  version {
    instance_template = google_compute_instance_template.vps.id
  }

  target_size = 3

  named_port {
    name = "http"
    port = 80
  }
}
