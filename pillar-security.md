# Baydar / Bayader — Confidential AWS Well-Architected Security Assessment

**Review date:** 2026-11-12  
**Scope:** Application source, deployment workflows, and proposed AWS Terraform in this repository.  
**Evidence boundary:** No AWS account, live provider configuration, or organizational records were inspected. “Not Implemented” means the reviewed evidence does not establish the control; it is not proof that an external control does not exist. **Cannot Determine** requires read-only runtime evidence or owner interviews.

## 1. Executive assessment

The application has useful security foundations: bcrypt password hashing, short-lived JWTs, hashed refresh tokens, HttpOnly/SameSite web refresh cookies, server-side ownership checks, request logging with credential redaction, CI, immutable application images, GitHub OIDC deployment, encrypted RDS storage, and Secrets Manager integration.

The two leading application findings are confirmed in source:

1. **HyperPay transaction integrity is incomplete.** `handleHyperPayWebhook` authenticates/decrypts the callback and routes a successful payload to `activateInvoice`, but the payment state is accepted without a server-to-server status query or an explicit check that the returned amount and currency match the stored invoice (`apps/api/src/modules/billing/billing.service.ts:310-343`; `apps/api/src/modules/billing/hyperpay.client.ts:65-99`). This is a payment-integrity gap, not a claim that the callback is unauthenticated.
2. **Media scan readiness is not enforced when media is consumed.** The confirm endpoint returns scan status, but post creation accepts media URLs without requiring a persisted `READY` result (`apps/api/src/modules/media/media.service.ts`; `apps/api/src/modules/media/media-scan.service.ts`; `apps/api/src/modules/posts/posts.service.ts`). A client can bypass the documented UI-side readiness convention.

Other important gaps are session revocation for already-issued access tokens, the absence of an evidenced incident-response program, incomplete security telemetry, and incomplete CI/CD supply-chain hardening.

**Question score:** 20/55 (36%). This is a source-based maturity score, not a probability of compromise.

### Priority risks

| ID | Finding | Impact | Likelihood | Risk |
|---|---|---:|---:|---:|
| SEC-R1 | HyperPay activation lacks independent transaction verification | Critical | High | **Critical** |
| SEC-R2 | Media consumption does not require server-side `READY` evidence | High | High | **High** |
| SEC-R3 | Existing access tokens remain accepted after password/account changes until expiry | High | High | **High** |
| SEC-R4 | No evidenced incident-response playbooks, simulations, or forensic capability | High | Medium | **High** |
| SEC-R5 | Security logs, alerting, and investigation workflows are incomplete | High | Medium | **High** |
| SEC-R6 | Actions are version-tagged rather than commit-pinned; artifact provenance is incomplete | High | Medium | **High** |

## 2. Question scorecard

| Question | Score | Assessment |
|---|---:|---|
| SEC01 | 1/5 | Proposed infrastructure automation exists, but account governance and threat-management evidence is limited. |
| SEC02 | 3/5 | Application authentication and OIDC are useful foundations; enterprise identity and credential lifecycle remain incomplete. |
| SEC03 | 2/5 | Application authorization and scoped secrets exist, but least privilege and access governance need completion. |
| SEC04 | 2/5 | Logging exists; centralized security telemetry, correlation, and response are not established. |
| SEC05 | 2/5 | Private data-tier intent exists; actual traffic controls and inspection need runtime verification. |
| SEC06 | 3/5 | Image immutability and deployment automation help; vulnerability and runtime protection remain incomplete. |
| SEC07 | 2/5 | Token redaction and account retention help, but data classification and lifecycle coverage are limited. |
| SEC08 | 2/5 | RDS encryption and Secrets Manager are proposed; comprehensive key and data-at-rest controls are unproven. |
| SEC09 | 2/5 | HTTPS and authenticated webhooks help; certificate and end-to-end network-control evidence is incomplete. |
| SEC10 | 1/5 | No incident-response program is evidenced in the reviewed material. |
| SEC11 | 2/5 | Programmatic delivery exists; training, independent testing, and pipeline assurance are incomplete. |

## 3. Canonical question and control ledger

