# Confidential — Cost pillar research (COST01–COST11)

## Scope, method, and coverage

- **Assigned scope only:** cost optimization. No security, reliability, or performance-pillar assessment is implied.
- **Corpus:** the user-validated AWS Well-Architected cost-pillar inventory was preserved exactly: **11/11 questions and 50/50 best practices**. Canonical IDs and titles below are unchanged.
- **Evidence:** repository inspection only. **AWS and current Vercel/Render/Neon runtime state were not reviewed.** Organization settings, provider invoices, budgets, IAM, utilization, and interview evidence remain unknown; ledger entries state what is needed.
- **Calibration:** evidence shows design intent, not a deployed or optimal architecture. The proposed AWS workload has no verified apply, sizing benchmark, or production cost history. No resource deletion, downsizing, commitment, or Multi-AZ removal is recommended.
- **Question score:** 1–5 per question; **22/55 = 40%** overall. Question status uses the same five-value status vocabulary as the BP ledger.

## Question-level assessment

| ID | Canonical question | Score | Status | Rationale and evidenced strengths |
|---|---|---:|---|---|
| COST01 | How do you implement cloud financial management? | 1 | Cannot Determine | No FinOps owner, finance/engineering review, budget/alert configuration, release review, or unit-cost KPI is evidenced. Needed: organization and provider-console evidence. |
| COST02 | How do you govern usage? | 2 | Partially Implemented | Separate staging/production settings, RDS production safeguards, ECR retention, and media controls exist; account structure, targets, and lifecycle governance are unverified. |
| COST03 | How do you monitor your cost and usage? | 1 | Partially Implemented | Common environment/application tags exist in Terraform, but detailed billing sources, allocation activation/export, SaaS invoice ingestion, dashboards, and workload metrics are unverified. |
| COST04 | How do you decommission resources? | 3 | Partially Implemented | Terraform configures ECR to retain 30 images; account-retention code purges expired soft-deleted users; RDS backups and migration logs have environment-specific retention. Whole-environment teardown, remote state, and orphan validation are missing. |
| COST05 | How do you evaluate cost when you select services? | 2 | Cannot Determine | Managed web/API/database technologies are selected, but no TCO comparison, organization constraints analysis, utilization review, or licensing analysis is present. |
| COST06 | How do you meet cost targets when you select resource type, size and number? | 2 | Partially Implemented | RDS size/type and storage autoscaling are explicit; ECS sizing and desired capacity are not data-driven. Needed: demand model and benchmarks. |
| COST07 | How do you use pricing models to reduce cost? | 1 | Cannot Determine | No RI/Savings Plans/Spot, Region-cost, third-party agreement, or commitment-utilization evidence. High criticality alone does not justify or refute a commitment. |
| COST08 | How do you plan for data transfer charges? | 3 | Partially Implemented | Clients upload directly to R2 with five-minute signed PUT URLs, avoiding API proxy transfer. NAT/public egress, CDN/cache behavior, and GB/month flows are unmodeled. |
| COST09 | How do you manage demand, and supply resources? | 2 | Partially Implemented | RDS storage autoscaling, direct uploads, and media rate limits help; no demand profile, compute autoscaling signal, queue, or workload-wide backpressure design is evidenced. |
| COST10 | How do you evaluate new services? | 1 | Cannot Determine | No recurring workload-review or new-service evaluation process is documented. |
| COST11 | How do you evaluate the cost of effort? | 4 | Partially Implemented | CI/CD, immutable image builds, migrations, retention logic, and ECR cleanup are present. Documented retention/Karama jobs are not encoded as AWS schedules in the reviewed workflow. |

## Complete 50-BP evidence ledger

