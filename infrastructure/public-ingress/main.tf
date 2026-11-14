# Public HTTPS access while the application and load balancer remain private to the VPC.
data "aws_lb" "alb" {
  arn = "arn:aws:elasticloadbalancing:eu-north-1:083712835043:loadbalancer/app/ecs-express-gateway-alb-a5977b38/d221aadf693ab221"
}
resource "aws_cloudfront_vpc_origin" "alb_http" {
  lifecycle { create_before_destroy = true }
  vpc_origin_endpoint_config {
    arn                    = data.aws_lb.alb.arn
    http_port              = 80
    https_port             = 443
    origin_protocol_policy = "http-only"
    name                   = "${local.name}-alb-http-origin"
    origin_ssl_protocols {
      items    = ["TLSv1.2"]
      quantity = 1
    }
  }
}

resource "aws_cloudfront_distribution" "public" {
  for_each = { for key, config in local.public_origins : key => config }
  enabled  = true
  comment  = "${local.name} public ${each.key} access"
  tags     = local.tags

  origin {
    domain_name = data.aws_lb.alb.dns_name
    origin_id   = each.key
    vpc_origin_config {
      vpc_origin_id = aws_cloudfront_vpc_origin.alb_http.id
    }

    dynamic "custom_header" {
      for_each = each.key == "web" ? [1] : []
      content {
        name  = "x-ecs-web-host"
        value = "ba-bfa942f996da476d879a00342727db2f.ecs.eu-north-1.on.aws"
      }
    }
  }

  default_cache_behavior {
    target_origin_id         = each.key
    viewer_protocol_policy   = "redirect-to-https"
    allowed_methods          = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods           = ["GET", "HEAD"]
    compress                 = true
    cache_policy_id          = data.aws_cloudfront_cache_policy.caching_disabled.id
    origin_request_policy_id = data.aws_cloudfront_origin_request_policy.all_viewer_except_host.id

    dynamic "function_association" {
      for_each = each.key == "web" ? [1] : []
      content {
        event_type   = "viewer-request"
        function_arn = aws_cloudfront_function.web_host.arn
      }
    }
  }

  restrictions {
    geo_restriction { restriction_type = "none" }
  }
  viewer_certificate { cloudfront_default_certificate = true }
}

resource "aws_cloudfront_function" "web_host" {
  name    = "${local.name}-web-host"
  runtime = "cloudfront-js-2.0"
  comment = "Mark public web requests for the ECS web listener rule"
  publish = true
  code    = <<-EOT
    function handler(event) {
      event.request.headers["x-ecs-web-host"] = { value: "ba-bfa942f996da476d879a00342727db2f.ecs.eu-north-1.on.aws" };
      return event.request;
    }
  EOT
}

data "aws_cloudfront_cache_policy" "caching_disabled" {
  name = "Managed-CachingDisabled"
}

data "aws_cloudfront_origin_request_policy" "all_viewer_except_host" {
  name = "Managed-AllViewerExceptHostHeader"
}

data "aws_lb_listener" "private" {
  arn = "arn:aws:elasticloadbalancing:eu-north-1:083712835043:listener/app/ecs-express-gateway-alb-a5977b38/d221aadf693ab221/2c495fe4eff0c36b"
}
data "aws_lb_target_group" "web" { name = "ecs-gateway-tg-ac033b11fc9ba3f89" }
data "aws_lb_target_group" "api" { name = "ecs-gateway-tg-122f272ba129ec5d7" }
resource "aws_lb_listener" "private_default" {
  load_balancer_arn = data.aws_lb.alb.arn
  port              = 443
  protocol          = "HTTPS"
  certificate_arn   = "arn:aws:acm:eu-north-1:083712835043:certificate/45dbf239-b23b-4843-96c5-b58c93a00397"
  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.web.arn
  }
}
resource "aws_lb_listener_rule" "public_api" {
  listener_arn = aws_lb_listener.private_default.arn
  priority     = 10
  condition {
    path_pattern { values = ["/api/v1*"] }
  }
  action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "private_http" {
  load_balancer_arn = data.aws_lb.alb.arn
  port              = 80
  protocol          = "HTTP"
  default_action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.web.arn
  }
}
resource "aws_lb_listener_rule" "public_web_host" {
  listener_arn = aws_lb_listener.private_default.arn
  priority     = 44990
  condition {
    http_header {
      http_header_name = "x-ecs-web-host"
      values           = ["ba-bfa942f996da476d879a00342727db2f.ecs.eu-north-1.on.aws"]
    }
  }
  action {
    type = "forward"
    forward {
      target_group {
        arn    = "arn:aws:elasticloadbalancing:eu-north-1:083712835043:targetgroup/ecs-gateway-tg-ac033b11fc9ba3f89/2f4747ab4af0b6c7"
        weight = 100
      }
      target_group {
        arn    = "arn:aws:elasticloadbalancing:eu-north-1:083712835043:targetgroup/ecs-gateway-tg-f8fa691ef0f4899f9/590f8c59cf7648ad"
        weight = 0
      }
    }
  }
}
resource "aws_lb_listener_rule" "public_api_http" {
  listener_arn = aws_lb_listener.private_http.arn
  priority     = 10
  condition {
    path_pattern { values = ["/api/v1*"] }
  }
  action {
    type             = "forward"
    target_group_arn = data.aws_lb_target_group.api.arn
  }
}
output "cloudfront_web_url" {
  value = try("https://${aws_cloudfront_distribution.public["web"].domain_name}", null)
}
output "cloudfront_api_url" {
  value = try("https://${aws_cloudfront_distribution.public["api"].domain_name}", null)
}
