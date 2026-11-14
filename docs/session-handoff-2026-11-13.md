# Baydar session handoff — 2026-11-13

## Stop state

- The Pixel 7 Pro emulator used in this session was shut down. The physical Samsung phone was not shut down or modified.
- No Gradle, Metro, Expo, Jest, or Turbo process from this session remains running.
- No API, web, database, or AWS service was stopped; only local build/test/device processes were ended.
- Future device tests must run **over SSH from the other connected PC against the physical phone**. Do not use an emulator.

## APK ready for later physical-phone testing

- Artifact: `artifacts/baydar-staging-preview.apk`
- Size: 95,726,388 bytes (universal Android build)
- SHA-256: `2014531CDD9CE7E45E72253493E828CFE71FA219D20B827B29F303CE80BCE5E3`
- Signature verification: APK Signature Scheme v2, one signer. This is an internal preview signed with the local debug configuration, not a Play Store production signing identity.
- Embedded API: `https://d1xu476tj9iv22.cloudfront.net/api/v1`
- Verified that the localhost API URL is not embedded.
- The ARM64-only repack attempt was abandoned; the artifact above is the verified universal build.

The APK was not installed. The physical phone remained owned by the Fastship device session (`DEVICE_IN_USE`). The emulator installation was not completed because its disk had only 314 MB free. Do not repeat emulator testing.

## Verified backend and tests

- AWS staging API health: HTTP 200 through CloudFront.
- AWS staging web: HTTP 200 through CloudFront.
- Deliberately nonexistent login returned HTTP 401 `AUTH_UNAUTHORIZED`, proving the public API reaches its user backend without creating an account.
- Full repository type-check and lint passed.
- Full tests passed: 391 total (API 230, web 25, UI web 27, mobile/native 89, shared 17, DB 3).
- Terraform validation passed for `infrastructure/aws` and `infrastructure/public-ingress`.

## Session fixes

- Keyed card checkout uses a transaction for subscription + invoice creation, complete fingerprints, atomic processing claims, and fail-closed behavior after uncertain HyperPay outcomes.
- HyperPay accepts both legacy signed and encrypted webhook envelopes, with provider payment verification required for both.
- Refresh-token consumption remains atomic; web refresh uses Web Locks where available and keeps access tokens in tab memory.
- Preview mobile configuration uses the live AWS staging API; Babel's direct Expo preset and hoisting are declared for native builds.
- AWS web/API origins, CloudWatch permissions, CodeBuild image variables, and duplicate ingress configuration were corrected locally.
- RTL tab keyboard navigation was corrected.
- The checkout-idempotency migration was applied to Neon staging earlier. It was not applied to the private AWS RDS instance.

## Remaining work / risks

1. **Physical phone:** release the Fastship device lock, connect through the other PC over SSH, install the APK, launch it, and repeat the nonexistent-account backend smoke test. Then test a real user login, Arabic/English, RTL/LTR, profile editing, notifications, and payment error handling.
2. **AWS access:** the Baydar deployment profile is expired. Live all-service enumeration and AWS RDS migration remain unverified. Current inventory came from Terraform state plus public endpoint checks, not fresh AWS API enumeration.
3. **Terraform state:** configure a versioned remote backend and state locking before another GitHub deployment; clean runners currently cannot safely reuse local state.
4. **RDS security:** Terraform state reports `storage_encrypted: false`. Plan an encrypted snapshot/restore migration rather than applying an in-place edit. Staging is single-AZ with one-day backup retention and no deletion protection.
5. **Ingress:** the private CloudFront-to-ALB origin uses HTTP inside the VPC. Review TLS termination before production hardening.
6. **Production:** `api.baydar.ps` and `baydar.ps` did not resolve. Do not point production mobile builds at staging silently; configure production DNS and services first.
7. **Payments/concurrency:** real PostgreSQL race tests and HyperPay sandbox verification remain. No production payment enablement was performed.
8. **Optional mobile services:** Sentry/PostHog credentials and an Expo project ID were not embedded; do not claim those services are active in the preview.
9. **Code standards:** several pre-existing/touched components still exceed the 300-LOC rule; web Switch target size and native Dialog default copy still need cleanup.
10. **Version control:** application and infrastructure changes remain uncommitted on `pr31`. The migration SQL and temporary-workflow cleanup were committed to `main` earlier; no new deployment was made from these later fixes.

## AWS resource inventory evidenced by local state

- Compute/delivery: one ECS cluster, two Express services, two ECR repositories, one CodeBuild project, two CloudFront distributions, one ALB with listeners/target groups.
- Data/secrets: one private RDS PostgreSQL instance, two Secrets Manager secrets, one versioned private S3 build bucket.
- Operations: API/web/migration CloudWatch log configuration and one Prisma migration task definition.
- Network/IAM: VPC subnets, NAT gateway/EIP, route tables, security groups, and ECS/CodeBuild IAM roles.
- External, not AWS replacements: Neon for the existing deployed migration path, Cloudflare R2 for media, Resend, HyperPay, Expo, Sentry, and PostHog. Cognito and CDK are not used; authentication remains the existing JWT implementation and infrastructure remains Terraform.