### COST01 — How do you implement cloud financial management?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST01-BP01 — Establish ownership of cost optimization | Cannot Determine | Needed: named FinOps owner/RACI across AWS and Vercel/Render/Neon; no repo evidence. | Accountability is not documented. | Spend anomalies lack an owner and persist. |
| COST01-BP02 — Establish a partnership between finance and technology | Cannot Determine | Needed: recurring finance/engineering cost reviews and decisions. | No joint review cadence is evidenced. | Technical choices may exceed financial constraints unnoticed. |
| COST01-BP03 — Establish cloud budgets and forecasts | Cannot Determine | Needed: AWS Budgets/forecast and SaaS budget evidence; reviewed Terraform/workflows define none. | No budget/forecast design in source; account-level controls unknown. | Runaway compute, storage, or transfer spend is detected late. |
| COST01-BP04 — Implement cost awareness in your organizational processes | Cannot Determine | Needed: architecture-change cost estimates/gates; deploy workflows automate build/apply only (`.github/workflows/deploy.yml:39-74`, `.github/workflows/deploy-aws.yml:47-124`). | No cost review gate or estimate is visible. | Costly design changes can ship without challenge. |
| COST01-BP05 — Report and notify on cost optimization | Cannot Determine | Needed: scheduled cost reports, notification targets, and optimization outcomes across all providers. | No report/notification configuration is evidenced. | Teams lack timely, actionable cost information. |
| COST01-BP06 — Monitor cost proactively | Cannot Determine | Needed: Cost Explorer/dashboard/anomaly-monitoring evidence and SaaS usage monitoring. | No proactive monitoring implementation is evidenced. | Teams react to invoices instead of trends. |
| COST01-BP07 — Keep up-to-date with new service releases | Cannot Determine | Needed: service-release review cadence and price/performance reassessment records. | No release-review process exists in source. | Beneficial pricing or service changes may be missed. |
| COST01-BP08 — Create a cost-aware culture | Cannot Determine | Interview needed: training, incentives, cost champions, and engineering goals. | Cultural mechanisms are not documented. | Optimization remains occasional rather than routine. |
| COST01-BP09 — Quantify business value from cost optimization | Cannot Determine | Needed: cost/user, cost/order, savings, and outcome KPI history. | No baseline or unit economics are reported. | Savings and business value cannot be prioritized or proven. |

### COST02 — How do you govern usage?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST02-BP01 — Develop policies based on your organization requirements | Partially Implemented | Production safeguards: `infrastructure/aws/database.tf:29-36`; environment input: `.github/workflows/deploy-aws.yml:5-20`. | Safeguards exist, but a written organization-wide usage policy is absent. | Teams may apply controls inconsistently. |
| COST02-BP02 — Implement goals and targets | Cannot Determine | Needed: approved monthly budgets, unit-cost targets, and utilization targets. | No measurable targets are recorded. | Overspend has no objective threshold. |
| COST02-BP03 — Implement an account structure | Cannot Determine | Needed: AWS Organizations/account map and SaaS tenancy separation; repository source cannot establish actual account isolation. | Account and tenancy boundaries are unverified. | Poor isolation complicates attribution and blast-radius control. |
| COST02-BP04 — Implement groups and roles | Partially Implemented | Separate ECS execution and infrastructure roles exist (`infrastructure/aws/compute.tf:32-85`). | Current human IAM and Vercel/Render/Neon role exports were not reviewed; service roles alone do not prove complete cloud RBAC. | Excess privileges can create uncontrolled resources and spend. |
| COST02-BP05 — Implement cost controls | Partially Implemented | ECR retention (`infrastructure/aws/compute.tf:15-30`), media rate limiting (`apps/api/src/modules/media/media.controller.ts:26-34`), and upload size limits (`apps/api/src/modules/media/media.service.ts:91-97`) exist in source. | No service quota or verified budget control; live enforcement was not checked. | Accidental or abusive usage can increase cost without a hard stop. |
| COST02-BP06 — Track project lifecycle | Partially Implemented | Staging/production configuration (`infrastructure/aws/variables.tf:1-7`) and migration-log retention (`infrastructure/aws/migration.tf:1-5`) exist. | No authoritative environment inventory/decommission record; Terraform state backend is undeclared. | Obsolete environments or orphaned resources can continue billing. |

