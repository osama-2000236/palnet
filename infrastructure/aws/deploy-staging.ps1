<#
.SYNOPSIS
    One-command staging redeploy for Baydar (AWS account 083712835043).

.DESCRIPTION
    Builds and deploys the current committed code to the existing staging stack:
      1. Verifies the active AWS session belongs to account 083712835043.
      2. Packs the committed tree (git archive HEAD) and uploads it to the build bucket.
      3. Runs the CodeBuild project that builds and pushes the API and web images.
      4. Applies the migration task definition and requires Prisma migration exit code 0.
      5. Applies the full stack and waits for service stability.
      6. Checks the public health endpoints.

    Requires an authenticated session for account 083712835043 first, e.g.:
        aws login --profile wind --region eu-north-1
    (Any profile whose login session is for 083712835043 works; pass -AwsProfile.)

.EXAMPLE
    pwsh -File infrastructure/aws/deploy-staging.ps1 -AwsProfile wind
#>
param(
    [string]$AwsProfile = "wind",
    [string]$Region = "eu-north-1",
    # Defaults to a UTC timestamp so ECR's immutable tags never collide.
    [string]$ImageTag = "pr31-" + (Get-Date -Format "yyyyMMddHHmmss"),
    [string]$ApiPublicUrl = "https://d1xu476tj9iv22.cloudfront.net",
    [string]$WebPublicUrl = "https://d1xu476tj9iv22.cloudfront.net",
    [string]$VpcId = "vpc-054e57fe773186c79",
    # Keep empty for this stack: Terraform owns its private subnets and NAT.
    # External IDs would make Terraform destroy that managed network.
    [string[]]$PrivateSubnetIds = @()
)

$ErrorActionPreference = "Stop"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$awsDir = Join-Path $repoRoot "infrastructure\aws"

function Resolve-AwsCli {
    $cmd = Get-Command aws -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    $fallback = "C:\Users\osama\OneDrive\Documents\pool work\AWSCLIV2-User\SourceDir\Programs\Amazon\AWSCLIV2\aws.exe"
    if (Test-Path $fallback) { return $fallback }
    throw "AWS CLI v2 not found on PATH and fallback is missing."
}

$aws = Resolve-AwsCli
Write-Host "==> AWS CLI: $aws"

# 1. Guard: the session must belong to the staging account before any mutation.
$identity = & $aws sts get-caller-identity --profile $AwsProfile --region $Region --output json | ConvertFrom-Json
if ($identity.Account -ne "083712835043") {
    throw "Session account $($identity.Account) is not the staging account 083712835043. Run 'aws login --profile $AwsProfile' first."
}
Write-Host "==> Session OK: $($identity.Arn)"

# 2. Pack the committed tree and upload it to the CodeBuild source bucket.
$sourceLocation = & terraform -chdir="$awsDir" output -raw build_source_location
if ($LASTEXITCODE -ne 0 -or -not $sourceLocation) {
    throw "terraform output failed; run 'terraform -chdir=infrastructure/aws init' once."
}
$bucket = ($sourceLocation -replace '^s3://', '').Split('/')[0]
$zip = Join-Path $env:TEMP "baydar-source-$ImageTag.zip"
git -C $repoRoot archive --format=zip --output="$zip" HEAD
if ($LASTEXITCODE -ne 0) { throw "git archive failed." }
Write-Host "==> Uploading source ($((Get-Item $zip).Length) bytes) to s3://$bucket/source/baydar.zip"
& $aws s3 cp "$zip" "s3://$bucket/source/baydar.zip" --profile $AwsProfile --region $Region
Remove-Item $zip -Force

