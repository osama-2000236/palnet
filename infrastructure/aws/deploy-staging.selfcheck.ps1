<#
.SYNOPSIS
    Offline parser and regression checks for deploy-staging.ps1.
.DESCRIPTION
    Makes no AWS calls and changes no infrastructure.
#>

$ErrorActionPreference = "Stop"
$deployPath = Join-Path $PSScriptRoot "deploy-staging.ps1"
$source = Get-Content -Raw -LiteralPath $deployPath

$tokens = $null
$parseErrors = $null
[System.Management.Automation.Language.Parser]::ParseFile($deployPath, [ref]$tokens, [ref]$parseErrors) | Out-Null
if ($parseErrors.Count -ne 0) {
    throw "PowerShell parse errors: $($parseErrors.Message -join '; ')"
}

function Assert-Contains([string]$Needle, [string]$Message) {
    if (-not $source.Contains($Needle)) { throw $Message }
}

Assert-Contains '--environment-variables-override $imageOverrides' "CodeBuild must receive image environment overrides."
Assert-Contains 'output -raw api_repository_url' "API repository URL must come from Terraform."
Assert-Contains 'output -raw web_repository_url' "Web repository URL must come from Terraform."
Assert-Contains 'value = "${apiRepositoryUrl}:$ImageTag"' "API_IMAGE must use the requested immutable tag."
Assert-Contains 'value = "${webRepositoryUrl}:$ImageTag"' "WEB_IMAGE must use the requested immutable tag."
Assert-Contains 'value = "$ApiPublicUrl/api/v1"' "The web build must receive the public API URL."
Assert-Contains '[string[]]$PrivateSubnetIds = @()' "The staging default must preserve Terraform-managed networking."
Assert-Contains '$env:TF_VAR_private_subnet_ids = if ($PrivateSubnetIds.Count -eq 0) {' "Subnet IDs must handle the managed-network default explicitly."
Assert-Contains '$PrivateSubnetIds | ConvertTo-Json -Compress -AsArray' "Non-empty subnet IDs must be encoded as a JSON array."

if ($source.Contains('$env:TF_VAR_private_subnet_ids = $PrivateSubnetIds -join ","')) {
    throw "Comma-separated subnet regression detected."
}

$migrationApply = $source.IndexOf('terraform -chdir="$awsDir" apply -auto-approve -input=false -target=aws_ecs_task_definition.migration -target=aws_security_group.migration')
$applicationApply = $source.LastIndexOf('terraform -chdir="$awsDir" apply -auto-approve -input=false')
if ($migrationApply -lt 0 -or $applicationApply -le $migrationApply) {
    throw "The migration task must be applied and run before the application stack."
}

# Guard the PowerShell JSON behavior the deployment relies on, including one subnet.
$emptyInput = @()
$noSubnets = if ($emptyInput.Count -eq 0) { "[]" } else { $emptyInput | ConvertTo-Json -Compress -AsArray }
$singleSubnet = @("subnet-only") | ConvertTo-Json -Compress -AsArray
$multipleSubnets = @("subnet-a", "subnet-b") | ConvertTo-Json -Compress -AsArray
if ($noSubnets -cne '[]') { throw "Empty subnet JSON is not an array: $noSubnets" }
if ($singleSubnet -cne '["subnet-only"]') { throw "Single-subnet JSON is not an array: $singleSubnet" }
if ($multipleSubnets -cne '["subnet-a","subnet-b"]') { throw "Multi-subnet JSON is invalid: $multipleSubnets" }

$sampleOverrides = @(
    @{ name = "API_IMAGE"; value = "api.example:new-tag" }
    @{ name = "WEB_IMAGE"; value = "web.example:new-tag" }
    @{ name = "NEXT_PUBLIC_API_URL"; value = "https://api.example/api/v1" }
) | ConvertTo-Json -Compress
$parsedOverrides = @($sampleOverrides | ConvertFrom-Json)
if ($parsedOverrides.Count -ne 3) { throw "CodeBuild override JSON must contain three values." }
if ($parsedOverrides[0].value -ne "api.example:new-tag" -or $parsedOverrides[1].value -ne "web.example:new-tag") {
    throw "CodeBuild override JSON does not preserve the image tags."
}

Write-Host "deploy-staging.selfcheck: PASS (parser, image tags, subnet JSON, migration order; no AWS calls)"