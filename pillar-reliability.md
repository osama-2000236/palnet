# Baydar / Bayader — Confidential AWS Well-Architected Review
## Reliability pillar (REL01–REL13)

**Review date:** 2026-11-12  
**Classification:** Confidential — internal architecture and remediation use only  
**Method:** Offline review of the validated, frozen AWS framework corpus and current repository evidence. No AWS account, deployed service, database, backup, alert, or external runtime was queried or modified.

## 1. Coverage and evidence rules

- **Coverage:** **13/13 Reliability questions and 65/65 controls**, each exactly once. Corpus source: AWS Well-Architected Framework TOC index, retrieved **2026-11-12T06:51:20.168Z** by `mcp_toc_index`; frozen-manifest validation passed. Exact canonical English titles are retained below.
- **Status vocabulary:** **Implemented**, **Partially Implemented**, **Not Implemented**, **Not Applicable**, and **Cannot Determine** only. **Cannot Determine** means the reviewed evidence does not establish the answer; it does not assert that a control is absent outside the repository.
- **Evidence provenance:** File/line citations are **[Observed in code/IaC]**. “Not evidenced” means **[Not observed within declared scope]** after scoped repository searches. Runtime or organizational evidence still needed is **[Cannot determine]**. **Not Implemented** is reserved for affirmative code behavior or an explicit negative repository check, never merely an unmentioned runtime control.
- **Two baselines:** Code proves current application behavior. Terraform proves proposed design only: `infrastructure/aws/README.md:1-3` calls it an “upgrade path,” so no resource is assumed deployed. The documented Render/Neon baseline and proposed AWS baseline remain separate.
- **Confidentiality:** No secret values, account identifiers, live backup claims, or unexecuted test results are included.

## 2. Executive assessment

The application has useful reliability foundations: API contracts and shared schemas, transactional invoice activation, global and route-level throttling, structured request logging, immutable ECR tags, source-built release images, automated Terraform deployment, and documented rollback. Proposed RDS Multi-AZ and automated backup settings are also sound design choices.

Those foundations do not yet establish production resilience. The most urgent confirmed defect is that HyperPay webhook success is accepted without verifying the returned amount or currency against the invoice. Session correctness is also incomplete: refresh rotation is not atomic, logout does not revoke already-issued access tokens, and the outbound HyperPay request has no application timeout. The AWS workflow **does build API and web images from source**, but its independently dispatched job has no explicit CI/test prerequisite. The separate Render/Vercel workflow does have a lint, type-check, and test gate.

**Overall question score: 21/65 (32%).** Scores are a 1–5 maturity judgment per question, not an average of control statuses.

**Control status distribution:** 6 Implemented · 16 Partially Implemented · 13 Not Implemented · 3 Not Applicable · 27 Cannot Determine = **65**.

## 3. Question-level assessment

