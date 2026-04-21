import { useEffect, useRef, useState } from "react";

const MERMAID_CDN = "https://esm.sh/mermaid@11/dist/mermaid.esm.min.mjs";

const ERD_DEFINITION = `erDiagram
  PROSPECT ||--|| ACCOUNT : "converts to"
  ACCOUNT ||--o{ OPPORTUNITY : "generates"
  OPPORTUNITY ||--o| PROJECT : "creates on win"
  ACCOUNT ||--o{ PROJECT : "owns"
  ACCOUNT ||--o| RATE_CARD : "has"
  RATE_CARD ||--o{ PROJECT : "applied to"
  USER ||--o| ROLE : "has"
  USER ||--o{ SKILL : "has"
  USER ||--o{ ALLOCATION : "assigned via"
  PROJECT ||--o{ ALLOCATION : "has"
  PROJECT ||--o{ PHASE : "has"
  PHASE ||--o{ TASK : "contains"
  TASK ||--o{ TASK_ASSIGNEE : "assigned"
  USER ||--o{ TASK_ASSIGNEE : "works on"
  USER ||--o{ TIME_ENTRY : "logs"
  PROJECT ||--o{ TIME_ENTRY : "tracked in"
  PROJECT ||--o{ INVOICE : "billed via"
  ACCOUNT ||--o{ INVOICE : "billed to"
  PROJECT ||--o{ CSAT : "rated in"
  PROJECT ||--o{ NOTIFICATION : "triggers"

  PROSPECT {
    int id PK
    string name
    string contactName
    string email
    string status
    string source
    decimal estimatedValue
  }
  ACCOUNT {
    int id PK
    string name
    string domain
    string tier
    string status
    decimal contractValue
  }
  OPPORTUNITY {
    int id PK
    int accountId FK
    string name
    string stage
    decimal value
    float probability
    date closeDate
  }
  PROJECT {
    int id PK
    int accountId FK
    string name
    string status
    string health
    decimal budget
    bool isInternal
    date startDate
    date endDate
  }
  PHASE {
    int id PK
    int projectId FK
    string name
    string status
    date startDate
    date dueDate
  }
  TASK {
    int id PK
    int projectId FK
    int phaseId FK
    string name
    string status
    string priority
    bool isMilestone
    bool billable
    int effort
    date dueDate
  }
  TASK_ASSIGNEE {
    int taskId FK
    int userId FK
  }
  USER {
    int id PK
    string name
    string email
    string role
    string department
    int capacityHours
  }
  ROLE {
    int id PK
    string name
    string department
    decimal defaultRate
  }
  SKILL {
    int id PK
    int userId FK
    int skillId FK
    string level
  }
  ALLOCATION {
    int id PK
    int projectId FK
    int userId FK
    int allocatedHours
    decimal hourlyRate
    date startDate
    date endDate
  }
  RATE_CARD {
    int id PK
    string name
    bool isDefault
    date effectiveDate
  }
  TIME_ENTRY {
    int id PK
    int projectId FK
    int userId FK
    date date
    float hours
    string description
    bool billable
    string approvalStatus
  }
  INVOICE {
    text id PK
    int projectId FK
    int accountId FK
    string status
    date issueDate
    date dueDate
    decimal total
    decimal tax
  }
  CSAT {
    int id PK
    int projectId FK
    string submittedBy
    int rating
    string feedback
    date submittedAt
  }
  NOTIFICATION {
    int id PK
    int userId FK
    int projectId FK
    string type
    string message
    bool read
    timestamp timestamp
  }
`;

const COVERAGE_ITEMS = [
  { label: "Prospect → Account conversion", status: "covered", note: "'Convert to Customer' action" },
  { label: "Account → Opportunity pipeline", status: "added", note: "6-stage Kanban pipeline" },
  { label: "Opportunity → Project (on win)", status: "added", note: "'Create Project' from Won opportunity" },
  { label: "Account owns Projects", status: "covered", note: "Direct FK link" },
  { label: "Rate Card applied to Project", status: "partial", note: "Global rate cards; per-account inheritance not enforced" },
  { label: "User (Resource) → Allocation", status: "covered", note: "Allocations tab in project detail" },
  { label: "Project → Phase → Task hierarchy", status: "added", note: "Extra Phase layer vs reference ERD" },
  { label: "Task assigned to Users", status: "covered", note: "assigneeIds array (Task_Assignee junction)" },
  { label: "Time Entry per User + Project", status: "covered", note: "Log Time dialog; stopwatch; approval workflow" },
  { label: "Task-level time linkage", status: "partial", note: "Time entries carry projectId/userId; no per-task junction" },
  { label: "Invoice (billing)", status: "added", note: "Invoice + Billing Schedules + Revenue Recognition" },
  { label: "CSAT per Project", status: "added", note: "CSAT tab with star ratings + feedback" },
  { label: "Notifications", status: "added", note: "Real-time bell popover with mark-read" },
  { label: "User Skills matrix", status: "added", note: "Skills Library + per-user skills in Admin" },
  { label: "Role taxonomy for resources", status: "covered", note: "8-role taxonomy; role field on User" },
];

