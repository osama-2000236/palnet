variable "environment" {
  type = string
  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be staging or production."
  }
}

variable "aws_region" {
  type    = string
  default = "eu-north-1"
}

variable "vpc_id" {
  type    = string
  default = null
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "api_secrets_arn" {
  type        = string
  description = "Optional integration secret. Omit for staging console mail and disabled paid integrations."
  default     = null
}
variable "database_password" {
  type        = string
  sensitive   = true
  description = "Optional; Terraform generates a strong password when omitted."
  default     = null
}
variable "image_tag" { type = string }
variable "api_image_tag" {
  type    = string
  default = null
}
variable "web_image_tag" {
  type    = string
  default = null
}
variable "api_public_url" {
  type    = string
  default = ""
}
variable "web_public_url" {
  type    = string
  default = ""
}

variable "api_cpu" {
  type    = string
  default = "256"
}
variable "api_memory" {
  type    = string
  default = "512"
}
variable "web_cpu" {
  type    = string
  default = "256"
}
variable "web_memory" {
  type    = string
  default = "512"
}