| Question | Exact canonical question | Score | Status | Assessment |
|---|---|---:|---|---|
| REL01 | REL 1. How do you manage Service Quotas and constraints? | 1 | Cannot Determine | No quota inventory, utilization evidence, owner, or failover-headroom analysis is present. Provider-side limits cannot be inferred from code. |
| REL02 | REL 2. How do you plan your network topology? | 1 | Cannot Determine | Private subnets are a proposed prerequisite, but actual VPC, CIDR, routing, and connectivity are unknown. Hybrid and multi-network controls are not applicable to the evidenced scope. |
| REL03 | REL 3. How do you design your workload service architecture? | 2 | Partially Implemented | A cohesive Nest modular monolith and explicit API contracts exist; independent failure domains and architecture trade-off evidence are limited. |
| REL04 | REL 4. How do you design interactions in a distributed system to prevent failures? | 2 | Partially Implemented | Some mutations are idempotent, but synchronous external calls and non-atomic token rotation remain failure paths. |
| REL05 | REL 5. How do you design interactions in a distributed system to mitigate or withstand failures? | 2 | Partially Implemented | Throttling is present; timeout, retry policy, graceful degradation, and emergency controls are incomplete. |
| REL06 | REL 6. How do you monitor workload resources? | 2 | Partially Implemented | Structured logs and Sentry configuration exist; log analysis, dashboards, actionable alerts, tracing, and operational review evidence are incomplete or unknown. |
| REL07 | REL 7. How do you design your workload to adapt to changes in demand? | 1 | Cannot Determine | Infrastructure automation exists, but scaling signals, replacement behavior, capacity data, and executed load-test evidence are unknown. |
| REL08 | REL 8. How do you implement change? | 2 | Partially Implemented | Source-built immutable images, automation, test gates on Render/Vercel, and rollback are documented. The independent AWS deploy workflow lacks an explicit CI/test prerequisite and deployment-time resilience tests. |
| REL09 | REL 9. How do you back up data? | 2 | Partially Implemented | Proposed RDS backups are configured; coverage, encryption ownership, retention policy, and restore testing are not established. |
| REL10 | REL 10. How do you use fault isolation to protect your workload? | 2 | Partially Implemented | Proposed RDS Multi-AZ helps one data tier; application and shared-component isolation remain unverified. |
| REL11 | REL 11. How do you design your workload to withstand component failures? | 2 | Partially Implemented | Health checks and database failover are proposed, but deep health, customer-safe degradation, and full-stack recovery are unproven. |
| REL12 | REL 12. How do you test reliability? | 1 | Partially Implemented | A manual load-baseline procedure is documented; chaos engineering, game days, and post-incident exercises are not evidenced. |
| REL13 | REL 13. How do you plan for disaster recovery (DR)? | 1 | Cannot Determine | No RTO/RPO, recovery runbook, regional recovery design, restoration evidence, or exercised DR ownership is present. |

**Arithmetic:** 1 + 1 + 2 + 2 + 2 + 2 + 1 + 2 + 2 + 2 + 2 + 1 + 1 = **21/65**.

## 4. Complete 65-control ledger

### REL01 — Service quotas and constraints

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL01-BP01 — Aware of service quotas and constraints | Cannot Determine | No service/quota inventory is evidenced. **[Not observed within declared scope]** Interview platform owners and record actual ECS, RDS, VPC, CloudWatch, Secrets Manager, Render, Neon, R2, and third-party limits. |
| REL01-BP02 — Manage service quotas across accounts and regions | Cannot Determine | No account/Region map or quota owner is evidenced. **[Not observed within declared scope]** Establish ownership and review by environment; the proposed Region is `eu-north-1` (`infrastructure/aws/variables.tf:9-12`). **[Observed in code/IaC]** |
| REL01-BP03 — Accommodate fixed service quotas and constraints through architecture | Cannot Determine | No evidence shows how fixed provider limits are partitioned or load-balanced. **[Not observed within declared scope]** Model peak API concurrency, media traffic, database connections, and scheduled jobs. |
| REL01-BP04 — Monitor and manage quotas | Cannot Determine | Request logging (`apps/api/src/app.module.ts:40-51`) does not measure provider quota consumption. **[Observed in code/IaC]** Add utilization metrics and thresholds after actual services and quotas are identified. |
| REL01-BP05 — Automate quota management | Cannot Determine | No quota automation is evidenced. **[Not observed within declared scope]** Decide whether automation is justified only after inventory and risk analysis. |
| REL01-BP06 — Ensure that a sufficient gap exists between the current quotas and the maximum usage to accommodate failover | Cannot Determine | No failover demand model or headroom measurement exists. **[Not observed within declared scope]** Calculate failover traffic and connection amplification before declaring capacity safe. |

