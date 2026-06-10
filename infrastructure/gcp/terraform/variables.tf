variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "zone" {
  description = "GCP zone for zonal resources"
  type        = string
  default     = "us-central1-a"
}

variable "node_count" {
  description = "Number of nodes for GKE Autopilot (min node count hint)"
  type        = number
  default     = 2
}

variable "machine_type" {
  description = "Machine type for Compute Engine instances"
  type        = string
  default     = "e2-medium"
}

variable "db_tier" {
  description = "Cloud SQL PostgreSQL machine tier"
  type        = string
  default     = "db-f1-micro"
}

variable "db_password" {
  description = "PostgreSQL admin password"
  type        = string
  sensitive   = true
}

variable "db_name" {
  description = "Name of the default database"
  type        = string
  default     = "abc_io_db"
}

variable "db_user" {
  description = "PostgreSQL admin username"
  type        = string
  default     = "abc_io_admin"
}

variable "domain_name" {
  description = "Primary domain name for the application"
  type        = string
}

variable "managed_ssl_certificate" {
  description = "Name of the managed SSL certificate resource"
  type        = string
  default     = "abc-io-ssl-cert"
}

variable "vpc_name" {
  description = "Name of the VPC network"
  type        = string
  default     = "abc-io-vpc"
}

variable "subnet_name" {
  description = "Name of the custom subnet"
  type        = string
  default     = "abc-io-subnet"
}

variable "gke_cluster_name" {
  description = "Name of the GKE Autopilot cluster"
  type        = string
  default     = "abc-io-gke"
}

variable "redis_name" {
  description = "Name of the Memorystore Redis instance"
  type        = string
  default     = "abc-io-redis"
}

variable "storage_bucket_name" {
  description = "Name of the GCS bucket for APK artifacts"
  type        = string
}

variable "compute_instance_prefix" {
  description = "Prefix for Compute Engine instance names"
  type        = string
  default     = "abc-io-vps"
}

variable "labels" {
  description = "Common labels to apply to all resources"
  type        = map(string)
  default = {
    app         = "abc-io"
    environment = "production"
    managed_by  = "terraform"
  }
}
