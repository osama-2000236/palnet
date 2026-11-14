resource "random_password" "application" {
  for_each = toset(["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET", "INTERNAL_CRON_TOKEN"])
  length   = 48
  special  = false
}

resource "aws_secretsmanager_secret" "application" {
  name                    = "${local.name}-application"
  recovery_window_in_days = local.production ? 30 : 0
  tags                    = local.tags
}

resource "aws_secretsmanager_secret_version" "application" {
  secret_id     = aws_secretsmanager_secret.application.id
  secret_string = jsonencode({ for key, password in random_password.application : key => password.result })
}