### REL02 — Network topology

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL02-BP01 — Use highly available network connectivity for your workload public endpoints | Cannot Determine | The health path is documented (`docs/DEPLOYMENT.md:66-72`), but DNS, TLS, load balancer, and public-endpoint availability were not inspected. **[Observed in code/IaC; Cannot determine]** Validate the real edge design. |
| REL02-BP02 — Provision redundant connectivity between private networks in the cloud and on-premises environments | Not Applicable | No private cloud-to-on-premises dependency is evidenced in the declared architecture (`docs/DEPLOYMENT.md:5-17`). **[Observed in code/IaC]** Revisit if such a dependency is introduced. |
| REL02-BP03 — Ensure IP subnet allocation accounts for expansion and availability | Cannot Determine | At least two private subnets in different AZs are a prerequisite (`infrastructure/aws/README.md:5-10`), but CIDRs and actual AZ allocation are unknown. **[Observed in code/IaC; Cannot determine]** Verify non-overlap, spare capacity, and Multi-AZ placement. |
| REL02-BP04 — Prefer hub-and-spoke topologies over many-to-many mesh | Not Applicable | No multi-VPC/peering estate is evidenced (`docs/DEPLOYMENT.md:5-17`); a hub/spoke decision has no current scope. **[Observed in code/IaC]** |
| REL02-BP05 — Enforce non-overlapping private IP address ranges in all private address spaces where they are connected | Not Applicable | No connected private networks are evidenced (`docs/DEPLOYMENT.md:5-17`). **[Observed in code/IaC]** This becomes required if peering, VPN, or hybrid connectivity is added. |

### REL03 — Service architecture

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL03-BP01 — Choose how to segment your workload | Partially Implemented | Nest modules separate business capabilities, but they share one process and Prisma data layer (`apps/api/src/app.module.ts:9-31,53-75`). **[Observed in code/IaC]** Document why this blast radius is acceptable and identify future extraction boundaries. |
| REL03-BP02 — Build services focused on specific business domains and functionality | Implemented | Controllers/services are organized around business capabilities; constructor dependencies in `apps/api/src/modules/billing/billing.service.ts:49-57` show domain composition. **[Observed in code/IaC]** |
| REL03-BP03 — Provide service contracts per API | Implemented | Swagger setup (`apps/api/src/main.ts:38-47`), typed DTOs/shared schemas, and controller routes establish explicit contracts. **[Observed in code/IaC]** Add contract tests and compatibility gates for all public consumers. |

### REL04 — Prevent distributed-system failures

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL04-BP01 — Identify the kind of distributed systems you depend on | Partially Implemented | `docs/DEPLOYMENT.md:5-17` identifies a monolith with external Vercel, Render, Neon, R2, Expo, and SSE dependencies, but no failure-mode matrix or consistency model exists. **[Observed in code/IaC]** Document each dependency and partial-failure outcome. |
| REL04-BP02 — Implement loosely coupled dependencies | Not Implemented | Checkout awaits HyperPay synchronously (`apps/api/src/modules/billing/billing.service.ts:170-180`; `apps/api/src/modules/billing/hyperpay.client.ts:43-50`); no queue/outbox isolates the request. **[Observed in code/IaC]** Add durable handoff and explicit degraded behavior where business rules permit. |
| REL04-BP03 — Do constant work | Not Implemented | Request handlers perform variable external work directly (`apps/api/src/modules/billing/billing.service.ts:143-180`). **[Observed in code/IaC]** Define bounded work, idempotent jobs, and backpressure for billing and media flows. |
| REL04-BP04 — Make mutating operations idempotent | Partially Implemented | Invoice activation returns early when already PAID and performs updates transactionally (`apps/api/src/modules/billing/billing.service.ts:356-415`); Karama redeem accepts an idempotency key (`apps/api/src/modules/karama/karama.service.ts:145-173`). Refresh revoke/create is separate (`apps/api/src/modules/auth/auth.service.ts:94-116,155-169`). **[Observed in code/IaC]** Use conditional consumption, transactions, and unique constraints throughout. |