### SEC01 — How do you securely operate your workload?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC01-BP01 — Separate workloads using accounts | **Cannot Determine** | Separate staging/production Terraform stacks do not establish account isolation. Verify account IDs, boundaries, and deployment permissions. |
| SEC01-BP02 — Secure account root user | **Cannot Determine** | Root credentials, hardware MFA, contact details, and monitoring require account evidence. |
| SEC01-BP03 — Identify and validate control objectives | **Partially Implemented** | Authentication, CI, and encryption intentions exist, but approved control objectives and validation criteria are not documented. |
| SEC01-BP04 — Identify and validate threats | **Not Implemented** | No recurring threat-intake and prioritization process is evidenced. Establish advisory triage and remediation ownership. |
| SEC01-BP05 — Reduce security management scope | **Partially Implemented** | Managed application/deployment services reduce some undifferentiated work. Record the shared-responsibility boundary for each service. |
| SEC01-BP06 — Automate deployment of standard security controls | **Partially Implemented** | CI and Terraform automate application delivery, not a complete account security baseline. Add repeatable identity, logging, encryption, and detective controls. |
| SEC01-BP07 — Identify threats using a threat model | **Not Implemented** | No threat model for billing, media, or identity is evidenced. Model actors, assets, trust boundaries, abuse cases, and accepted risks. |
| SEC01-BP08 — Evaluate and implement new security services and features regularly | **Not Implemented** | No scheduled evaluation process is evidenced. Assign a cadence and risk-based adoption owner. |

### SEC02 — How do you manage identities for people and machines?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC02-BP01 — Use strong sign-in mechanisms | **Partially Implemented** | bcrypt hashing, short-lived JWTs, and web cookie protections help. MFA and workforce sign-in policy are not evidenced. |
| SEC02-BP02 — Use temporary credentials | **Partially Implemented** | Short-lived application tokens and GitHub OIDC are used. Long-lived R2/application secrets still need inventory, minimization, and rotation. |
| SEC02-BP03 — Store and use secrets securely | **Partially Implemented** | Proposed RDS credentials use Secrets Manager. Actual application/R2 secret storage and access need provider validation. |
| SEC02-BP04 — Rely on a centralized identity provider | **Partially Implemented** | The API centralizes application authentication. No centralized workforce identity or single source for administrative identities is evidenced. |
| SEC02-BP05 — Audit and rotate credentials periodically | **Not Implemented** | No credential inventory, rotation schedule, or audit evidence is present. Automate rotation and alert on stale credentials. |
| SEC02-BP06 — Leverage groups and attributes | **Partially Implemented** | Application roles and company membership provide authorization attributes. Define managed groups/attributes for administrative access too. |

### SEC03 — How do you manage permissions for people and machines?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC03-BP01 — Define access requirements | **Partially Implemented** | Service methods and scoped ECS secrets imply some access requirements. Produce role/action/resource requirements for users and workloads. |
| SEC03-BP02 — Grant least privilege access | **Partially Implemented** | ECS secrets are individually scoped, but the ECR policy uses `Resource: "*"` and the database security-group rule is broad. Scope every action/resource and network path. |
| SEC03-BP03 — Establish emergency access process | **Not Implemented** | No tested break-glass identity, approval, monitoring, or post-use review is evidenced. |
| SEC03-BP04 — Reduce permissions continuously | **Not Implemented** | No usage-driven right-sizing or removal process is evidenced. Review actual access and stale identities routinely. |
| SEC03-BP05 — Implement permission guardrails | **Cannot Determine** | Organization policies, SCPs, and preventive guardrails require organization/account evidence. |
| SEC03-BP06 — Manage access based on lifecycle | **Partially Implemented** | Tokens expire and account membership influences application access. Administrative joiner/mover/leaver and membership-revocation evidence is incomplete. |
| SEC03-BP07 — Analyze public and cross-account access | **Cannot Determine** | Public exposure and resource policies need read-only account analysis; repository files cannot establish the deployed state. |
| SEC03-BP08 — Share resources securely within your organization | **Partially Implemented** | Secrets Manager and scoped ECS access support controlled sharing. Validate cross-role/account policies and avoid broad resource sharing. |
| SEC03-BP09 — Share resources securely with a third party | **Partially Implemented** | HyperPay and R2 integrations exist, but there is no third-party access inventory. The HyperPay integrity gap must be closed independently of credential controls. |

