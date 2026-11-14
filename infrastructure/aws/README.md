# AWS hosting and upgrade path

Terraform creates separate staging/production ECR repositories, ECS Express services, a private PostgreSQL instance, and a Prisma migration task. Both service images are built at release time and use the same immutable tag. Media stays on the existing R2 account; S3 and R2 are not interchangeable.

Public CloudFront/ALB ingress is managed separately in `infrastructure/public-ingress`; this stack uses its deployed URLs and does not look up the Express-managed ALB by name.

## Prerequisites

- AWS credentials with permission to manage the resources in this directory.
- A VPC with at least two private subnets in different availability zones. Each subnet must route outbound traffic through a NAT gateway so Fargate can pull ECR images, read Secrets Manager, write CloudWatch logs, and reach R2, mail, and payment providers. Subnets without outbound routing are not supported.
- GitHub OIDC configured for this repository and environment. `AWS_DEPLOY_ROLE_ARN` must identify the role assumed by the deployment workflow.
- Public HTTPS API and web origins. Use Route 53/custom domains for stable URLs; enter the API origin without `/api/v1`.
- An existing Secrets Manager JSON secret containing the API keys below. `DATABASE_URL` is generated separately from the private RDS instance and must not be added to this JSON.

Required and supported API JSON keys:

```text
JWT_ACCESS_SECRET
JWT_REFRESH_SECRET
INTERNAL_CRON_TOKEN
RESEND_API_KEY
MAIL_FROM
HYPERPAY_ENTITY_ID
HYPERPAY_ACCESS_TOKEN
HYPERPAY_WEBHOOK_SECRET
BANK_TRANSFER_IBAN
BANK_TRANSFER_BENEFICIARY
GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET
R2_ACCOUNT_ID
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
R2_BUCKET
R2_PUBLIC_URL
CLAMAV_SCAN_URL
CLOUDFLARE_IMAGES_SCAN_URL
SENTRY_DSN
SENTRY_RELEASE
```

`MAIL_FROM`, `SENTRY_DSN`, and `SENTRY_RELEASE` are mandatory for the production container to start. Optional integrations can use empty values when their features are disabled, but present keys are injected unchanged. Keep Secrets Manager JSON out of git, Terraform files, and command-line arguments.

## GitHub deployment settings

Configure these GitHub **secrets** in each GitHub environment:

| Secret                   | Format                                                                      |
| ------------------------ | --------------------------------------------------------------------------- |
| `AWS_DEPLOY_ROLE_ARN`    | IAM role ARN trusted by GitHub OIDC for this repository/environment         |
| `AWS_VPC_ID`             | Existing VPC ID                                                             |
| `AWS_PRIVATE_SUBNET_IDS` | JSON array of private subnet IDs, for example `["subnet-aaa","subnet-bbb"]` |
| `AWS_API_SECRETS_ARN`    | ARN of the Secrets Manager JSON above                                       |
| `AWS_DATABASE_PASSWORD`  | RDS master password; printable URL-safe characters recommended              |

`AWS_REGION` is fixed to `eu-north-1` by the workflow. Subnet IDs are decoded from JSON into Terraform's list value; do not enter a comma-separated string.

## Staging deployment

1. Store the JSON secret and GitHub environment settings, then run `Deploy AWS` manually with `environment=staging`, an immutable release tag, and both public origins.
2. The workflow assumes the OIDC role, initializes Terraform, bootstraps ECR, builds/pushes the API image, deploys the API and migration task, then runs `pnpm --filter @baydar/db db:deploy` in Fargate. Migrations must exit `0` before the web image is built.
3. The web build receives the configured public API origin with `/api/v1` appended. Terraform then applies the remaining ECS/RDS resources and the workflow checks API and web health.
4. Review staging in Arabic and English, RTL/LTR, authentication, HyperPay, and notifications. Build the Android preview with the staging API URL and distribute it through the existing internal-distribution/EAS workflow.
5. Do not print Terraform's sensitive outputs or CloudWatch application logs in shared CI output.

ECR rejects reuse of an image tag. A new release therefore requires a new tag and a fresh web build; do not retag an existing image to change its embedded public URL.

## Redeploy from this workstation

When the GitHub OIDC workflow is not yet configured (no `AWS_DEPLOY_ROLE_ARN` secret), the
same pipeline runs from this workstation against the existing staging stack:

```powershell
aws login --profile wind --region eu-north-1   # browser sign-in, account 083712835043
pwsh -File infrastructure/aws/deploy-staging.ps1 -AwsProfile wind
```

The script packs the committed tree, uploads it to the CodeBuild source bucket, builds and
pushes both images through `baydar-staging-images`, runs the Prisma migration task with a fresh
immutable tag (exit 0 required), then switches the application services and finishes with
CloudFront health checks. It refuses to run unless the active session belongs to account `083712835043`.

## Local validation

```sh
terraform fmt -check infrastructure/aws
terraform -chdir=infrastructure/aws validate
terraform -chdir=infrastructure/aws plan -input=false
```

Use placeholder environment values for a local plan and avoid shared plan/apply output containing resource identifiers. Planning creates no resources; deployment is performed by the OIDC workflow.

## Production promotion

Production is a separate stack, not an in-place mutation of staging. Use the tested immutable image tags, production JSON secret, Multi-AZ RDS, backups, and a controlled migration. Keep previous ECR tags and a database snapshot for rollback. The workflow requires the selected GitHub environment and its approval rules; it does not create secret values or silently promote staging to production.