### REL05 — Mitigate distributed-system failures

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL05-BP01 — Implement graceful degradation to transform applicable hard dependencies into soft dependencies | Not Implemented | Checkout directly awaits HyperPay (`apps/api/src/modules/billing/billing.service.ts:170-180`), while `/health` deliberately checks only process liveness (`apps/api/src/modules/health/health.controller.ts:12-37`). **[Observed in code/IaC]** Define cached/read-only or queued alternatives without weakening payment verification. |
| REL05-BP02 — Throttle requests | Implemented | Global throttling and guard registration are configured in `apps/api/src/app.module.ts:34-35,52,77-79`; auth routes apply explicit limits in `apps/api/src/modules/auth/auth.controller.ts:78-121,155-199`. **[Observed in code/IaC]** Validate distributed behavior because the default limiter store is process-local. |
| REL05-BP03 — Control and limit retry calls | Not Implemented | The HyperPay call has no retry budget/backoff/jitter policy (`apps/api/src/modules/billing/hyperpay.client.ts:43-57`), and scoped API searches found no centralized policy. **[Observed in code/IaC; Not observed within declared scope]** Add bounded retries only for idempotent operations and prevent retry storms. |
| REL05-BP04 — Fail fast and limit queues | Not Implemented | HyperPay uses `fetch` without an application timeout (`apps/api/src/modules/billing/hyperpay.client.ts:43-50`), and no bounded backlog is defined. **[Observed in code/IaC; Not observed within declared scope]** Add deadlines and explicit bounded queue/rejection behavior. |
| REL05-BP05 — Set client timeouts | Not Implemented | `createCheckout` supplies no `AbortSignal` or deadline (`apps/api/src/modules/billing/hyperpay.client.ts:25-63`). **[Observed in code/IaC]** Enforce a short connect/overall deadline and map timeout to a safe, observable response. |
| REL05-BP06 — Make systems stateless where possible | Partially Implemented | JWTs are signed statelessly (`apps/api/src/modules/auth/auth.service.ts:182-212`), but refresh records are database state (`apps/api/src/modules/auth/auth.service.ts:155-169`) and default throttling is configured in process (`apps/api/src/app.module.ts:52,77-79`). **[Observed in code/IaC]** Move shared limiter state to a shared store or document single-instance semantics. |
| REL05-BP07 — Implement emergency levers | Not Implemented | Scoped repository searches found no provider kill switch, maintenance mode, or read-only lever. **[Not observed within declared scope]** Add authorized, audited switches for risky integrations. |

### REL06 — Observability

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL06-BP01 — Monitor all components for the workload (Generation) | Partially Implemented | Pino request logs are configured (`apps/api/src/app.module.ts:40-51`) and Sentry settings are validated (`apps/api/src/config/env.ts:61-64,135-142`), but no all-component metric catalog or dashboard is evidenced. **[Observed in code/IaC; Not observed within declared scope]** Add RED, saturation, database, queue, and dependency metrics. |
| REL06-BP02 — Define and calculate metrics (Aggregation) | Cannot Determine | Sentry DSN/release wiring (`apps/api/src/config/env.ts:61-64`) does not prove SLOs, error-budget calculations, or aggregations. **[Observed in code/IaC; Cannot determine]** Interview operations and inspect actual dashboards. |
| REL06-BP03 — Send notifications (Real-time processing and alarming) | Cannot Determine | No alert definitions or routes are in the reviewed repository. **[Not observed within declared scope]** Validate real alert rules and notifications for availability, latency, errors, saturation, and failed jobs. |
| REL06-BP04 — Automate responses (Real-time processing and alarming) | Cannot Determine | No event-driven automated remediation is evidenced, and on-call ownership remains TBD (`docs/DEPLOYMENT.md:199-205`). **[Observed in code/IaC; Not observed within declared scope]** Confirm safe alarm actions, ownership, escalation, and tested execution. |
| REL06-BP05 — Analyze logs | Partially Implemented | Pino HTTP logging is configured (`apps/api/src/app.module.ts:40-51`), but centralized search, retention, and log-analysis workflows are not evidenced. **[Observed in code/IaC; Not observed within declared scope]** Verify the actual log backend, redaction, correlation, and investigated queries. |
| REL06-BP06 — Regularly review monitoring scope and metrics | Cannot Determine | No periodic observability review record is evidenced. **[Not observed within declared scope]** Establish reviews after launch incidents and architecture changes. |
| REL06-BP07 — Monitor end-to-end tracing of requests through your system | Cannot Determine | Request ID logging (`apps/api/src/app.module.ts:47-49`) is not end-to-end tracing. **[Observed in code/IaC]** Inspect runtime tracing; otherwise add propagated trace IDs across API, provider, and asynchronous work. |