### SEC04 — How do you detect and investigate security events?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC04-BP01 — Configure service and application logging | **Partially Implemented** | API request/error logging redacts common credential fields. Enable and validate relevant provider audit, auth, database, and deployment logs. |
| SEC04-BP02 — Capture logs, findings, and metrics in standardized locations | **Cannot Determine** | No standardized central destination, retention, protection, or access policy is established by source alone. |
| SEC04-BP03 — Correlate and enrich security alerts | **Not Implemented** | No correlation rules, asset enrichment, or alert severity model is evidenced. |
| SEC04-BP04 — Initiate remediation for security events | **Not Implemented** | No alert-to-containment automation or documented response action is evidenced. Start with payment abuse, credential compromise, and malicious media. |

### SEC05 — How do you protect your networks?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC05-BP01 — Create network layers | **Partially Implemented** | Public application and private PostgreSQL intent exists. Verify deployed subnet, routing, DNS, and egress isolation. |
| SEC05-BP02 — Control traffic flow within your network layers | **Partially Implemented** | PostgreSQL is restricted by security group, but its allowed source is broad. Limit it to the application security group and audit all inbound/outbound rules. |
| SEC05-BP03 — Implement inspection-based protection | **Not Implemented** | No network flow analysis, intrusion detection, or inspected egress is evidenced. Choose controls based on the actual threat model. |
| SEC05-BP04 — Automate network protection | **Not Implemented** | No automated response to network events is evidenced. Add tested, reversible containment only after detection is reliable. |

### SEC06 — How do you protect your compute resources?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC06-BP01 — Perform vulnerability management | **Partially Implemented** | ECR scan-on-push is configured. Add dependency/image triage, remediation SLAs, rebuilds, and deployed-version verification. |
| SEC06-BP02 — Reduce attack surface with hardened images | **Partially Implemented** | Slim Node images reduce some surface. No explicit minimal-user, filesystem, package, or hardening baseline is evidenced. |
| SEC06-BP03 — Reduce manual management and interactive access | **Partially Implemented** | Automated build/deployment reduces manual changes. Verify that production shell/SSH access is disabled or tightly audited. |
| SEC06-BP04 — Validate software integrity | **Partially Implemented** | Frozen lockfiles and immutable tags help. Pin Actions to reviewed commit SHAs and add image signing/provenance and admission verification. |
| SEC06-BP05 — Automate compute protection | **Partially Implemented** | Managed deployment and health configuration help availability. Runtime threat detection and automated workload response are not evidenced. |

### SEC07 — How do you classify your data?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC07-BP01 — Identify the data within your workload | **Not Implemented** | No authoritative inventory maps identity, payment, media, logs, exports, and backups to owners and locations. |
| SEC07-BP02 — Apply data protection controls based on data sensitivity | **Partially Implemented** | Credential redaction and session controls protect some sensitive values. Define sensitivity tiers and controls for every data class. |
| SEC07-BP03 — Automate identification and classification | **Not Implemented** | No automated discovery/classification or sensitive-data finding workflow is evidenced. |
| SEC07-BP04 — Define data lifecycle management | **Partially Implemented** | Account-retention services cover part of the lifecycle. Define retention/deletion for media, invoices, logs, exports, tokens, and backups. |

### SEC08 — How do you protect your data at rest?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC08-BP01 — Implement secure key management | **Partially Implemented** | Secrets Manager is proposed for database credentials. KMS keys, ownership, rotation, administration, and separation of duties need definition. |
| SEC08-BP02 — Enforce encryption at rest | **Partially Implemented** | `storage_encrypted = true` protects proposed RDS storage. Verify media, snapshots, logs, exports, CI artifacts, and backups. |
| SEC08-BP03 — Automate data at rest protection | **Partially Implemented** | Terraform automates the RDS setting. Extend enforced encryption and validation to all persistent data stores. |
| SEC08-BP04 — Enforce access control | **Partially Implemented** | ECS secrets are scoped individually. Validate database/media IAM and narrow the database network rule; least privilege is not yet comprehensive. |

### SEC09 — How do you protect your data in transit?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC09-BP01 — Implement secure key and certificate management | **Cannot Determine** | No ACM/certificate issuance, renewal, ownership, or private-key control is established in the reviewed sources. |
| SEC09-BP02 — Enforce encryption in transit | **Partially Implemented** | Public HTTPS usage and database `sslmode=require` support transport encryption. Verify internal hops, certificate validation, and provider endpoints. |
| SEC09-BP03 — Authenticate network communications | **Partially Implemented** | HyperPay callbacks use authenticated encryption and application calls use tokens. mTLS/service identity is not evidenced, and callback authentication does not replace transaction verification. |

