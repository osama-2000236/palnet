# AWS architecture discovery — 2026-11-12

Read-only discovery only. No resources were created, modified, stopped, or deleted.

## Verified AWS scope

- Caller: `arn:aws:sts::366754056464:assumed-role/AccountFullAccessRole/a468b448-a0b1-7004-381f-103a7c7f09fa`.
- Account: `366754056464`; regional inventory: `eu-north-1`; global services checked separately.
- This verified account supersedes the account number in local memory as the discovery scope. No claim is made about other accounts or regions.
- Inventory used AWS read APIs through AWS MCP `run_script`; no secret values were read.

### Observed resources

| Area                      | Result                                                                                                                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Compute / delivery        | No EC2 instances, ECS clusters, ECR repositories, Lambda functions, EKS clusters, Elastic Beanstalk environments, Amplify apps, load balancers, or CloudFormation stacks.                     |
| Data / storage            | No RDS instances, ElastiCache replication groups, DynamoDB tables, or S3 buckets.                                                                                                             |
| Edge / DNS / certificates | No CloudFront distributions, Route 53 hosted zones, or ACM certificates in `eu-north-1`.                                                                                                      |
| API / messaging           | No REST/HTTP APIs, AppSync APIs, EventBridge rules, SNS topics, or SQS queues.                                                                                                                |
| Identity / email          | No Cognito user or identity pools and no SES identities.                                                                                                                                      |
| Config / observability    | No Secrets Manager secrets, SSM parameters, KMS keys, CloudWatch alarms, or CloudWatch log groups.                                                                                            |
| IAM                       | No account alias or IAM users. Fifteen management/service roles exist, including `AccountFullAccessRole` and `AgentCorePowerCodingAgentRole`; these are not Baydar deployment infrastructure. |

**Conclusion:** the verified AWS account is greenfield for Baydar. There are no existing `baydar`-prefixed resources to adopt or naming conflicts to resolve. Future resources should use a consistent environment-qualified `baydar-` naming convention; this is a recommendation, not an implemented change.

## Current application topology (repository evidence)

`docs/deployment.md`, `.github/workflows/deploy.yml`, `vercel.json`, `apps/api/Dockerfile`, and `apps/mobile/eas.json` define the current targets:

- **Web:** Next.js on Vercel; build `pnpm --filter @baydar/web build`.
- **API:** long-running NestJS/Node 20 service on Render; container exposes port `4000`, starts `apps/api/dist/main.js`, and health is `/api/v1/health`.
- **Database:** Neon PostgreSQL via Prisma; migrations run with `pnpm --filter @baydar/db db:deploy` in staging then production.
- **Media:** private Cloudflare R2 storage with signed PUT URLs and reads through `media.baydar.ps`.
- **Realtime/push:** API-owned SSE streams and Expo push; these require long-lived API connections but do not require Cognito or SNS.
- **Mobile:** Expo/EAS production builds and optional store submission.
- **Other external dependencies:** Resend mail, HyperPay billing, Google OAuth, ClamAV plus Cloudflare Images scanning, Sentry, and PostHog.

No AWS deployment workflow, CDK/Terraform configuration, or CloudFormation template was found. The GitHub Deploy workflow deploys staging to Render/Vercel on `main`; production is a manual `workflow_dispatch` with `target=production`, and mobile submission is separately opt-in.

## AWS target requirements — flagged, not implemented

1. **Web runtime:** preserve Next.js middleware, per-request CSP nonces, security headers, and remote-image behavior; this is not only a static-site export.
2. **API runtime:** preserve a Node 20 long-running process, `/api/v1/health`, and SSE. Any proxy/runtime must support streaming and appropriate idle timeouts.
3. **Scheduled jobs:** schedule the three documented internal endpoints and send `X-Internal-Token`: account retention, Karama decay, and media scan.
4. **PostgreSQL:** provide PostgreSQL 16-compatible persistent storage and both Prisma connection URLs. Preserve forward-only migration and staging-first release policy. No RDS implementation has been selected or created.
5. **Media:** an S3/R2 target must preserve private objects, signed PUTs, MIME/size validation, approved public media domain, and post-upload scanning. Existing R2 configuration and object migration need an explicit plan.
6. **Secrets/configuration:** supply JWT, database, cron, mail, billing, OAuth, storage, and observability settings without committing values. AWS Secrets Manager and SSM are currently empty.
7. **Unchanged external services:** Expo/EAS and Expo push remain mobile dependencies; Resend, HyperPay, Google OAuth, Sentry, PostHog, and Cloudflare scanning are not replaced by this discovery.
8. **DNS/TLS and media domain:** `api.baydar.ps`, the web domain, and `media.baydar.ps` need explicit routing/certificate decisions. No Route 53 or ACM assets currently exist in the checked scope.

## Limits

This was an AWS and repository inventory, not a live health check of Vercel, Render, Neon, Cloudflare, Expo, or other third-party services. No production deployment or account-plan change was attempted.