### REL07 — Demand adaptation

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL07-BP01 — Use automation when obtaining or scaling resources | Partially Implemented | Terraform automates proposed infrastructure and RDS storage scaling (`infrastructure/aws/database.tf:19-36`), but no application autoscaling policy is shown (`infrastructure/aws/service.tf:6-67`). **[Observed in code/IaC]** Add metric-based scaling with minimum/maximum capacity and database-connection bounds. |
| REL07-BP02 — Obtain resources upon detection of impairment to a workload | Cannot Determine | Health-check paths are configured (`infrastructure/aws/service.tf:6-16,43-53`), but actual unhealthy-task replacement was not observed. **[Observed in code/IaC; Cannot determine]** Validate ECS/Render replacement and connection draining. |
| REL07-BP03 — Obtain resources upon detection that more resources are needed for a workload | Cannot Determine | No demand metric or scaling trigger is evidenced. **[Not observed within declared scope]** Measure concurrency, latency, CPU, memory, and connection pressure before configuring triggers. |
| REL07-BP04 — Load test your workload | Partially Implemented | `docs/DEPLOYMENT.md:160-172` includes a manual load-baseline procedure, but no executed result is established by this review. **[Observed in code/IaC]** Store repeatable scenarios/results and test provider-failure and migration-load cases. |

### REL08 — Change management

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL08-BP01 — Use runbooks for standard activities such as deployment | Implemented | `docs/DEPLOYMENT.md:57-121,149-197` documents service setup, CI commands, migrations, health checks, and rollback; AWS-specific steps are in `infrastructure/aws/README.md:55-77`. **[Observed in code/IaC]** Keep steps synchronized with automated workflows. |
| REL08-BP02 — Integrate functional testing as part of your deployment | Partially Implemented | Render/Vercel deployment has a lint/type-check/test gate (`.github/workflows/deploy.yml:40-74,76-100`), but the independent AWS workflow has one deploy job with no test/CI prerequisite (`.github/workflows/deploy-aws.yml:28-49`). **[Observed in code/IaC]** Add the same required gate and post-deploy functional smoke tests to AWS releases. |
| REL08-BP03 — Integrate resiliency testing as part of your deployment | Not Implemented | Neither deployment workflow contains failure-injection/resilience tests (`.github/workflows/deploy.yml:39-259`; `.github/workflows/deploy-aws.yml:28-124`). **[Observed in code/IaC]** Add provider-timeout, duplicate-webhook, refresh-race, and unhealthy-dependency tests. |
| REL08-BP04 — Deploy using immutable infrastructure | Implemented | ECR tags are immutable and scanned (`infrastructure/aws/compute.tf:1-12`); the AWS workflow builds and pushes API and web images from the checked-out source (`.github/workflows/deploy-aws.yml:48,70-76,103-110`), and ECS consumes the selected tag (`infrastructure/aws/service.tf:15-17,52-54`). **[Observed in code/IaC]** Bind tags to reviewed commits and deploy by digest for stronger provenance. |
| REL08-BP05 — Deploy changes with automation | Implemented | AWS deployment automates build, migration, apply, and health checks (`.github/workflows/deploy-aws.yml:61-119`); Render/Vercel deployment is also automated (`.github/workflows/deploy.yml:39-259`). **[Observed in code/IaC]** Add the missing AWS CI gate and verified release provenance. |

