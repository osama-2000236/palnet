resource "aws_ecs_cluster" "main" {
  name = local.name
  tags = local.tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}-api"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_cloudwatch_log_group" "web" {
  name              = "/ecs/${local.name}-web"
  retention_in_days = 30
  tags              = local.tags
}

resource "aws_ecs_express_gateway_service" "api" {
  service_name            = "${local.name}-api"
  wait_for_steady_state   = true
  cluster                 = aws_ecs_cluster.main.arn
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  infrastructure_role_arn = aws_iam_role.ecs_infrastructure.arn
  cpu                     = var.api_cpu
  memory                  = var.api_memory
  health_check_path       = "/api/v1/health"
  primary_container {
    image          = "${aws_ecr_repository.api.repository_url}:${local.api_image_tag}"
    container_port = 4000
    aws_logs_configuration {
      log_group         = aws_cloudwatch_log_group.api.name
      log_stream_prefix = "api"
    }
    dynamic "environment" {
      for_each = local.api_environment
      content {
        name  = environment.key
        value = environment.value
      }
    }
    secret {
      name       = "DATABASE_URL"
      value_from = "${aws_secretsmanager_secret.database.arn}:DATABASE_URL::"
    }
    dynamic "secret" {
      for_each = local.application_secret_keys
      content {
        name       = secret.value
        value_from = "${aws_secretsmanager_secret.application.arn}:${secret.value}::"
      }
    }
    dynamic "secret" {
      for_each = local.configured_api_secret_keys
      content {
        name       = secret.value
        value_from = "${var.api_secrets_arn}:${secret.value}::"
      }
    }
  }
  network_configuration {
    subnets         = local.subnet_ids
    security_groups = [aws_security_group.services.id]
  }
  tags = local.tags
}

resource "aws_ecs_express_gateway_service" "web" {
  service_name            = "${local.name}-web"
  wait_for_steady_state   = true
  cluster                 = aws_ecs_cluster.main.arn
  execution_role_arn      = aws_iam_role.ecs_execution.arn
  infrastructure_role_arn = aws_iam_role.ecs_infrastructure.arn
  cpu                     = var.web_cpu
  memory                  = var.web_memory
  health_check_path       = "/ar-PS"
  primary_container {
    image          = "${aws_ecr_repository.web.repository_url}:${local.web_image_tag}"
    container_port = 3000
    aws_logs_configuration {
      log_group         = aws_cloudwatch_log_group.web.name
      log_stream_prefix = "web"
    }
    dynamic "environment" {
      for_each = local.web_environment
      content {
        name  = environment.key
        value = environment.value
      }
    }
  }
  network_configuration {
    subnets         = local.subnet_ids
    security_groups = [aws_security_group.services.id]
  }
  tags = local.tags
}
