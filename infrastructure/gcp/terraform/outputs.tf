output "cluster_endpoint" {
  description = "GKE Autopilot cluster endpoint"
  value       = google_container_cluster.primary.endpoint
  sensitive   = true
}

output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.primary.name
}

output "load_balancer_ip" {
  description = "Global load balancer IPv4 address"
  value       = google_compute_global_address.lb_ip.address
}

output "database_connection_name" {
  description = "Cloud SQL PostgreSQL connection name"
  value       = google_sql_database_instance.postgres.connection_name
}

output "database_private_ip" {
  description = "Private IP address of the Cloud SQL instance"
  value       = google_sql_database_instance.postgres.private_ip_address
}

output "redis_host" {
  description = "Redis instance host (IP)"
  value       = google_redis_instance.redis.host
}

output "redis_port" {
  description = "Redis instance port"
  value       = google_redis_instance.redis.port
}

output "storage_bucket_url" {
  description = "GCS bucket self-link URL"
  value       = google_storage_bucket.artifacts.self_link
}

output "storage_bucket_name" {
  description = "GCS bucket name"
  value       = google_storage_bucket.artifacts.name
}

output "compute_instance_group_url" {
  description = "Instance group URL of the managed Compute Engine instances"
  value       = google_compute_instance_group_manager.vps_group.instance_group
}

output "managed_ssl_certificate_status" {
  description = "Managed SSL certificate status"
  value       = google_compute_managed_ssl_certificate.default.status
}

output "vpc_network_name" {
  description = "Name of the created VPC network"
  value       = google_compute_network.vpc.name
}

output "subnet_name" {
  description = "Name of the created subnet"
  value       = google_compute_subnetwork.subnet.name
}
