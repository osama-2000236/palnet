data "aws_caller_identity" "current" {}

data "aws_vpc" "selected" {
  id      = var.vpc_id
  default = var.vpc_id == null
}

data "aws_subnets" "selected" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.selected.id]
  }
}

data "aws_rds_engine_version" "postgres" {
  engine       = "postgres"
  default_only = true
}

locals {
  name       = "baydar-${var.environment}"
  production = var.environment == "production"
  subnet_ids = local.private_subnet_ids
  tags       = { Environment = var.environment, ManagedBy = "Terraform", Application = "Baydar" }

  api_url       = var.api_public_url
  web_url       = var.web_public_url
  api_image_tag = coalesce(var.api_image_tag, var.image_tag)
  web_image_tag = coalesce(var.web_image_tag, var.image_tag)

  api_environment = {
    API_PORT       = "4000"
    NODE_ENV       = "production"
    CORS_ORIGINS   = local.web_url
    BAYDAR_WEB_URL = local.web_url
    BAYDAR_API_URL = local.api_url
    BAYDAR_ENV     = var.environment
    MAIL_FROM      = var.environment == "staging" ? "Baydar Staging <onboarding@resend.dev>" : ""
  }
  application_secret_keys = ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "INTERNAL_CRON_TOKEN"]
  configured_api_secret_keys = var.api_secrets_arn == null ? [] : [

    "JWT_ACCESS_SECRET",
    "JWT_REFRESH_SECRET",
    "INTERNAL_CRON_TOKEN",
    "RESEND_API_KEY",
    "HYPERPAY_ENTITY_ID",
    "HYPERPAY_ACCESS_TOKEN",
    "HYPERPAY_WEBHOOK_SECRET",
    "BANK_TRANSFER_IBAN",
    "BANK_TRANSFER_BENEFICIARY",
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "CLAMAV_SCAN_URL",
    "CLOUDFLARE_IMAGES_SCAN_URL",
    "MAIL_FROM",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "R2_BUCKET",
    "R2_PUBLIC_URL",
    "SENTRY_DSN",
    "SENTRY_RELEASE",
  ]
  web_environment = {
    NODE_ENV            = "production"
    PORT                = "3000"
    NEXT_PUBLIC_API_URL = "${local.api_url}/api/v1"
  }
}
