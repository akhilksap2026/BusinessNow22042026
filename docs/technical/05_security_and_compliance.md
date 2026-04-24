# Security & Compliance — BusinessNow PSA

| | |
|---|---|
| **Product** | BusinessNow PSA |
| **Owner** | Security Lead |
| **Version** | 1.0 — Approved |
| **Date** | 2026-04-24 |
| **Status** | Approved |

> This document is **honest** about the current security posture of an internal-only platform. Where the model is intentionally simpler than a public SaaS would be, that is called out. Where there are real gaps, they are listed in §11.

---

## 1. Threat Model (Lite)

BusinessNow PSA is **single-tenant** and used only by KSAP Technology employees, contractors, and a small number of named **client portal** users. The relevant attackers are:

| Actor | Likely goal | Mitigations |
|---|---|---|
| External unauthenticated attacker on the public deployment URL | Access internal data; deface; ransomware | Replit deployment front door; no anonymous write paths; audit log; daily snapshots. |
| Malicious or careless internal user with low privileges (Viewer / Consultant) | Privilege escalation; PII access | Server-side RBAC on every write; UI affordance differences; audit log per write. |
| Compromised internal user with PM / Finance privileges | Mass exfiltration; financial fraud | Role separation (PM vs Finance); audit log; small blast radius in single-tenant model. |
| Client portal user | Cross-customer access; PII | Portal endpoints scoped to the granted account; no write paths to internal data. |
| Supply-chain attack (npm dependency) | RCE; credential theft | Dependency scanning; pinned versions; pnpm lockfile; only trusted org packages. |

---

## 2. Identity & Authentication (Current)

The current model is **header-based**. It is intentionally simple for an internal platform but is documented honestly so future work knows what it is replacing.

| Item | Reality today |
|---|---|
| Login surface | The SPA's role switcher writes `localStorage.activeRole`. The first time a user opens the app, KSAP's IT team has provisioned them with the right role through the Admin → Users surface. |
| Session | There is **no JWT, no OAuth, no SSO** today. The role is read from `localStorage.activeRole` and sent on every request as `x-user-role`. |
| User identification | A `x-user-id` header may be sent for audit attribution; `/api/me` returns the current user. |
| Header construction | Centralised in `artifacts/businessnow/src/lib/auth-headers.ts`. Fail-closed (no role → no header → server-side reject on writes). Role spread last to prevent override. |
| Front door | Replit's deployment front door handles TLS and DNS. |

### What this means in practice

- The model relies on the **Replit deployment front door** and on KSAP's access controls (who has the deployment URL) for the equivalent of perimeter authentication.
- Role escalation requires either DevTools access on a privileged user's machine or compromise of the deployment surface itself.
- This is acceptable for an **internal, single-tenant platform** with the user population we have today. It would not be acceptable for a commercial SaaS — see §11.

### Roadmap

- **SSO / OIDC** is on the LATER track in doc 10. When it lands, the `authHeaders()` helper becomes the single migration point on the SPA side; the API switches from `x-user-role` to a verified role claim.

---

## 3. Authorisation — RBAC

### Roles

| Role | Typical user |
|---|---|
| `account_admin` | Full access including org/account settings, cost rates, user management. Legacy alias: `Admin`. |
| `super_user` | Broad access to all project work surfaces; cannot manage core account settings or view raw cost rates. Legacy aliases: `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA`. |
| `collaborator` | Limited internal user. Can view/contribute on assigned projects; no project creation; no admin surfaces. Legacy aliases: `Collaborator`, `Viewer`. Demo job-title strings (`Consultant`, `Business Analyst`, `Data Engineer`, `Integration Engineer`, `QA Engineer`) also resolve here. |
| `customer` | External / portal-only user. Project-scoped read access via `/api/portal-auth/*`; blocked from internal `/api/*` routes by `blockPortalRoles`. Legacy aliases: `Customer`, `Partner`. |

The legacy 11-role string union (`Admin`, `PM`, `Super User`, `Finance`, `Developer`, `Designer`, `QA`, `Collaborator`, `Viewer`, `Customer`, `Partner`) is still accepted on the `x-user-role` header — `LEGACY_ROLE_MAP` in `artifacts/api-server/src/constants/roles.ts` resolves any value to its canonical role. New code should prefer the four canonical values. **"Resource Manager" is a job function, not a role** — capacity / staffing work is performed by an `account_admin` or `super_user`.