### COST03 — How do you monitor your cost and usage?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST03-BP01 — Configure detailed information sources | Cannot Determine | Needed: CUR/Cost Explorer granularity and Vercel/Render/Neon itemized invoices. | Detailed cost source is not integrated or documented. | Drivers cannot be attributed accurately. |
| COST03-BP02 — Add organization information to cost and usage | Partially Implemented | Common `Environment`, `ManagedBy`, and `Application` tags are defined (`infrastructure/aws/main.tf:20-24`) and used on reviewed resources. | Owner/cost-center coverage, tag policy, activation, and billing export are unverified. | Shared costs cannot be assigned reliably. |
| COST03-BP03 — Identify cost attribution categories | Cannot Determine | Needed: category mapping for product/environment/shared services and provider label mapping. | No complete cost-attribution taxonomy is present. | Reporting cannot answer product or environment questions consistently. |
| COST03-BP04 — Establish organization metrics | Cannot Determine | Needed: KPI definitions for spend, utilization, storage, requests, and transfer. | No agreed metric catalog is evidenced. | Teams optimize incompatible measures. |
| COST03-BP05 — Configure billing and cost management tools | Cannot Determine | Needed: AWS billing/Cost Explorer dashboards, access configuration, and SaaS billing integrations. | Tool configuration is outside repository evidence. | Trends and spikes are hard to see and investigate. |
| COST03-BP06 — Allocate costs based on workload metrics | Cannot Determine | Needed: cost/active user, cost/payment, cost/GB, and provider usage data. | Unit economics are unavailable. | Growth-related inefficiency cannot be identified. |

### COST04 — How do you decommission resources?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST04-BP01 — Track resources over their lifetime | Partially Implemented | Terraform lifecycle management and ECR retention (`infrastructure/aws/compute.tf:15-30`); local/default backend because no `backend` block exists in `infrastructure/aws/versions.tf:1-13`. | No remote/locked authoritative state or full provider inventory. | Lost state and stale inventory hide billable orphans. |
| COST04-BP02 — Implement a decommissioning process | Partially Implemented | RDS backup/deletion-protection controls (`infrastructure/aws/database.tf:31-35`) and ECR expiry (`infrastructure/aws/compute.tf:15-30`). | No documented whole-stack destroy/migration teardown runbook. | Retired stacks can continue incurring charges. |
| COST04-BP03 — Decommission resources | Cannot Determine | Needed: retirement records, post-decommission inventory, orphan scans, and provider checks. | No completed cleanup or verification evidence is available. | Failed or incomplete cleanup remains undetected and billable. |
| COST04-BP04 — Decommission resources automatically | Partially Implemented | ECR lifecycle action (`infrastructure/aws/compute.tf:15-30`) and account-retention logic (`apps/api/src/modules/account/account-retention.service.ts:19-49`). | Automation does not cover the full environment or orphaned SaaS resources; the account-retention schedule is external to the repository. | Manual cleanup leaves residual spend. |
| COST04-BP05 — Enforce data retention policies | Partially Implemented | Production/staging backups (`infrastructure/aws/database.tf:31-35`), migration logs (`infrastructure/aws/migration.tf:1-5`), and account purge (`apps/api/src/modules/account/account-retention.service.ts:19-49`). | Retention is partial; all application/media/audit data classes are not mapped. | Excess storage cost or premature loss of required data. |

