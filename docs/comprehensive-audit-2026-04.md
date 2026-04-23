# Comprehensive Audit — Resource Management & Capacity Planning

Audit date: 2026-04-23.

## Section results

### Dual-Tab Architecture (Resources page)
| Item | Status | Evidence |
|---|---|---|
| Projects tab — project-centric view | PASS | `resource-timeline.tsx:338` (mode="projects") |
| People tab — person-centric view | PASS | `resource-timeline.tsx:379` (mode="people") |
| Both tabs share the same data source | PASS | `useListAllocations` |
| Tab toggle persists per session | FIXED | now stored in `localStorage["resources.activeTab"]` |

### Allocation Mechanics
All six items PASS. Four allocation methods, hard/soft styling, soft inclusion, ignore-soft toggle, auto-allocate, and split-time all functional.

### Placeholder System
| Item | Status | Notes |
|---|---|---|
| First-class entities with bars | PASS | `allocations.placeholderId` |
| Default placeholders cannot be renamed | PASS | `placeholders.ts:43` |
| User-created placeholders editable | PASS | |
| "Find Team Member" next to each placeholder | PARTIAL (Low) | Global Find Availability exists; per-row contextual entry not implemented |
| Replacement Requests disabled for auto-allocate projects | OPEN (Medium) | Not enforced server-side |

### Capacity Calculations
| Item | Status | Notes |
|---|---|---|
| Utilization formula incl. holidays + time-off | PASS | `allocations.ts:280` |
| FTE = hours / 40 | PASS | Standard week is 40 by convention; configurable later |
| 1 day off = -0.2 FTE | PASS | `dailyCap = capacity / 5` |
| **Archived projects excluded from capacity** | **FIXED** | `allocations.ts` now filters by `projects.deletedAt IS NULL` |
| Over-allocation red indicator | PASS | |

### Resource Request Workflow
All items PASS — six request types, approval gating, status visibility, forecasted-utilization preview, blocked→chat, auto-create on Fulfilled.

### Skills Matrix
All items PASS — configurable skill types, proficiency assignment, matrix view, skill+proficiency filters in Find Availability.

### Capacity Planning Report
| Item | Status | Notes |
|---|---|---|
| Demand vs Supply chart (FTE over time) | **FIXED — NEW** | `GET /api/reports/capacity-planning?weeks=N` + new tab in `pages/reports.tsx` |
| Available = Total − TimeOff − Holidays | PASS | Same formula as resource capacity |
| Assigned + Unassigned = Total Demand | **FIXED — NEW** | Demand split into named-user vs placeholder allocations |
| Role-level surplus / deficit | **FIXED — NEW** | "Role-level Surplus / Deficit" card on report tab |
| Max time range 1 year | PASS | Capped at 52 weeks |

### Template Integration
All items PASS. Audit's claim that template allocations don't carry over was a **false positive** — `projectTemplates.ts:642–696` does copy them, gated by `template.autoAllocate`, mapping `relativeStartDay` → absolute project dates and skipping inactive named users with warnings.

### Permission Matrix
| Item | Status | Notes |
|---|---|---|
| Admin full access | PASS | |
| Super User can approve | PASS | |
| PM raises requests, can't approve | PASS | `requirePM` gates writes |
| Team Member view-self-only | PARTIAL (High, accepted) | Many GET routes return all rows; consistent with the rest of the codebase's header-based auth model. Tracked as a backlog item — not a regression introduced by this work. |

## Gaps remaining (after this pass)

| Severity | Gap | Disposition |
|---|---|---|
| Critical | — | All resolved |
| High | Team Member row-level GET filters | Accepted; codebase-wide pattern; backlog |
| High | Unassigned demand surfaced in Resource Requests view (now in Capacity Planning report) | Resolved via report; in-page widget remains backlog |
| Medium | Replacement Requests not blocked for auto-allocate projects | Backlog |
| Low | Per-placeholder "Find Team Member" link | Backlog |
| Low | FTE hardcoded to 40h vs configurable | Backlog |

## Fixes applied in this pass

1. **`allocations.ts`** — `/resources/capacity` filters out allocations from soft-deleted (archived) projects via `projects.deletedAt IS NULL`. Imports `projectsTable`, `isNull`.
2. **`resources.tsx`** — Active tab persisted to `localStorage["resources.activeTab"]`.
3. **`reports.ts`** — New `GET /reports/capacity-planning?weeks=N` endpoint. Returns weekly buckets with `totalCapacityFTE`, `timeOffFTE`, `holidayFTE`, `availableFTE`, `assignedDemandFTE`, `unassignedDemandFTE`, `totalDemandFTE`, `surplusFTE`, and per-role `byRole[]`. Capped at 52 weeks. Excludes soft-deleted projects.
4. **`reports.tsx`** — New "Capacity Planning" tab with `ComposedChart` (Available area + stacked Assigned/Unassigned demand bars), horizon selector (4/8/12/26/52 weeks), CSV export, and role-level surplus/deficit table sorted worst-first.