### SEC10 — How do you anticipate, respond to, and recover from incidents?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC10-BP01 — Identify key personnel and external resources | **Not Implemented** | No incident commander, responders, legal/privacy contacts, or provider escalation matrix is evidenced. |
| SEC10-BP02 — Develop incident management plans | **Not Implemented** | Create playbooks for payment fraud, account takeover, credential exposure, malicious media, and data loss. |
| SEC10-BP03 — Prepare forensic capabilities | **Not Implemented** | No isolated investigation environment, evidence handling, snapshots, or chain-of-custody process is evidenced. |
| SEC10-BP04 — Automate containment capability | **Not Implemented** | No tested containment actions are evidenced. Automate reversible token revocation, credential disabling, and workload isolation after validation. |
| SEC10-BP05 — Pre-provision access | **Cannot Determine** | Responder roles and emergency permissions require account verification. Provision least-privilege access before an incident. |
| SEC10-BP06 — Pre-deploy tools | **Not Implemented** | No pre-deployed investigation, evidence collection, or response tooling is evidenced. |
| SEC10-BP07 — Run simulations | **Not Implemented** | No game days or tabletop exercises are evidenced. Test detection, decisions, communications, containment, and recovery. |
| SEC10-BP08 — Establish a framework for learning from incidents | **Not Implemented** | No post-incident review, action tracking, or playbook feedback loop is evidenced. |

### SEC11 — How do you build and run secure applications?

| Best practice | Status | Evidence and required closure |
|---|---|---|
| SEC11-BP01 — Train for application security | **Not Implemented** | No role-based secure-development training is evidenced. Include authorization, payment integrity, untrusted media, and secret handling. |
| SEC11-BP02 — Automate testing throughout the development lifecycle | **Partially Implemented** | CI/testing exists. Add repeatable negative authorization, webhook tampering, media-state, SAST, dependency, IaC, and integration security tests. |
| SEC11-BP03 — Perform regular penetration testing | **Not Implemented** | No independent assessment or remediation record is evidenced. Test billing, identity, media, APIs, and exposed infrastructure. |
| SEC11-BP04 — Review the security of applications | **Cannot Determine** | Repository code and CI alone do not establish independent security review or required reviewer approval. Verify branch controls and assessment records. |
| SEC11-BP05 — Centrally manage packages and dependencies | **Partially Implemented** | The pnpm lockfile supports reproducible dependency resolution. Approved registries, dependency policy, provenance, and malicious-package response need definition. |
| SEC11-BP06 — Implement build and deployment processes programmatically | **Implemented** | GitHub workflows build and deploy programmatically with frozen dependency installation and OIDC. Complete artifact integrity and environment verification. |
| SEC11-BP07 — Regularly assess security properties of the pipeline | **Not Implemented** | No recurring review of workflow permissions, action pinning, artifact provenance, secrets, or deployment approvals is evidenced. |
| SEC11-BP08 — Identify and validate security ownership | **Cannot Determine** | Ownership and accountable approvers are not established by source files alone. Verify CODEOWNERS, branch protection, and escalation ownership. |

## 4. Required remediation sequence

1. **Stop payment-integrity exposure:** verify the HyperPay transaction server-to-server; require exact invoice, amount, currency, and successful state; make activation idempotent; add mismatch/replay tests and actionable alerts.
2. **Enforce media state server-side:** bind uploaded object identity to the authenticated user, persist scan result, and reject non-`READY` objects at every consumer. Add direct-API bypass tests.
3. **Close session gaps:** revoke refresh/session state on security changes and define acceptance behavior for existing access tokens; consider short TTLs, token-version checks, and immediate invalidation for high-risk events.
4. **Establish incident readiness:** name owners, create the five priority playbooks, pre-provision responder access and forensic tooling, and run a payment-fraud/account-takeover simulation.
5. **Complete detection and response:** centralize protected audit/application logs, add payment/auth/media security alerts, and connect them to documented containment.
6. **Harden delivery and least privilege:** pin Actions to SHAs, add signed image provenance, scope ECR permissions, narrow PostgreSQL access, and validate all deployed encryption and secret controls.

## 5. Corpus coverage

- **11/11 canonical Security questions** covered.
- **63/63 canonical best practices** covered using frozen `SECxx-BPyy` identifiers and titles.
- Application findings are source-based; AWS configuration findings remain bounded by the evidence rules above.
