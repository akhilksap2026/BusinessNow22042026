# BusinessNow PSA — UI/UX Audit (April 2026)

## Executive summary

The product is functionally broad — Dashboard, Projects, Accounts, Prospects, Opportunities, Time, Resources, Finance, Reports, Admin, and a client Portal — and the visual language is internally consistent enough that the app already feels like one product. The biggest issues are **(1) one critical runtime crash on the project detail route**, **(2) the whole interface is too large and too airy for a power-user PSA tool**, and **(3) headings, icons, navigation labels, and table affordances drift in small ways that add up to a "less polished than competitors (Rocketlane, Mavenlink)" feeling**.

Density and base scale are already covered by Task #2 (Increase density and reduce default UI scale) — this audit explicitly **does not duplicate** those recommendations. Instead it focuses on hierarchy, navigation, consistency, and usability findings that survive after density/scale lands.

Severity legend: **C** = Critical (broken or blocks usage), **H** = High (frequent friction), **M** = Medium (noticeable but workable), **L** = Low (polish).
Effort legend: **S** ≈ <2h, **M** ≈ half day, **L** ≈ 1+ day.

Notation: items tagged **[covered by #2]** will be resolved by the parallel density/scale task and are listed here only for traceability.

---

## 1. Visual hierarchy

How well the eye is led to what matters: page titles vs section titles, primary vs secondary actions, KPIs vs supporting numbers, headers vs rows.

| ID | Severity | Effort | Area | Finding | Evidence | Recommendation |
|----|----------|--------|------|---------|----------|----------------|
| VH-1 | H | S | Page headers (all pages) | Page titles render at `text-3xl font-bold` (~30px) — too large for a dense work tool, dwarfs the rest of the chrome and pushes content below the fold. | `dashboard.tsx:39`, `projects.tsx`, `finance.tsx:249`, `accounts.tsx:158`, `time.tsx:271`, `project-detail.tsx:443`, `notifications.tsx:78` | Drop page title to `text-2xl` (or rely on the new root font-size from Task #2). Reserve `text-3xl` for landing-style screens only. |
| VH-2 | M | S | KPI cards (Dashboard, Project Detail, Finance, Reports) | KPI numbers and section titles use the same weight/size in different places: `text-2xl font-bold` on Dashboard cards, `text-3xl font-bold` on Reports cards, `text-xl font-bold` on Project Detail finance cards, `text-2xl font-bold` on project-detail health cards. Same primitive, four sizes. | `dashboard.tsx:60-120`, `reports.tsx`, `project-detail.tsx:472-562,897-933,1103`, `finance.tsx:267` | Define a single "stat-value" type token (one for primary KPI, one for sub-stat) and apply consistently across all KPI cards. |
| VH-3 | M | S | KPI cards | Card labels ("Active Projects", "Total Revenue", etc.) are bolded at base size; KPI value below is also bold — both compete for attention. | `dashboard.tsx`, `finance.tsx`, `reports.tsx` | Make the label `text-xs uppercase tracking-wide text-muted-foreground` and let the numeric value carry the weight. Standard pattern across Linear, Rocketlane, Stripe dashboards. |
| VH-4 | M | M | Table headers | Column headers are the same weight as cell content (`text-muted-foreground` only) on most tables, so eye doesn't catch the header band. Also column header text wraps awkwardly ("Tracked Min", "Billable Min", "Days Planned" wrap onto 2 lines on Projects/Reports). | `projects.tsx`, `reports.tsx`, `resources.tsx:355` | Add `text-xs font-medium uppercase tracking-wide` to `TableHead`, set `whitespace-nowrap` by default, and use full words ("Tracked Hours" not "Tracked Min" if the value is in minutes — it's currently labeled "Min" but values are 4-5 digit numbers, suggesting the unit/label mismatch needs fixing too). |
| VH-5 | M | S | Page chrome | "+ New Project", "+ Create Invoice", "+ New Account", "+ Add User" primary actions are the right pattern, but they sit alone on a row — the title row is title-left / action-right with empty middle. On Dashboard there's no breadcrumb or context line under the title; on Project Detail the title carries no status pill until far below. | All page headers | Add a subtitle/description line under each page title (e.g. "11 active projects · 3 at risk" on Projects) to make the header band do real work. |
| VH-6 | M | M | Resource Capacity table | "Skills" column shows 3 colored dots + names per row, while every other column is text — visual weight is unbalanced; the eye lands on dots before names. | `resources.tsx` (Capacity tab) | Truncate to top-2 skills + "+N more" pill, or move skills to a hover/expand row. Also align utilization bar visually with capacity column. |
| VH-7 | L | S | Dashboard "Recent Activity" | Activity items use the same bold weight on the actor word ("System") as on the meaningful nouns; readability suffers because nothing stands out. | `dashboard.tsx` Recent Activity card | Bold the entity that changed (project name, person), normal-weight everything else. |
| VH-8 | L | S | Sidebar | All nav items are visually equal. There's no separation between core work surfaces (Dashboard/Projects/Time) and lower-traffic ones (Reports/Admin). | `layout.tsx` sidebar | Add a thin divider + small section label ("Workspace" / "Admin") to group nav items. |

---

## 2. Navigation

How well users move between surfaces, find their place, and recover from dead ends.

| ID | Severity | Effort | Area | Finding | Evidence | Recommendation |
|----|----------|--------|------|---------|----------|----------------|
| NV-1 | H | S | Sidebar nav routing | The sidebar item labelled **"Time Tracking"** routes to `/time`, not `/time-tracking` — this isn't visible to users but means deep links and external bookmarks built on the visible label fail (a 404). | `App.tsx:49` (`<Route path="/time">`), sidebar label "Time Tracking" | Add an alias route `/time-tracking → /time` (or rename the route to `/time-tracking` and redirect `/time`). Same low-cost robustness fix worth doing for `/admin` / `/admin-settings` if naming drifts. |
| NV-2 | H | M | Project Detail | No breadcrumb. After clicking into a project, the only way back is the browser Back button or sidebar → Projects (which discards filter/scroll state on the list). | `project-detail.tsx` header | Add `Projects / {project.name}` breadcrumb above the project title. Make the "Projects" segment a real link. |
| NV-3 | M | S | Tab strips (Resources, Reports, Admin, Project Detail) | Tab strips wrap onto 2 rows once the count exceeds ~8 (visible on Reports: "Performance, Capacity Planning, Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health" wraps to a second line). The wrap point is unstable (depends on viewport) and pushes content jarringly. | `reports.tsx` tab list, also `admin.tsx` (Users, Project Templates, Skills Matrix, Tax Codes, Time Categories, Time Settings, Holiday Calendars, …) | Either (a) horizontally-scrollable tab strip with a leading/trailing fade indicator and arrow buttons, or (b) overflow tabs into a "More ▾" menu after N visible. Don't let them wrap. |
| NV-4 | M | M | Empty / loading states | Finance shows four ghost-bar rows for invoices and four empty KPI cards with no numbers when nothing matches the project filter. Looks like a broken page, not "no data". | `finance.tsx` Invoices tab with no project selected | Replace ghost rows with an explicit empty state: icon + "No invoices yet" + "Create Invoice" CTA. Only show skeletons during a real loading state. |
| NV-5 | M | S | 404 page | The 404 says *"Did you forget to add the page to the router?"* — that's a developer hint, not a user message, and it appears on real broken routes (e.g. mistyped sidebar paths above). | `not-found.tsx:11-20` | "We couldn't find that page" + a button back to Dashboard. Keep the dev hint behind `NODE_ENV !== "production"` or remove it. |
| NV-6 | M | S | Sidebar active state | Active nav item is high-contrast indigo (`bg-indigo-600 text-white`). Works, but there's no hover affordance on inactive items beyond a faint background — looks identical to disabled. | `layout.tsx` sidebar items | Add a subtle hover background and a 2px left border accent on active item to match common patterns (Linear, Notion). |
| NV-7 | L | S | Notifications badge | "9+" badge on the bell looks alarming on every page load. No way to mark all as read from the badge. | Top-right of layout | Cap at "99+", and add "Mark all read" inside the popover. |
| NV-8 | L | M | Saved Views entry point | "All items" dropdown + "Filters" button on Projects/Resources pages reads as two unrelated controls; users won't connect "saving the current filters" with the dropdown. | `projects.tsx`, `resources.tsx` | Merge into a single "View: {name} ▾" control with a clear "Save current filters as view…" item in the menu. Sprint 14 shipped the feature; the entry point still under-discloses it. |

---

## 3. Consistency

Same primitive, same look, same behavior — across all pages.

| ID | Severity | Effort | Area | Finding | Evidence | Recommendation |
|----|----------|--------|------|---------|----------|----------------|
| CN-1 | H | M | Card padding | Top-level page wrappers and cards use a mix of `p-6`, `p-8`, and ad-hoc `px-6 py-4`. Card primitive itself uses `p-6` for header/content/footer everywhere. **[partly covered by #2]** | `card.tsx`, `portal-project.tsx:191-193`, plus 30+ instances of `p-6/space-y-6/gap-6` in `pages/` | Task #2 will land the new spacing tokens. Audit ask: also rewrite the hand-rolled `px-6 py-4` blocks in `portal*.tsx` and `project-detail.tsx` finance cards to use the `Card`/`CardContent` primitive so they get the new tokens automatically. |
| CN-2 | H | M | Icon sizing | Icons appear at `h-4 w-4`, `h-5 w-5`, `h-6 w-6` interchangeably. Sidebar icons are `h-5`, KPI card icons are `h-4`, dashboard activity icons are `h-5`, table action `…` is unstyled. | Sidebar `layout.tsx`, KPI cards `dashboard.tsx`, activity `dashboard.tsx`, tables across `projects/accounts/admin` | Pick two sizes — `h-4 w-4` for inline/text-aligned, `h-5 w-5` for nav and decorative — and apply globally. |
| CN-3 | H | S | Status pill colors | Status badges use different hue mappings on different pages: "Active" is green-tinted on Accounts/Admin, but "On Track" is also green on Reports; "At Risk" is red on Accounts but amber on Projects health filters; "Completed" is green on Reports but a neutral pill on Projects status filter. | Accounts list, Admin user list, Projects filter chips, Reports table | Define a single `<StatusBadge variant="success|warning|danger|neutral|info">` and route every domain status (account status, project health, invoice status, allocation status) through it with documented mappings. |
| CN-4 | M | S | Filter chip strip vs button strip | Projects page has two adjacent strips — status filter chips (rounded-full pills) and health filter chips (also rounded-full pills) — but they aren't visually grouped or labeled, so users can't tell they're independent filters. | `projects.tsx` filter strip near top | Add a small leading label ("Status:" / "Health:") OR put them in two separate rows with a divider. |
| CN-5 | M | S | "—" vs "0" vs blank vs "N/A" | Projects table shows "—" for missing Company Name, missing Tracked Min sometimes shows `0` and sometimes blank, missing Billable Min shows "—". Reports table shows "—" for missing CSAT but the Tasks column shows "5" for non-template count below. Inconsistent missing-value handling. | `projects.tsx` table cells, `reports.tsx` table cells | Establish house style: `—` (em-dash) for unknown/null, `0` only when the real value is zero. Apply via a small `<NullCell />` helper. |
| CN-6 | M | S | Currency formatting | `$1,250,000` (Accounts) vs `$1,043,500` (Dashboard) vs `12,600` raw integer (Projects "Tracked Min" column) vs `$80/hr` (Admin) vs `$ 440,000 outstanding` (Dashboard subtitle). Mix of unit suffixes, raw ints, and per-rate. | Accounts list, Admin list, Dashboard cards | Add a `formatCurrency(value, { compact?: true })` helper and an `abbreviate(n)` for >$1M displays ("$1.25M"). Use compact display in narrow KPI cards. |
| CN-7 | M | S | Date formatting | Activity feed shows "4/23/2026" (US numeric); other surfaces use "207d" durations; Reports uses "196d" / "207d"; no localized "Apr 23, 2026" anywhere. Mixed registers. | `dashboard.tsx` activity, `reports.tsx` "Days Planned" column | One `formatDate(value, { variant: "short" \| "long" \| "relative" })` helper. Prefer "Apr 23, 2026" in feeds and tables. |
| CN-8 | L | S | Button heights | `button.tsx` declares h-9/h-10/h-8 variants, but pages that hand-roll `<button className="…">` skip the primitive and look slightly off. **[covered by #2 sweep]** | `button.tsx`, ad-hoc buttons in `portal*.tsx` | After Task #2, sweep for `<button className=` (raw HTML buttons) and migrate to `<Button>`. |
| CN-9 | L | S | Avatars | Avatar primitive is used on Admin user list, but Resources Capacity tab uses raw `<div>` initials with custom styling. | `admin.tsx` rows vs `resources.tsx:380` rows | Use `<Avatar>` primitive everywhere; deduplicate the initials-from-name helper. |
| CN-10 | L | S | "$" affix on KPI | Dashboard KPI cards label "Total Revenue" with a $ icon in the corner *and* prefix the value with "$" — duplicate currency signal. | `dashboard.tsx:80` | Drop the corner $ icon when the value already shows the currency symbol. |

---

## 4. Usability

Friction during real tasks: search, scan, click, recover.

| ID | Severity | Effort | Area | Finding | Evidence | Recommendation |
|----|----------|--------|------|---------|----------|----------------|
| **US-1** | **C** | **S** | **Project detail page crashes on load** | Navigating to any `/projects/:id` throws `ReferenceError: Cannot access 'users' before initialization` because `users` is read at line 194 but declared at line 408 (TDZ). The whole page is unreachable; this blocks deep links from Dashboard/Reports/Search. | `project-detail.tsx:194` reads `users`, declared at `project-detail.tsx:408` (`const { data: users } = useListUsers()`) | Move the `useListUsers()` hook above the `resReqMatches` derivation, OR move the `resReqMatches` computation into the dialog component where it's actually used. Verify via screenshot of `/projects/1`. **Critical — fix before any density work merges.** |
| US-2 | H | M | Resource search vs filters | Resources page has Search, Department filter, Saved Views ("All items"), and a "Filters" button — four controls that interact in unobvious ways (does the Department filter persist through saved views? Does search filter inside a view?). No visible chips show what's currently filtering. | `resources.tsx` Capacity tab top bar | Show active-filter chips below the search bar with ✕ to clear individually, plus a "Clear all" link. Standard pattern; eliminates "why am I seeing only 4 of 11 people?" confusion. |
| US-3 | H | S | Table affordance | Project rows in Projects list are clickable (the project name is a link, but the rest of the row is not), and there's no hover indicator that the row leads anywhere. Users will click whitespace and nothing happens. | `projects.tsx` table rows | Make the entire row a link target (with `cursor-pointer hover:bg-muted/50`, already on `TableRow`). Keep the project-name text link styled distinctly for keyboard users. |
| US-4 | H | S | Test/automation hooks missing | Zero `data-testid` and zero `aria-label` attributes across `pages/`. This blocks both end-to-end testing and screen-reader usage on every interactive control without text. | `grep data-testid` → 0 matches, `grep aria-label` → 0 matches, both in `pages/` | Add `data-testid` to every interactive primitive in shared UI components (Button, Input, Select, TableRow when clickable) and add `aria-label` to icon-only buttons (the row `…` menu, the bell, the avatar menu). One pass through `components/ui/`. |
| US-5 | M | S | Keyboard focus | Active focus rings are inherited from shadcn defaults but contrast is low on the indigo primary buttons against the indigo sidebar background. Dialogs trap focus correctly but the outer modal backdrop sometimes catches click without closing. | All pages | Bump `--ring` opacity/width by one notch; verify focus ring is ≥2px and visible on every interactive element including TableRow and Card when made clickable. |
| US-6 | M | S | "Show Archived" toggle on Projects | Renders as a button with "Show Archived" text always visible, no indication of current state. Users won't know if archived projects are currently being shown unless they remember clicking. | `projects.tsx` header | Make it a toggle (`Switch` or `Toggle` variant) so its state is visible; OR change the label to "Show Archived (3)" / "Hide Archived" depending on state. |
| US-7 | M | M | Filter chip multi-select discoverability | Status chips on Projects ("All / Not Started / In Progress / At Risk / Completed") look mutually exclusive (radio-like) but Health chips next to them ("All Health / On Track / At Risk / Off Track") look the same — no signal that one accepts multi-select and the other doesn't, or vice versa. | `projects.tsx` filter strip | Either commit to single-select chips (radio behavior) or visually distinguish multi-select chips with a check mark when active. Document the rule. |
| US-8 | M | M | Bulk actions missing | Tables across the app (Projects, Accounts, Admin Users, Invoices) have row-level menus but no checkbox column for bulk operations (bulk archive, bulk export, bulk reassign). Common PSA workflow. | All list tables | Add an opt-in `selectable` prop to a wrapped Table component and a sticky bulk-action bar that appears when ≥1 row is selected. |
| US-9 | M | S | Search inputs | Each table has its own search input but with subtly different placeholder text and width: "Search projects…" full-width, "Search accounts…" right-aligned in a different card layout, "Search by name, role, or skill…" wide on Resources. | `projects.tsx`, `accounts.tsx`, `resources.tsx` | Standardize on a `<TableSearch placeholder="Search…" />` component, left-aligned at the table's leading edge, with consistent width and a leading icon. |
| US-10 | M | M | Dialog / form length | Dialogs on Project Detail (Create Resource Request, Edit Allocation, etc.) are tall and stack ~10 fields without grouping or step indicators. | `project-detail.tsx` dialogs | Group long forms into logical sections (with `<h3>` separators) or split into a 2-step flow when ≥8 fields. |
| US-11 | M | S | Error messages | Browser console shows several `403` and `500` errors during normal page loads (Dashboard, Projects, Finance, Admin, Reports) but the UI never surfaces them — sections silently render empty or stale. | Browser console logs from screenshot tour, multiple `403/500` on `/`, `/projects`, `/finance`, `/admin`, `/reports` | Add a top-of-page error toast or inline "Couldn't load X — Retry" banner when a critical query fails, instead of silently rendering empty state that's indistinguishable from "no data". |
| US-12 | L | S | Tooltips | Icon-only controls (the row `…` menu, top-bar bell, sidebar collapse if present) have no `title` or tooltip. | All pages | Add a tooltip primitive wrapper for icon-only buttons and use it consistently. |
| US-13 | L | M | Long text truncation | Project descriptions are truncated mid-word with `…` (Projects table "Description" column shows "Migrate Dallas DC from Oracle …", "Design and implement AI route …"). No tooltip on hover to see full text. | `projects.tsx` "Description" column | Wrap truncated cells in a tooltip showing full content on hover. |
| US-14 | L | S | Sidebar collapse | No way to collapse the sidebar to icons-only. On smaller laptops the 256px sidebar consumes significant horizontal space. | `layout.tsx` sidebar | Add a collapse toggle that switches sidebar to ~56px icon rail (with tooltips on hover). |

---

## 5. Cross-cutting patterns

These show up repeatedly and are best fixed once instead of per-page:

1. **Token sprawl in spacing/typography/icons** → Tasks #2 fixes spacing/density. Add as a follow-up: a one-pass codification of icon size and font-size scales, with lint or convention to keep them stable.
2. **Status semantics scattered across pages** (CN-3) → A single `StatusBadge` + a domain → variant map.
3. **Number/date/currency formatters re-implemented inline** (CN-5, CN-6, CN-7) → A small `lib/format.ts` with `formatCurrency`, `formatDate`, `formatDuration`, `nullCell`.
4. **Tab strips that wrap** (NV-3) → A reusable `<ScrollableTabs>` component.
5. **Test and accessibility hooks missing everywhere** (US-4) → One mechanical pass through `components/ui/` to add `data-testid` and `aria-label` props consistently.
6. **Silent failures on backend errors** (US-11) → A global `useQuery` error boundary or toaster wired to the query client.

---

## 6. Prioritized fix list

Ordered by impact-vs-effort. Items already covered by Task #2 (Increase density and reduce default UI scale) are listed in section 6.4 separately for traceability and **should not be re-implemented** as part of audit follow-up work.

### 6.1 Critical — fix immediately

| ID | Title | Effort |
|----|-------|--------|
| US-1 | Project detail page crashes — `users` referenced before init | S |

### 6.2 Quick wins (high impact, ≤ half day each)

| ID | Title | Effort |
|----|-------|--------|
| NV-1 | Add `/time-tracking` route alias (label/route mismatch) | S |
| NV-5 | Replace developer-facing 404 message with a user-friendly one | S |
| US-3 | Make Projects table rows clickable (whole row, not just name) | S |
| US-6 | "Show Archived" toggle reflects current state | S |
| VH-1 | Drop page titles from `text-3xl` to `text-2xl` | S |
| VH-3 | Standardize KPI card label vs value typography | S |
| CN-3 | Single `StatusBadge` component with documented variant map | S |
| CN-5 | Adopt `—` for null cells consistently (small `<NullCell />`) | S |
| US-12 | Tooltips on all icon-only controls | S |

### 6.3 Medium-impact follow-ups

| ID | Title | Effort |
|----|-------|--------|
| NV-2 | Breadcrumb on Project Detail | M |
| NV-3 | Scrollable / overflow-aware tab strips on Reports & Admin | S |
| NV-4 | Real empty states on Finance (replace ghost-bar placeholders) | S |
| NV-8 | Merge "Saved Views" + "Filters" entry into one labeled control | M |
| US-2 | Active-filter chips on Resources (and other list pages) | M |
| US-4 | Add `data-testid` and `aria-label` across `components/ui/` | S |
| US-11 | Surface backend errors via toast / inline banner | S |
| CN-2 | Standardize icon sizes to 2 values (h-4, h-5) | M |
| CN-6 | `formatCurrency` + abbreviation for >$1M | S |
| CN-7 | `formatDate` helper, prefer "Apr 23, 2026" | S |
| VH-2 | Standardize KPI value typography across all dashboards | S |
| VH-4 | Style `TableHead` (uppercase, nowrap, weight) | M |

### 6.4 Backlog — already covered by Task #2 (do not re-do)

| ID | Title | Owner |
|----|-------|-------|
| CN-1 | Card padding `p-6` → tighter density | Task #2 step 2 |
| CN-8 | Button heights tightened with new tokens | Task #2 step 2 |
| (general) | Root font-size 14px, smaller radius, flatter shadows | Task #2 step 1 |
| (general) | Layout shell, sidebar, page-wrapper padding sweep | Task #2 steps 3 & 4 |

### 6.5 Larger / longer-term

| ID | Title | Effort |
|----|-------|--------|
| US-8 | Bulk row actions across list tables (selection + sticky action bar) | L |
| US-10 | Dialog form grouping / step indicators on long forms | M |
| US-13 | Tooltip-on-truncate component used in dense tables | M |
| US-14 | Sidebar collapse to icon rail | M |
| VH-6 | Resource Capacity skills column rebalance | M |
| VH-8 | Sidebar grouping (Workspace / Admin sections) | S |

---

## 7. Surfaces toured for this audit

- `/` Dashboard
- `/projects` Projects list
- `/projects/:id` Project Detail (**did not load — see US-1**)
- `/accounts` Client Accounts
- `/resources` Team Resources (Capacity tab)
- `/finance` Finance & Invoicing
- `/reports` Reports (Performance tab)
- `/admin` Admin Settings (Users → User Management)
- `/notifications` (heading reviewed via grep)
- `/portal/*` (reviewed via code only — typography & spacing patterns)

The audit did not exhaustively click every sub-tab inside Resources (Heat Map, Projects Timeline, People Timeline, Resource Requests, Skills Matrix), Reports (Capacity Planning, Operations, CSAT Trend, Interval IQ, Budget vs Actuals, Burn-Down, Revenue, Utilization, Project Health), or Admin (Project Templates, Skills Matrix, Tax Codes, Time Categories, Time Settings, Holiday Calendars). Findings here are based on the Capacity / Performance / Users views plus pattern inspection of the underlying components. Most cross-cutting recommendations apply uniformly.
