# Staging public ingress

Verified on 12 November 2026.

## Public endpoints

- Web: https://d4v54n7f0lxe4.cloudfront.net/
- API: https://d1xu476tj9iv22.cloudfront.net/api/v1/health

The web root redirects to `/ar-PS` for the default locale. Both endpoints were
verified with HTTP 200 responses after deployment.

## Routing

CloudFront uses the ECS-generated HTTPS endpoints as custom origins with VPC
origins. Dynamic requests have caching disabled. The web CloudFront Function
preserves the public distribution hostname for the Next.js application; its
custom origin header selects the web listener rule. API requests continue to
use `/api/v1*` listener routing. Raw internal ALB DNS names are not exposed in
public links or redirects.

The direct ECS web URL requires the origin header provisioned by Terraform.
Do not bypass or publish this header. TLS on the ECS endpoints uses the
AWS-issued certificate.

## Operations

From the repository root:

```sh
terraform -chdir=infrastructure/public-ingress plan
terraform -chdir=infrastructure/public-ingress apply
```

A clean `plan` was confirmed after the final apply. The discovery report at
`docs/aws-discovery-2026-11-12.md` describes the initial state, including
historically missing application images; it is not the current deployment
manifest.
