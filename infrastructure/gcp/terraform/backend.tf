terraform {
  backend "gcs" {
    bucket = "abc-io-terraform-state"
    prefix = "terraform/state"
  }
}
