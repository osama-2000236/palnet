resource "aws_db_subnet_group" "main" {
  name       = local.name
  subnet_ids = local.subnet_ids
  tags       = local.tags
}

resource "aws_security_group" "database" {
  name   = "${local.name}-database"
  vpc_id = data.aws_vpc.selected.id
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.services.id, aws_security_group.migration.id]
  }
  tags = local.tags
}

resource "random_password" "database" {
  length  = 32
  special = false
}

locals {
  database_password = coalesce(var.database_password, random_password.database.result)
}

resource "aws_db_instance" "main" {
  identifier              = "${local.name}-postgres"
  engine                  = "postgres"
  engine_version          = data.aws_rds_engine_version.postgres.version
  instance_class          = local.production ? "db.t4g.medium" : "db.t4g.micro"
  allocated_storage       = 20
  max_allocated_storage   = local.production ? 100 : 20
  db_name                 = "baydar"
  username                = "baydar"
  password                = local.database_password
  db_subnet_group_name    = aws_db_subnet_group.main.name
  vpc_security_group_ids  = [aws_security_group.database.id]
  publicly_accessible     = false
  multi_az                = local.production
  backup_retention_period = local.production ? 14 : 1
  deletion_protection     = local.production
  apply_immediately       = false
  tags                    = local.tags
}

resource "aws_secretsmanager_secret" "database" {
  name = "${local.name}-database"
  tags = local.tags
}

resource "aws_secretsmanager_secret_version" "database" {
  secret_id = aws_secretsmanager_secret.database.id
  secret_string = jsonencode({
    DATABASE_URL = "postgresql://${aws_db_instance.main.username}:${replace(urlencode(local.database_password), "+", "%20")}@${aws_db_instance.main.endpoint}/baydar?sslmode=require"
  })
}