A user can also have **secondary roles** they switch into via the role switcher — see `users.secondary_roles[]`.

### Middleware

Every write route is wrapped by one of:

| Middleware | Roles allowed |
|---|---|
| `requireAdmin` | `account_admin` (= legacy `Admin`). |
| `requirePM` | `account_admin` or `super_user` (= legacy `Admin` / `PM` / `Super User` / `Finance` / `Developer` / `Designer` / `QA`). Implemented as `requireRole("super_user")`. |
| `requireFinance` | `account_admin` or `super_user` (canonical check via `requireCanonicalRole("account_admin","super_user")`). |
| `requireCostRateAccess` | Legacy `Admin`, `Finance`, `PM` only — Super Users explicitly excluded so they cannot read raw cost rates. |
| `blockPortalRoles` | Globally applied to all `/api/*` routes (except `/api/portal-auth/*`) — rejects `customer` / `Customer` / `Partner`. |
| Building blocks | `requireRole(min)`, `requireCanonicalRole(...roles)`, `requireAnyRole(...roles)` — used directly when a one-off rule is needed. |

There is **no `requireRM`** — capacity / staffing approval routes use `requirePM`. The `resourceRequests.ts` write routes are currently **not gated** at the middleware level (a known gap; tracked in the Risk Register as part of the read-side / write-side RBAC sweep).

A code-review reject is mandatory for any new write route lacking the right `require*` middleware.

### Known gap — read-side filtering

Read endpoints (`GET`) are currently permissive: a `Viewer` or `Consultant` sees **all** rows of a list resource, not only those scoped to them. The 2026-04-23 audit logged this as **High, accepted** — it is a backlog item, not a regression. Mitigation: the Replit deployment front door restricts who can see the app at all; audit-log entries on writes still bind to the actor.

---

## 4. Data Classification

| Class | Examples in BusinessNow PSA | Handling |
|---|---|---|
| **PII (low)** | Internal user name, email, role, department, avatar URL. | Standard table columns; included in audit-log payloads where relevant. |
| **PII (client portal)** | Client portal account user record, contact metadata. | Scoped to the client portal endpoints (`/api/portal/*`). Not visible across portal accounts. |
| **Financial** | Rate cards, cost rates, billable rates, invoices, line items, revenue entries, change-order amounts, project budgets. | Read access gated behind Finance / PM / Admin roles in the UI; write access via `requireFinance` / `requirePM` server-side. |
| **Operational metadata** | Tasks, allocations, time entries, project status, change orders. | Internal-use; no PII concerns beyond actor-id columns. |
| **Audit** | `audit_log` rows including before/after JSON payloads. | Append-only; read-only through `GET /api/audit-log`. |

Documents stored in the `documents` / `document_versions` tables can carry attachments. KSAP IT is responsible for the storage backend's encryption-at-rest configuration (see §6).

---

## 5. Data Lifecycle

| Stage | Behaviour |
|---|---|
| Create | Standard `created_at`, optional `actor_user_id`. Audit-log row. |
| Read | RBAC-permissive on GETs (see §3 known gap). |
| Update | Audit-log row with `payload_before` / `payload_after`. |
| Delete (soft) | `projects.deleted_at` only. Restore via `POST /api/projects/:id/restore`. |
| Delete (hard) | Allowed for non-`projects` rows; audit-log record retained. |
| Export | List endpoints support CSV download from the UI (Reports, audit log) for the calling user's role. |
| Backup | Replit-managed daily snapshots; PITR; quarterly off-Replit copy held by KSAP IT (per doc 17 §3). |
| Retention | Operational data is retained indefinitely for the active platform. The audit log is retained indefinitely. |

There is no "right to be forgotten" workflow today (out of scope — internal platform).

---

## 6. Secrets, Keys, and Storage

- **Environment variables** — managed via the Replit secrets surface and the environment-secrets skill. Engineers must never read or write secrets manually.
- **Connection strings** — `DATABASE_URL` is provided by Replit and rotated by Replit's managed Postgres service.
- **Encryption at rest** — provided by Replit's managed Postgres and storage layer.
- **Encryption in transit** — TLS via Replit's deployment front door.
- **No client-side secrets.** The SPA contains no API keys; everything sensitive lives behind the API.

---

## 7. Audit Log