### COST05 — How do you evaluate cost when you select services?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST05-BP01 — Identify organization requirements for cost | Cannot Determine | Interview needed: budget, RTO/RPO, data residency, support, and payment model constraints. | Requirements are not quantified. | Service choice may violate constraints or overpay for unneeded assurances. |
| COST05-BP02 — Analyze all components of the workload | Partially Implemented | Application stack (`README.md:15-28`) and AWS ECS/RDS/ECR components are inventoried in source. | No priced component inventory including NAT, support, operations, and every SaaS dependency. | Material cost drivers can be omitted from migration decisions. |
| COST05-BP03 — Perform a thorough analysis of each component | Cannot Determine | Needed: current SaaS bills/usage and AWS TCO comparison for every component. | No per-component all-in cost analysis exists. | Migration may raise total cost despite lower line-item prices. |
| COST05-BP04 — Select software with cost-effective licensing | Cannot Determine | Needed: dependency/license inventory and commercial terms. | Licensing cost/compliance analysis is not documented. | Unexpected license fees or restrictions affect TCO. |
| COST05-BP05 — Select components of this workload to optimize cost in line with organization priorities | Cannot Determine | Managed choices are visible (`README.md:15-28`, `infrastructure/aws/database.tf:19-37`), but priority-based selection rationale/pricing evidence is absent. | Cost and organization priorities were not shown to drive selection. | Architecture may be technically managed but economically suboptimal. |
| COST05-BP06 — Perform cost analysis for different usage over time | Cannot Determine | Needed: historical Vercel/Render/Neon utilization, growth scenarios, and duplicate-environment analysis. | No time-based usage or cost analysis is present. | Existing commitments and duplicate stacks can waste spend as demand changes. |

### COST06 — How do you meet cost targets when you select resource type, size and number?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST06-BP01 — Perform cost modeling | Cannot Determine | Needed: requests/SKU, DB metrics, GB-month, egress, and environment cost model. | Fixed resources have no workload/cost model in source. | Baseline cost and scaling spend cannot be forecast. |
| COST06-BP02 — Select resource type, size, and number based on data | Partially Implemented | RDS type/size and storage autoscaling (`infrastructure/aws/database.tf:19-25`), service CPU/memory inputs (`infrastructure/aws/variables.tf:39-54`), and Express services (`infrastructure/aws/service.tf:6-67`) are explicit. | No benchmark, demand profile, or replica/capacity analysis supports these choices. | Wrong family, excess capacity, or costly saturation can inflate spend. |
| COST06-BP03 — Select resource type, size, and number automatically based on metrics | Partially Implemented | RDS storage autoscaling (`infrastructure/aws/database.tf:23-25`) responds to storage demand. | No metric-driven compute type/size/count adjustment is declared. | Compute does not follow demand efficiently. |
| COST06-BP04 — Consider using shared resources | Partially Implemented | Services share an ECS cluster (`infrastructure/aws/service.tf:1-4`) and VPC/subnet selection (`infrastructure/aws/main.tf:20-24`). | Sharing/isolation trade-offs and duplicate provider environments were not costed. | Duplicate infrastructure or unsafe sharing can increase total cost. |

### COST07 — How do you use pricing models to reduce cost?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST07-BP01 — Perform pricing model analysis | Cannot Determine | Needed: on-demand vs RI/Savings Plans/Spot analysis using stable utilization and interruption tolerance. | No pricing-model comparison exists. | Workload may pay unnecessarily high on-demand rates. |
| COST07-BP02 — Choose Regions based on cost | Cannot Determine | `eu-north-1` is configured (`infrastructure/aws/variables.tf:9-12`), but no compliant-Region price/latency comparison was found. | Region selection is not supported by cost evidence. | Workload may run in a more expensive suitable Region. |
| COST07-BP03 — Select third-party agreements with cost-efficient terms | Cannot Determine | Needed: Vercel/Render/Neon/R2 contract terms, commitments, and renewal analysis. | Third-party agreement economics are outside repository evidence. | Unsuitable terms or overlapping commitments can waste spend. |
| COST07-BP04 — Implement pricing models for all components of this workload | Cannot Determine | Needed: active purchase/commitment configuration and component coverage. | No implemented commitment or coverage evidence. | Potential savings remain unrealized. |
| COST07-BP05 — Perform pricing model analysis at the management account level | Cannot Determine | Needed: management-account utilization/coverage reports, expiry alerts, and adjustment cadence. | Centralized commitment governance is unknown. | Unused commitments and expiring discounts create waste. |

