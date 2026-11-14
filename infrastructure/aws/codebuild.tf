resource "aws_s3_bucket" "build" {
  bucket_prefix = "${local.name}-build-"
  tags          = local.tags
}

resource "aws_s3_bucket_public_access_block" "build" {
  bucket                  = aws_s3_bucket.build.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "build" {
  bucket = aws_s3_bucket.build.id
  versioning_configuration { status = "Enabled" }
}

resource "aws_iam_role" "codebuild" {
  name = "${local.name}-codebuild"
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect    = "Allow"
      Action    = "sts:AssumeRole"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })
  tags = local.tags
}

resource "aws_iam_role_policy" "codebuild" {
  role = aws_iam_role.codebuild.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect   = "Allow"
        Action   = ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:GetObjectVersion", "s3:GetBucketVersioning"]
        Resource = ["${aws_s3_bucket.build.arn}/source/*", aws_s3_bucket.build.arn]
      },
      {
        Effect   = "Allow"
        Action   = ["s3:PutObject"]
        Resource = "${aws_s3_bucket.build.arn}/artifacts/*"
      },
      {
        Effect   = "Allow"
        Action   = "ecr:GetAuthorizationToken"
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability", "ecr:CompleteLayerUpload", "ecr:InitiateLayerUpload",
          "ecr:PutImage", "ecr:UploadLayerPart"
        ]
        Resource = [aws_ecr_repository.api.arn, aws_ecr_repository.web.arn]
      }
    ]
  })
}

resource "aws_codebuild_project" "images" {
  name          = "${local.name}-images"
  service_role  = aws_iam_role.codebuild.arn
  build_timeout = 60

  artifacts {
    type     = "S3"
    location = aws_s3_bucket.build.bucket
    path     = "artifacts"
  }

  environment {
    type                        = "LINUX_CONTAINER"
    compute_type                = "BUILD_GENERAL1_MEDIUM"
    image                       = "aws/codebuild/standard:7.0"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_ACCOUNT_ID"
      value = data.aws_caller_identity.current.account_id
    }
    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }
    environment_variable {
      name  = "API_IMAGE"
      value = "${aws_ecr_repository.api.repository_url}:${local.api_image_tag}"
    }
    environment_variable {
      name  = "WEB_IMAGE"
      value = "${aws_ecr_repository.web.repository_url}:${local.web_image_tag}"
    }
    environment_variable {
      name  = "NEXT_PUBLIC_API_URL"
      value = "${local.api_url}/api/v1"
    }
  }

  source {
    type      = "S3"
    location  = "${aws_s3_bucket.build.bucket}/source/baydar.zip"
    buildspec = "infrastructure/aws/buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name = "/aws/codebuild/${local.name}"
    }
  }

  tags = local.tags
}