const STATUS_CONFIG = {
  covered: { label: "✅ Covered", bg: "bg-emerald-50", border: "border-emerald-200", dot: "bg-emerald-500", text: "text-emerald-700" },
  added: { label: "➕ Extended", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", text: "text-blue-700" },
  partial: { label: "⚠️ Partial", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-400", text: "text-amber-700" },
};

export function BusinessNowERD() {
  const erdRef = useRef<HTMLDivElement>(null);
  const [rendered, setRendered] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function render() {
      try {
        const mod = await import(/* @vite-ignore */ MERMAID_CDN);
        const mermaid = mod.default;
        const dark = matchMedia("(prefers-color-scheme: dark)").matches;
        mermaid.initialize({
          startOnLoad: false,
          theme: "base",
          fontFamily: "Inter, system-ui, sans-serif",
          themeVariables: {
            darkMode: dark,
            fontSize: "11px",
            lineColor: dark ? "#9c9a92" : "#73726c",
            textColor: dark ? "#c2c0b6" : "#3d3d3a",
            primaryColor: dark ? "#1e1b4b" : "#eef2ff",
            primaryBorderColor: dark ? "#4f46e5" : "#6366f1",
            primaryTextColor: dark ? "#e0e7ff" : "#312e81",
          },
        });
        const { svg } = await mermaid.render("erd-svg-bn", ERD_DEFINITION);
        if (!cancelled && erdRef.current) {
          erdRef.current.innerHTML = svg;
          setRendered(true);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to render diagram");
      }
    }
    render();
    return () => { cancelled = true; };
  }, []);

  const covered = COVERAGE_ITEMS.filter(i => i.status === "covered").length;
  const added = COVERAGE_ITEMS.filter(i => i.status === "added").length;
  const partial = COVERAGE_ITEMS.filter(i => i.status === "partial").length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">BusinessNow PSA — Entity Relationship Diagram</h1>
            <p className="text-sm text-slate-500 mt-1">Full data model across all modules • Validated against reference ERD</p>
          </div>
          <div className="flex gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              {covered} Covered
            </span>
            <span className="flex items-center gap-1.5 text-blue-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              {added} Extended
            </span>
            <span className="flex items-center gap-1.5 text-amber-700 font-medium">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              {partial} Partial
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-6 grid grid-cols-3 gap-6">
        {/* ERD Diagram — takes 2/3 */}
        <div className="col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
            <span className="text-sm font-semibold text-slate-700">Entity Relationship Diagram</span>
          </div>
          <div className="p-4 overflow-auto max-h-[640px]">
            {error ? (
              <div className="text-red-500 text-sm p-4">{error}</div>
            ) : (
              <div
                ref={erdRef}
                className="flex items-start justify-center"
                style={{ minHeight: 400, opacity: rendered ? 1 : 0, transition: "opacity 0.3s" }}
              />
            )}
            {!rendered && !error && (
              <div className="flex items-center justify-center h-64 text-slate-400 text-sm gap-2">
                <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                </svg>
                Rendering ERD…
              </div>
            )}
          </div>
        </div>

        {/* Coverage Panel — 1/3 */}
        <div className="flex flex-col gap-3">
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">Reference ERD Validation</h2>
            <p className="text-xs text-slate-500 mb-4">How BusinessNow maps to the reference PSA flow (Prospect → Customer → Project → Resource → Task → Time)</p>
            <div className="space-y-2">
              {COVERAGE_ITEMS.map((item, i) => {
                const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG];
                return (
                  <div key={i} className={`rounded-lg border px-3 py-2 ${cfg.bg} ${cfg.border}`}>
                    <div className="flex items-start gap-2">
                      <span className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
                      <div>
                        <p className={`text-xs font-semibold leading-tight ${cfg.text}`}>{item.label}</p>
                        <p className="text-xs text-slate-500 leading-snug mt-0.5">{item.note}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Key Differences */}
          <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 text-xs text-indigo-800">
            <p className="font-semibold mb-2 text-sm">Key differences vs reference</p>
            <ul className="space-y-1.5 list-disc list-inside text-indigo-700">
              <li>Phase layer between Project and Task</li>
              <li>Opportunity → Project creation on stage win</li>
              <li>Invoice + Billing Schedules + Revenue Recognition</li>
              <li>CSAT feedback per project</li>
              <li>Notification system with mark-read</li>
              <li>Time entries at project level (not task junction)</li>
              <li>Skill library + per-user skill matrix</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