### REL09 — Backup

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL09-BP01 — Identify and back up all data that needs to be backed up, or reproduce the data from sources | Partially Implemented | Terraform proposes RDS backups (`infrastructure/aws/database.tf:19-36`), but no inventory covers R2 media, configuration/secrets, or other business data; the documented architecture identifies R2 as a separate dependency (`docs/DEPLOYMENT.md:5-15,99-104`). **[Observed in code/IaC; Not observed within declared scope]** Map every data owner and retention requirement. |
| REL09-BP02 — Secure and encrypt backups | Cannot Determine | RDS backup encryption/key/access and non-RDS backups were not inspected. **[Cannot determine]** Verify encryption, keys, IAM, retention lock where needed, and restore permissions. |
| REL09-BP03 — Perform data backup automatically | Partially Implemented | `infrastructure/aws/database.tf:19-36` proposes environment-specific RDS backup retention. **[Observed in code/IaC]** Confirm actual schedule/retention and automate all remaining data classes. |
| REL09-BP04 — Perform periodic recovery of the data to verify backup integrity and processes | Not Implemented | Scoped repository searches found no restore-test procedure or result; `infrastructure/aws/README.md:75-77` only advises retaining a snapshot for rollback. **[Observed in code/IaC; Not observed within declared scope]** Execute timed isolated restores, validate schema/media consistency, and record RPO/RTO. |

### REL10 — Fault isolation

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL10-BP01 — Deploy the workload to multiple locations | Partially Implemented | Proposed production RDS Multi-AZ (`infrastructure/aws/database.tf:29-34`) and multiple private subnets (`infrastructure/aws/README.md:5-10`) help placement, but actual application distribution is unverified. **[Observed in code/IaC; Cannot determine]** Validate tasks across AZs and do not equate Multi-AZ with regional recovery. |
| REL10-BP02 — Automate recovery for components constrained to a single location | Cannot Determine | No single-AZ component inventory or tested recovery automation is available. **[Not observed within declared scope]** Identify such components and verify automated replacement/restore. |
| REL10-BP03 — Use bulkhead architectures to limit scope of impact | Partially Implemented | Domain modules provide logical separation, but they share one process/data layer (`apps/api/src/app.module.ts:37-80`) and default process-local throttling (`apps/api/src/app.module.ts:52,77-79`). **[Observed in code/IaC]** Isolate critical pools and dependencies where risk justifies it. |

### REL11 — Component failure tolerance

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL11-BP01 — Monitor all components of the workload to detect failures | Partially Implemented | `/health` exists and is explicitly liveness-only (`apps/api/src/modules/health/health.controller.ts:12-37`); it does not prove Neon/RDS, R2, or provider readiness. **[Observed in code/IaC]** Add appropriate readiness semantics without causing dependency cascades. |
| REL11-BP02 — Fail over to healthy resources | Partially Implemented | ECS health checks and Multi-AZ RDS are proposed (`infrastructure/aws/service.tf:6-16,43-53`; `infrastructure/aws/database.tf:29-34`), but real routing, failover, and draining were not verified. **[Observed in code/IaC; Cannot determine]** Test removal and graceful connection draining. |
| REL11-BP03 — Automate healing on all layers | Cannot Determine | Database failover and service replacement were not observed. **[Cannot determine]** Validate compute, data, scheduled-job, and dependency recovery separately. |
| REL11-BP04 — Rely on the data plane and not the control plane during recovery | Cannot Determine | Documented rollback uses provider dashboard/CLI control planes (`docs/DEPLOYMENT.md:188-197`); automatic data-plane recovery is unproven. **[Observed in code/IaC; Cannot determine]** Exercise recovery without console changes and measure detection-to-service time. |
| REL11-BP05 — Use static stability to prevent bimodal behavior | Not Implemented | No static-stable configuration/degraded mode is evidenced, and default throttling is in-process (`apps/api/src/app.module.ts:52,77-79`). **[Observed in code/IaC; Not observed within declared scope]** Pre-provision critical capacity and avoid new recovery-time dependencies. |
| REL11-BP06 — Send notifications when events impact availability | Cannot Determine | No customer/operations notification process is evidenced; status-page and on-call fields are placeholders (`docs/DEPLOYMENT.md:199-205`). **[Observed in code/IaC; Not observed within declared scope]** Define customer communication and on-call alerts. |
| REL11-BP07 — Architect your product to meet availability targets and uptime service level agreements (SLAs) | Cannot Determine | No availability target or uptime SLA is evidenced. **[Not observed within declared scope]** Agree targets, error budgets, excluded maintenance, and measurement method. |