### COST08 — How do you plan for data transfer charges?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST08-BP01 — Perform data transfer modeling | Cannot Determine | Needed: GB/month by client→web/API/R2, NAT, cross-AZ/Region, and provider egress path. | No transfer-volume or price model exists. | Egress can become an unexpected major cost. |
| COST08-BP02 — Select components to optimize data transfer cost | Cannot Determine | Needed: user geography, provider Regions, VPC/NAT/public-IP routes, and cross-Region flow map; services declare subnets (`infrastructure/aws/service.tf:37-39,63-65`) but no network-cost design. | Component proximity and routing economics are unverified. | Per-GB NAT, cross-Region, and public egress charges may dominate. |
| COST08-BP03 — Implement services to reduce data transfer costs | Partially Implemented | Five-minute signed R2 PUT URL returned to the client (`apps/api/src/modules/media/media.service.ts:66-120`); R2 public origin is configured (`apps/api/src/modules/media/media.service.ts:39-64`). | Direct upload is positive, but downloads, cache hit ratio, and other flows are not optimized/modeled. | Proxied media or repeated transfers can increase spend. |

### COST09 — How do you manage demand, and supply resources?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST09-BP01 — Perform an analysis on the workload demand | Cannot Determine | Needed: traffic time series, peak/average concurrency, seasonality, and DB load. | No demand profile is in the repo. | Capacity and cost cannot be matched to actual demand. |
| COST09-BP02 — Implement a buffer or throttle to manage demand | Partially Implemented | Direct client-to-R2 uploads (`apps/api/src/modules/media/media.service.ts:66-120`) reduce API load; media endpoints declare rate limits (`apps/api/src/modules/media/media.controller.ts:26-34,41-47`). | No queue or workload-wide backpressure policy is shown; media-only controls do not establish general demand management. | Traffic bursts force expensive overcapacity or failures. |
| COST09-BP03 — Supply resources dynamically | Partially Implemented | RDS storage autoscaling (`infrastructure/aws/database.tf:23-25`). | Compute desired count and autoscaling signals are not explicit in `infrastructure/aws/service.tf:6-67`. | Persistent headroom or reactive capacity raises cost. |

### COST10 — How do you evaluate new services?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST10-BP01 — Develop a workload review process | Cannot Determine | Needed: periodic service evaluation, TCO criteria, owners, and approval/adoption records. | No evaluation process is documented. | New price/performance opportunities are adopted late or ad hoc. |
| COST10-BP02 — Review and analyze this workload regularly | Cannot Determine | Needed: dated workload reviews, utilization/cost analysis, decisions, and follow-up outcomes. | No recurring workload-analysis evidence is present. | Inefficient designs persist without reevaluation. |

### COST11 — How do you evaluate the cost of effort?

| BP ID and exact canonical title | Status | Evidence or evidence needed | Gap | Risk |
|---|---|---|---|---|
| COST11-BP01 — Perform automation for operations | Partially Implemented | AWS build/migration/deployment workflow (`.github/workflows/deploy-aws.yml:47-124`), ECR lifecycle (`infrastructure/aws/compute.tf:15-30`), and retention logic (`apps/api/src/modules/account/account-retention.service.ts:19-49`). | Render Cron jobs are external documentation (`docs/deployment.md:74-84`); the AWS workflow defines no schedule for account retention/Karama decay. | Manual toil and missed cleanup/decay jobs increase operational and storage cost. |

## Evidence-backed findings (impact × likelihood)