# 3. Build and push both images via CodeBuild with the tag Terraform will deploy.
$apiRepositoryUrl = & terraform -chdir="$awsDir" output -raw api_repository_url
$webRepositoryUrl = & terraform -chdir="$awsDir" output -raw web_repository_url
if ($LASTEXITCODE -ne 0 -or -not $apiRepositoryUrl -or -not $webRepositoryUrl) {
    throw "Could not read the API and web ECR repository URLs from Terraform outputs."
}
$imageOverrides = @(
    @{ name = "API_IMAGE"; value = "${apiRepositoryUrl}:$ImageTag" }
    @{ name = "WEB_IMAGE"; value = "${webRepositoryUrl}:$ImageTag" }
    @{ name = "NEXT_PUBLIC_API_URL"; value = "$ApiPublicUrl/api/v1" }
) | ConvertTo-Json -Compress
$build = & $aws codebuild start-build --project-name baydar-staging-images --environment-variables-override $imageOverrides --profile $AwsProfile --region $Region --output json | ConvertFrom-Json
$buildId = $build.build.id
Write-Host "==> CodeBuild started: $buildId"
while ($true) {
    $status = (& $aws codebuild batch-get-builds --ids $buildId --profile $AwsProfile --region $Region --output json | ConvertFrom-Json).builds[0]
    Write-Host "    build status: $($status.buildStatus)"
    if ($status.buildStatus -in @("SUCCEEDED", "FAILED", "FAULT", "STOPPED", "TIMED_OUT")) {
        if ($status.buildStatus -ne "SUCCEEDED") { throw "CodeBuild $ImageTag failed: $($status.buildStatus). Logs: $($status.logs.groupName)" }
        break
    }
    Start-Sleep -Seconds 15
}

# 4. Apply only the migration task definition before switching application services.
$env:TF_VAR_environment = "staging"
$env:TF_VAR_aws_region = $Region
$env:TF_VAR_image_tag = $ImageTag
$env:TF_VAR_api_public_url = $ApiPublicUrl
$env:TF_VAR_web_public_url = $WebPublicUrl
$env:TF_VAR_vpc_id = $VpcId
$env:TF_VAR_private_subnet_ids = if ($PrivateSubnetIds.Count -eq 0) {
    "[]"
} else {
    $PrivateSubnetIds | ConvertTo-Json -Compress -AsArray
}
Write-Host "==> terraform apply migration task (image tag $ImageTag)"
terraform -chdir="$awsDir" apply -auto-approve -input=false -target=aws_ecs_task_definition.migration -target=aws_security_group.migration
if ($LASTEXITCODE -ne 0) { throw "terraform migration-task apply failed." }

# 5. Run the checkout-idempotency migration against RDS and require exit 0.
$taskDef = & terraform -chdir="$awsDir" output -raw migration_task_definition_arn
$migrationSg = & terraform -chdir="$awsDir" output -raw migration_security_group_id
$cluster = & terraform -chdir="$awsDir" output -raw cluster_name
$subnetCsv = & terraform -chdir="$awsDir" output -json subnet_ids | ConvertFrom-Json
$task = & $aws ecs run-task --cluster $cluster --task-definition $taskDef --launch-type FARGATE `
    --network-configuration "awsvpcConfiguration={subnets=[$($subnetCsv -join ',')],securityGroups=[$migrationSg],assignPublicIp=DISABLED}" `
    --profile $AwsProfile --region $Region --output json | ConvertFrom-Json
$taskArn = $task.tasks[0].taskArn
Write-Host "==> Migration task started: $taskArn"
while ($true) {
    $t = (& $aws ecs describe-tasks --cluster $cluster --tasks $taskArn --profile $AwsProfile --region $Region --output json | ConvertFrom-Json).tasks[0]
    if ($t.lastStatus -eq "STOPPED") {
        $exit = $t.containers[0].exitCode
        if ($exit -ne 0) { throw "Migration exited $exit. Logs: /aws/ecs/baydar-staging-migration" }
        Write-Host "==> Migration exit 0 (idempotency columns present)"
        break
    }
    Start-Sleep -Seconds 10
}

# 6. Switch application services only after the migration succeeds.
Write-Host "==> terraform apply application stack (image tag $ImageTag)"
terraform -chdir="$awsDir" apply -auto-approve -input=false
if ($LASTEXITCODE -ne 0) { throw "terraform application apply failed." }

# 7. Public health checks through CloudFront.
$health = & curl.exe -s -o NUL -w "%{http_code}" --max-time 20 "$ApiPublicUrl/api/v1/health"
$web = & curl.exe -s -o NUL -w "%{http_code}" --max-time 20 "$WebPublicUrl/ar-PS"
if ($health -ne "200" -or $web -ne "200") { throw "Health checks failed: api=$health web=$web" }
Write-Host "==> Health OK: api=$health web=$web"
Write-Host "Deployed $ImageTag to staging. Remember: ECR tags are immutable - each deploy uses a new tag."