### REL12 — Reliability testing and operations

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL12-BP01 — Use playbooks to investigate failures | Not Implemented | Deployment rollback is documented, but incident investigation and on-call ownership are TBD (`docs/DEPLOYMENT.md:188-205`). **[Observed in code/IaC]** Add symptom-driven playbooks for payment, session, database, media, and deployment failures. |
| REL12-BP02 — Perform post-incident analysis | Cannot Determine | No incident review history or template is evidenced. **[Not observed within declared scope]** Establish blameless analysis with tracked corrective actions. |
| REL12-BP03 — Test scalability and performance requirements | Partially Implemented | Manual load-baseline guidance exists (`docs/DEPLOYMENT.md:160-172`), but no repeatable scaling/failover result is stored there. **[Observed in code/IaC]** Automate peak, soak, and scaling tests with saved results. |
| REL12-BP04 — Test resiliency using chaos engineering | Not Implemented | Scoped workflow/repository searches found no failure-injection or chaos suite. **[Not observed within declared scope]** Add controlled provider-timeout, unhealthy-instance, and dependency-failure experiments. |
| REL12-BP05 — Conduct game days regularly | Not Implemented | Scoped repository searches found no game-day exercise or schedule. **[Not observed within declared scope]** Run scheduled payment-provider outage, token-race, unhealthy-instance, and restore exercises. |

### REL13 — Disaster recovery

| ID and exact English title | Status | Evidence and required closure |
|---|---|---|
| REL13-BP01 — Define recovery objectives for downtime and data loss | Cannot Determine | No RTO/RPO by data class or business recovery target is evidenced. **[Not observed within declared scope]** Obtain owner-approved objectives and map architecture to them. |
| REL13-BP02 — Use defined recovery strategies to meet the recovery objectives | Cannot Determine | Backup/rollback snippets (`docs/DEPLOYMENT.md:188-197`; `infrastructure/aws/README.md:75-77`) do not constitute a DR strategy. **[Observed in code/IaC]** Select backup/restore, pilot light, warm standby, or multi-site per objective and document dependencies. |
| REL13-BP03 — Test disaster recovery implementation to validate the implementation | Cannot Determine | No DR exercise or result is evidenced. **[Not observed within declared scope]** Perform timed end-to-end recovery, including data and customer-facing validation. |
| REL13-BP04 — Manage configuration drift at the DR site or Region | Cannot Determine | No DR site/Region or drift detection is evidenced. **[Not observed within declared scope]** Use versioned IaC/image parity and scheduled drift checks when DR is selected. |
| REL13-BP05 — Automate recovery | Cannot Determine | Deployment automation exists (`.github/workflows/deploy-aws.yml:61-119`), but no recovery automation is proven. **[Observed in code/IaC; Cannot determine]** Automate and test restoration/failover without ad-hoc console changes. |

## 5. Priority findings and remediation

