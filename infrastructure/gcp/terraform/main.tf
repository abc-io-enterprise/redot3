// Starter Terraform for GCP resources (fill in variables and credentials)
terraform {
  required_providers {
    google = {
      source = "hashicorp/google"
      version = ">= 4.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_compute_network" "vpc" {
  name = "abc-io-vpc"
}

// Placeholder: GKE cluster
resource "google_container_cluster" "primary" {
  name     = "abc-io-gke"
  location = var.region
  network  = google_compute_network.vpc.name
  initial_node_count = 1
}