| Finding | Evidence | Impact | Likelihood | Matrix risk |
|---|---|---|---|---|
| Cost governance is not demonstrated | No owner, budgets/alerts, cost dashboards, verified allocation export, or unit KPI evidence; provider consoles were not reviewed. | Moderate | Medium | **Medium** |
| Proposed AWS Terraform state is local by default and unlocked | No `backend` block (`infrastructure/aws/versions.tf:1-13`); plain `terraform init` (`.github/workflows/deploy-aws.yml:61-62`). | Moderate | High | **High** |
| Fixed runtime capacity lacks measured sizing | `db.t4g.medium` and 20 GB initial storage (`infrastructure/aws/database.tf:23-25`); API service source has no explicit replica/autoscaling target (`infrastructure/aws/service.tf:6-40`). | Moderate | Medium | **Medium** |
| Data-transfer economics are incomplete | Direct R2 upload exists (`apps/api/src/modules/media/media.service.ts:66-120`), but no NAT/public egress/GB model or verified CDN behavior. | Moderate | Medium | **Medium** |
| Scheduled operational jobs are not codified for proposed AWS | Documented Render Cron jobs (`docs/deployment.md:74-84`); the AWS workflow runs migrations but defines no scheduled retention/Karama jobs (`.github/workflows/deploy-aws.yml:85-124`). | Moderate | Medium | **Medium** |
| Migration may duplicate managed-service spend | Current Vercel/Render/Neon topology (`README.md:15-28`) coexists in source with an AWS deploy path, but no applied AWS stack was verified. | Moderate | Low | **Medium** |

## Eisenhower remediation plan

Owners below are role suggestions, not verified assignments. Dates are relative to the 2026-11-12 report date. High criticality raises the need for measurement and rollback safety; it does not justify downsizing, commitment purchases, or removing Multi-AZ without workload evidence.

| Quadrant | Findings / actions | SMART completion target | Owner suggestion |
|---|---|---|---|
| **Do First — high importance, low effort** | Name a cost owner; approve budget/alert thresholds; inventory active environments and scheduled jobs. | Within **5 business days**, publish a named owner, environment inventory, and alert-routing record covering 100% of identified AWS/Vercel/Render/Neon/R2 environments; test one notification. | Engineering lead with finance owner |
| **Plan — high importance, high effort** | Establish remote locked Terraform state; collect 3–6 months of cost/usage; build demand and transfer models; define migration coexistence/teardown gates. | Within **30 days**, produce an approved baseline covering 100% of invoiced services and a demand model for API/web/DB/media; migrate state without resource recreation and record rollback evidence. | Platform owner with finance and application owners |
| **Delegate — lower immediate importance, low effort** | Gather IAM/account inventories, license terms, provider release notes, scheduled-job logs, and cost-allocation coverage. | Within **10 business days**, attach dated exports/review notes for every provider and flag missing evidence explicitly rather than treating it as absent. | Cloud operations and application maintainers |
| **Defer — lower immediate importance, high effort** | Commitment purchases, instance/database resizing, CDN/network redesign, and retired-provider decommissioning. | Reassess only after the 30-day baseline; require measured utilization, SLO guardrails, rollback steps, and owner approval before each change. | Architecture review group |

## Recommended evidence collection before any cost decision

1. Export the last 3–6 months of Vercel, Render, Neon, R2, and any existing AWS invoices and usage; include support and egress.
2. Interview the engineering/finance owner for budget ownership, cost targets, approval process, and planned migration coexistence/teardown dates.
3. Produce a demand model: requests, concurrency, DB CPU/IOPS/storage, media GB, transfer paths, and environment hours; only then assess size, Multi-AZ cost, and commitments.
4. Move Terraform state to a reviewed remote, locked backend before relying on it for lifecycle/cost governance; do not destroy or recreate resources merely to change backends.
5. Encode and verify the two documented scheduled jobs in the target platform, then measure their completion and retention effects.

## Acceptance check

- Validated corpus retained: **11 questions, 50 BPs**.
- Ledger contains exactly one status for every BP and every canonical title.
- **22/55 = 40%**; no unsupported runtime claim, secret, payment value, or cost estimate is included.