| Priority | Finding | Risk (impact × likelihood) | Required remediation and validation |
|---|---|---|---|
| P0 | **HyperPay success does not verify payment integrity.** `handleHyperPayWebhook` trusts the result code but never compares returned amount/currency with the stored invoice (`apps/api/src/modules/billing/billing.service.ts:36-47,310-343`). | Critical × High | Fetch and verify the provider transaction by ID, compare exact minor-unit amount and currency with the invoice, reject mismatch/unknown, and keep activation transactional (`apps/api/src/modules/billing/billing.service.ts:356-415`). Validate wrong amount, wrong currency, unknown transaction, and duplicate delivery. Authenticated AES-GCM decryption (`apps/api/src/modules/billing/hyperpay.client.ts:65-98`) does not close this separate integrity gap. |
| P0 | **Refresh-token rotation is not atomic.** Revoke and create are separate operations (`apps/api/src/modules/auth/auth.service.ts:94-116,155-169`), allowing concurrent refresh races or token loss. | High × High | Use one database transaction with a conditional consume of the unrevoked token and a uniqueness constraint. Prove only one concurrent request succeeds and replay is rejected. |
| P0 | **Logout leaves existing access tokens valid.** Logout revokes refresh records only (`apps/api/src/modules/auth/auth.service.ts:118-123`), while access JWTs remain self-contained (`apps/api/src/modules/auth/auth.service.ts:182-212`). | High × High | Define the accepted access-token lifetime and revocation model (versioned user/token state or short-lived tokens plus revocation checks). Validate protected routes immediately after logout. |
| P1 | **Outbound HyperPay call has no deadline or retry budget** (`apps/api/src/modules/billing/hyperpay.client.ts:25-63`). | High × High | Add connect/overall timeout, cancellation, bounded idempotent retry/backoff, and actionable logging. Test hanging connections and retry storms. |
| P1 | **The independent AWS deployment lacks an explicit CI/test prerequisite.** The workflow builds both images from source, but its sole deploy job does not require the separate Render/Vercel workflow’s gate (`.github/workflows/deploy-aws.yml:28-49`; `.github/workflows/deploy.yml:40-74`). | High × High | Reuse the CI gate in the AWS release path, require critical functional tests, bind the operator-supplied tag to the reviewed commit, deploy by digest, and retain smoke/health checks. Verify a failed test blocks an AWS release. |
| P1 | **Restore testing is absent from reviewed evidence; DR readiness is unknown.** Proposed backups exist (`infrastructure/aws/database.tf:31-35`), but no restore drill, RTO/RPO, or exercised recovery is evidenced. | Critical × Medium | Inventory all data, set business RTO/RPO, perform isolated restores and timed recovery, then repeat on schedule. Record measured data loss and recovery time; do not label deployed DR as failed without runtime evidence. |
| P2 | **Application resilience and observability are incomplete.** Liveness-only health, no HyperPay deadline, and missing evidence for log analysis, tracing, alerts, and game days are documented above. | High × Medium | Add appropriate readiness, bounded queues/backpressure, distributed tracing, actionable alerts/runbooks, and scheduled game days. Validate each through failure injection. |
| P2 | **Quota, network, and scaling answers remain unverified.** | High × Unknown | Interview owners and inspect actual runtime configuration read-only; do not convert these items to failures until evidence is collected. Establish quota/headroom dashboards and tested scaling policies. |

## 6. Immediate action sequence

1. **Stop payment/session correctness defects first:** Implement HyperPay integrity verification, atomic refresh consumption, and the explicit logout/session revocation model; run the named negative and concurrency cases.
2. **Close the AWS release gate:** Require the existing CI/test confidence checks in the independently dispatched AWS workflow, bind source-built immutable images to the reviewed commit, deploy by digest, and verify smoke/rollback behavior.
3. **Prove recoverability:** Inventory all data and dependencies, agree RTO/RPO, execute restore and game-day exercises, and capture evidence.
4. **Collect unknown operational evidence:** Use interviews and read-only runtime inspection for quotas, networks, metrics, alarms, log analysis, and scaling. Update question statuses only from that evidence.

---

### Final mechanical validation targets

- Questions: **13 unique REL01–REL13**, exact canonical titles.
- Controls: **65 unique REL01-BP01–REL13-BP05**, exact canonical titles, one ledger row each.
- Statuses: **6 Implemented + 16 Partially Implemented + 13 Not Implemented + 3 Not Applicable + 27 Cannot Determine = 65**.
- Question arithmetic: **21/65 (32%)**, rounded to the nearest whole percent.
- Repository citations: every cited path must exist and every cited line/range must be within the current file.
