terraform {
  required_providers {
    aws = {
      source = "hashicorp/aws"
    }
  }
}
provider "aws" {
  region = "eu-north-1"
}
locals {
  name = "baydar-staging"
}

locals {
  public_origins = { web = {}, api = {} }
  tags           = { Application = "Baydar", Environment = "staging", ManagedBy = "Terraform" }
}
