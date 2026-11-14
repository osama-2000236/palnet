output "api_repository_url" { value = aws_ecr_repository.api.repository_url }
output "web_repository_url" { value = aws_ecr_repository.web.repository_url }
output "api_service_name" { value = aws_ecs_express_gateway_service.api.service_name }
output "web_service_name" { value = aws_ecs_express_gateway_service.web.service_name }
output "api_url" { value = local.api_url }
output "web_url" { value = local.web_url }
output "api_ingress_paths" { value = aws_ecs_express_gateway_service.api.ingress_paths }
output "web_ingress_paths" { value = aws_ecs_express_gateway_service.web.ingress_paths }
output "cluster_name" { value = aws_ecs_cluster.main.name }
output "subnet_ids" { value = local.subnet_ids }
output "migration_task_definition_arn" { value = aws_ecs_task_definition.migration.arn }
output "migration_security_group_id" { value = aws_security_group.migration.id }
output "build_project_name" { value = aws_codebuild_project.images.name }
output "build_source_location" { value = "s3://${aws_s3_bucket.build.bucket}/source/baydar.zip" }
output "database_endpoint" {
  value     = aws_db_instance.main.endpoint
  sensitive = true
}