`audit_log` is append-only. Every write route calls `logAudit({ entityType, entityId, action, actorUserId, actorRole, payloadBefore, payloadAfter })`. The Definition of Done for any new write route includes: an `audit_log` row exists with non-null actor.

The UI exposes the audit log to **Admin** under `/api/audit-log` (cursor-paginated). Filters: actor, entity type, entity id, action, date range. CSV export is supported.

---

## 8. Logging & Observability

| Stream | Where |
|---|---|
| API server logs | Workflow console (dev); Replit deployment logs (prod). |
| Frontend errors | Browser console (dev); error-tracking service (prod, per doc 17 §4). |
| Database snapshots | Replit-managed daily; visible in Replit's DB UI. |

Log entries must **never** include credentials, tokens, or full request bodies for write paths (the audit log captures what we need).

---

## 9. Dependency & Code Hygiene

- **Lockfile** — pnpm lockfile checked in; reproducible installs.
- **Dependency scanning** — runs in CI per the security skill (`runDependencyAudit`).
- **SAST** — `runSastScan` is part of the periodic security review.
- **Secret scanning** — `runHoundDogScan` looks for committed secrets.
- **Generated code** — files in `lib/api-zod/src/generated/` and `lib/api-client-react/src/generated/` are reviewed but not hand-edited.

The full security-review playbook is the security_scan skill; run it ahead of any release that touches authentication, a new write surface, or third-party packages.

---

## 10. Incident Response (Lite)

| Severity | Definition | Response time |
|---|---|---|
| **S1** | Data loss; data exposure; full outage. | Acknowledge **15 minutes**; mitigate **1 hour**; resolve same business day. |
| **S2** | Major degradation; partial outage; auth bypass. | Acknowledge **1 hour**; mitigate **4 hours**; resolve **2 business days**. |
| **S3** | Single-team blocker; non-critical defect with workaround. | Acknowledge **1 business day**; resolve next sprint. |

For S1/S2, open a war-room channel in the team's chat; page the on-call engineer; status updates every 30 minutes until mitigated. A blameless post-mortem is mandatory for S1 and recommended for S2; published in `docs/operations/` within 5 business days.

For data-exposure events that touch client-portal users, the Security Lead and Legal must be looped in immediately to scope external notification obligations.

---

## 11. Known Gaps & Open Items

| Item | Disposition |
|---|---|
| **No SSO / OIDC.** Auth is a `x-user-role` header today. | Roadmap LATER (doc 10). Mitigation: deployment front door + role switcher + audit log. |
| **GET routes do not row-filter by role.** Viewer / Consultant see all rows. | Backlog. Audit'd 2026-04-23 as High, accepted (codebase-wide pattern). |
| **No 2FA.** | Out of scope for header-based model; will land with SSO. |
| **No data-residency choice.** | Single Replit-hosted region; documented and accepted. |
| **No SOC 2 audit.** | Not pursued for an internal platform; reviewed at every charter version (doc 16). |
| **Replacement Requests not blocked server-side for auto-allocate projects.** | Backlog (Medium) per the 2026-04-23 audit. |

---

## 12. Compliance Posture (Internal)

BusinessNow PSA is an internal system at KSAP Technology. It is **not** marketed as SOC 2-compliant, GDPR-compliant for external data subjects, or HIPAA-compliant. Where KSAP's parent obligations require specific controls (e.g. PII handling for client-portal contacts), those controls are documented in this doc (§3, §4, §6) and reviewed at the cadence in doc index §3.

KSAP's internal audit team reviews this document annually and signs off on the §10 incident-response readiness.

---

## 13. Security Review Checklist (per release)

- [ ] No new write route without the right `require*` middleware.
- [ ] Every new write route emits a `logAudit()` entry.
- [ ] `authHeaders()` used at every new SPA call-site (no hardcoded `x-user-role` strings).
- [ ] No secrets in code; all env vars provisioned via the secrets skill.
- [ ] Dependency scan green or new findings triaged.
- [ ] SAST scan run if the change touches auth, RBAC, or a new write surface.
- [ ] Audit log readable by Admin for the new entity types.
- [ ] No new GET endpoint that exposes financial or PII data without a role gate.

---

## 14. Revision Log

| Date | Version | Changed By | What Changed |
|---|---|---|---|
| 2026-04-24 | 1.0 | Security Lead | Replaced template with the real, honest BusinessNow PSA security & compliance posture: header-based auth, RBAC roles, audit-log instrumentation, known gaps, internal-platform compliance scope. |
