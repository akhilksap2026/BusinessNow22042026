#!/usr/bin/env node
"use strict";

const fs   = require("fs");
const path = require("path");
const sharp = require("sharp");
const HTMLtoDOCX = require("html-to-docx");

const OUT_DIR  = path.join(__dirname, "output");
const DOCX_OUT = path.join(OUT_DIR, "blueprint.docx");
const HTML_OUT = path.join(OUT_DIR, "blueprint.html");
const TMP_DIR  = path.join(OUT_DIR, "_bp_tmp");

if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

// ── SVG helpers ──────────────────────────────────────────────────────────────
function esc(s) { return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }
function trunc(s, n) { s = String(s); return s.length > n ? s.slice(0, n-1)+"…" : s; }

async function svgToDataUri(svgStr, label) {
  const buf = Buffer.from(svgStr, "utf8");
  const png = await sharp(buf, { density: 144 })
    .resize({ width: 1400, withoutEnlargement: true })
    .png().toBuffer();
  fs.writeFileSync(path.join(TMP_DIR, `${label}.png`), png);
  return `data:image/png;base64,${png.toString("base64")}`;
}

// ── Screen wireframe SVG ─────────────────────────────────────────────────────
function screenWireframe(title, zones, accent="#7c3aed") {
  const W=1100, H=520;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter,Arial,sans-serif">`;
  s+=`<rect width="${W}" height="${H}" fill="#f8fafc" rx="8"/>`;
  s+=`<rect x="0" y="0" width="${W}" height="46" fill="${accent}" rx="8"/>`;
  s+=`<rect x="0" y="38" width="${W}" height="8" fill="${accent}"/>`;
  s+=`<text x="18" y="30" fill="#fff" font-size="17" font-weight="700">${esc(title)}</text>`;
  let cx=14, cy=58;
  const gutter=10;
  zones.forEach((z,i)=>{
    const x=cx, y=cy, w=z.w||(W-28), h=z.h||60;
    const fill=z.fill||"#fff";
    s+=`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6" fill="${fill}" stroke="#e2e8f0" stroke-width="1.5"/>`;
    if(z.label){
      s+=`<text x="${x+12}" y="${y+22}" fill="${z.labelColor||accent}" font-size="12" font-weight="700">${esc(z.label)}</text>`;
    }
    if(z.lines){
      z.lines.forEach((l,li)=>{
        s+=`<text x="${x+12}" y="${y+38+li*18}" fill="#475569" font-size="11">${esc(trunc(l,110))}</text>`;
      });
    }
    if(z.cols){
      const cw=Math.floor((w-24)/z.cols.length);
      z.cols.forEach((col,ci)=>{
        const tx=x+12+ci*cw;
        s+=`<text x="${tx}" y="${y+18}" fill="${accent}" font-size="11" font-weight="700">${esc(col)}</text>`;
        for(let r=0;r<3;r++){
          s+=`<rect x="${tx}" y="${y+26+r*16}" width="${cw-10}" height="8" rx="3" fill="#e9d5ff"/>`;
        }
      });
    }
    if(z.pills){
      let px2=x+12;
      z.pills.forEach(p=>{
        const pw=p.length*7+20;
        s+=`<rect x="${px2}" y="${y+10}" width="${pw}" height="26" rx="13" fill="${accent}22" stroke="${accent}" stroke-width="1"/>`;
        s+=`<text x="${px2+pw/2}" y="${y+28}" fill="${accent}" font-size="11" font-weight="600" text-anchor="middle">${esc(p)}</text>`;
        px2+=pw+8;
      });
    }
    // next position: stack vertically unless z.inline
    if(!z.inline){ cy+=h+gutter; cx=14; }
    else { cx+=w+gutter; }
  });
  s+=`</svg>`;
  return s;
}

// ── RBAC table SVG ───────────────────────────────────────────────────────────
function rbacTableSvg(rows) {
  const COLS=["Permission","account_admin","super_user","collaborator","customer"];
  const CW=[380,120,120,120,120];
  const H=40+rows.length*34;
  const W=CW.reduce((a,b)=>a+b,0)+40;
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter,Arial,sans-serif">`;
  s+=`<rect width="${W}" height="${H}" fill="#fff"/>`;
  let ox=20;
  COLS.forEach((c,i)=>{
    s+=`<rect x="${ox}" y="4" width="${CW[i]}" height="32" rx="4" fill="#7c3aed"/>`;
    s+=`<text x="${ox+CW[i]/2}" y="24" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">${esc(c)}</text>`;
    ox+=CW[i];
  });
  rows.forEach((r,ri)=>{
    const y=40+ri*34;
    const bg=ri%2===0?"#faf5ff":"#ffffff";
    s+=`<rect x="20" y="${y}" width="${W-40}" height="34" fill="${bg}"/>`;
    let ox2=20;
    const vals=[r[0],...r[1]];
    vals.forEach((v,vi)=>{
      if(vi===0){
        s+=`<text x="${ox2+8}" y="${y+22}" fill="#1e293b" font-size="11">${esc(v)}</text>`;
      } else {
        const ok=v===true;
        s+=`<circle cx="${ox2+CW[vi]/2}" cy="${y+17}" r="10" fill="${ok?"#d1fae5":"#fee2e2"}"/>`;
        s+=`<text x="${ox2+CW[vi]/2}" y="${y+22}" fill="${ok?"#065f46":"#991b1b"}" font-size="14" font-weight="700" text-anchor="middle">${ok?"✓":"✗"}</text>`;
      }
      ox2+=CW[vi];
    });
  });
  s+=`</svg>`;
  return s;
}

// ── Nav flow SVG ─────────────────────────────────────────────────────────────
function navFlowSvg() {
  const W=1100, H=380;
  const accent="#7c3aed";
  const nodes=[
    {id:"login",label:"Login",x:50,y:170,w:110,h:50},
    {id:"dash",label:"Dashboard /",x:220,y:170,w:130,h:50},
    {id:"proj",label:"Projects /projects",x:420,y:60,w:175,h:50},
    {id:"projd",label:"Project Detail /projects/:id",x:660,y:60,w:210,h:50},
    {id:"acc",label:"Accounts /accounts",x:420,y:150,w:175,h:50},
    {id:"pros",label:"Prospects /prospects",x:420,y:220,w:175,h:50},
    {id:"opp",label:"Opportunities /opportunities",x:420,y:290,w:210,h:50},
    {id:"time",label:"Time /time",x:660,y:150,w:140,h:50},
    {id:"res",label:"Resources /resources",x:660,y:220,w:165,h:50},
    {id:"fin",label:"Finance /finance",x:660,y:290,w:140,h:50},
    {id:"rep",label:"Reports /reports",x:870,y:60,w:140,h:50},
    {id:"cmd",label:"Command Center /command-center",x:870,y:150,w:200,h:50},
    {id:"adm",label:"Admin /admin",x:870,y:220,w:130,h:50},
    {id:"notif",label:"Notifications /notifications",x:870,y:290,w:200,h:50},
  ];
  const edges=[
    ["login","dash"],["dash","proj"],["dash","acc"],["dash","pros"],["dash","opp"],
    ["dash","time"],["dash","res"],["dash","fin"],["proj","projd"],
    ["projd","rep"],["projd","cmd"],
  ];
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter,Arial,sans-serif">`;
  s+=`<defs><marker id="ar" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L8,3 z" fill="#94a3b8"/></marker></defs>`;
  s+=`<rect width="${W}" height="${H}" fill="#f8fafc"/>`;
  const map={};
  nodes.forEach(n=>map[n.id]=n);
  edges.forEach(([a,b])=>{
    const na=map[a],nb=map[b];
    if(!na||!nb)return;
    const x1=na.x+na.w,y1=na.y+na.h/2,x2=nb.x,y2=nb.y+nb.h/2;
    s+=`<path d="M${x1} ${y1} C${(x1+x2)/2} ${y1} ${(x1+x2)/2} ${y2} ${x2} ${y2}" stroke="#94a3b8" stroke-width="1.5" fill="none" marker-end="url(#ar)"/>`;
  });
  nodes.forEach(n=>{
    const fill=n.id==="login"?"#7c3aed":n.id==="dash"?"#5b21b6":"#fff";
    const txt=n.id==="login"||n.id==="dash"?"#fff":"#1e293b";
    s+=`<rect x="${n.x}" y="${n.y}" width="${n.w}" height="${n.h}" rx="8" fill="${fill}" stroke="${accent}" stroke-width="1.5"/>`;
    s+=`<text x="${n.x+n.w/2}" y="${n.y+n.h/2+5}" fill="${txt}" font-size="11" font-weight="600" text-anchor="middle">${esc(n.label)}</text>`;
  });
  s+=`</svg>`;
  return s;
}

// ── API endpoint table SVG ───────────────────────────────────────────────────
function apiTableSvg(rows) {
  const COLS=["Method","Endpoint","Auth","Description"];
  const CW=[90,280,160,410];
  const H=40+rows.length*34;
  const W=CW.reduce((a,b)=>a+b,0)+40;
  const methColor={GET:"#0ea5e9",POST:"#10b981",PATCH:"#f59e0b",DELETE:"#ef4444",PUT:"#8b5cf6"};
  let s=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="Inter,Arial,sans-serif">`;
  s+=`<rect width="${W}" height="${H}" fill="#fff"/>`;
  let ox=20;
  COLS.forEach((c,i)=>{
    s+=`<rect x="${ox}" y="4" width="${CW[i]}" height="32" rx="4" fill="#0f172a"/>`;
    s+=`<text x="${ox+CW[i]/2}" y="24" fill="#fff" font-size="12" font-weight="700" text-anchor="middle">${esc(c)}</text>`;
    ox+=CW[i];
  });
  rows.forEach((r,ri)=>{
    const y=40+ri*34;
    const bg=ri%2===0?"#f0f9ff":"#fff";
    s+=`<rect x="20" y="${y}" width="${W-40}" height="34" fill="${bg}"/>`;
    let ox2=20;
    r.forEach((v,vi)=>{
      if(vi===0){
        const mc=methColor[v]||"#64748b";
        s+=`<rect x="${ox2+4}" y="${y+6}" width="${CW[0]-10}" height="22" rx="4" fill="${mc}22" stroke="${mc}" stroke-width="1"/>`;
        s+=`<text x="${ox2+CW[0]/2}" y="${y+22}" fill="${mc}" font-size="11" font-weight="700" text-anchor="middle">${esc(v)}</text>`;
      } else {
        s+=`<text x="${ox2+6}" y="${y+22}" fill="${vi===1?"#7c3aed":"#475569"}" font-size="10.5" font-weight="${vi===1?600:400}">${esc(trunc(v,vi===3?70:40))}</text>`;
      }
      ox2+=CW[vi];
    });
  });
  s+=`</svg>`;
  return s;
}

// ── HTML Helpers ─────────────────────────────────────────────────────────────
function h1(t) { return `<h1>${t}</h1>`; }
function h2(t) { return `<h2>${t}</h2>`; }
function h3(t) { return `<h3>${t}</h3>`; }
function h4(t) { return `<h4>${t}</h4>`; }
function p(t)  { return `<p>${t}</p>`; }
function ul(items) { return `<ul>${items.map(i=>`<li>${i}</li>`).join("")}</ul>`; }
function img(uri, alt, maxW="100%") { return `<p><img src="${uri}" alt="${alt}" style="max-width:${maxW};border:1px solid #e2e8f0;border-radius:6px"/></p>`; }

function table(headers, rows, colWidths) {
  const thCells = headers.map((h,i)=>`<th style="background:#7c3aed;color:#fff;padding:8px 12px;font-size:12px;${colWidths?`width:${colWidths[i]}`:""}">${h}</th>`).join("");
  const trRows = rows.map((r,ri)=>{
    const tds = r.map(c=>`<td style="padding:7px 12px;font-size:11px;border-bottom:1px solid #f1f5f9">${c}</td>`).join("");
    return `<tr style="background:${ri%2===0?"#faf5ff":"#fff"}">${tds}</tr>`;
  }).join("");
  return `<table style="width:100%;border-collapse:collapse;margin:12px 0"><thead><tr>${thCells}</tr></thead><tbody>${trRows}</tbody></table>`;
}

function badge(text, color="#7c3aed") {
  return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;background:${color}22;color:${color};border:1px solid ${color};font-size:11px;font-weight:600">${text}</span>`;
}

function infoBox(title, items, color="#7c3aed") {
  const bg=color+"11"; const border=color+"44";
  return `<div style="border-left:4px solid ${color};background:${bg};border-radius:0 8px 8px 0;padding:12px 16px;margin:14px 0"><strong style="color:${color}">${title}</strong><ul style="margin:6px 0 0 0;padding-left:18px">${items.map(i=>`<li style="font-size:12px;margin-bottom:3px">${i}</li>`).join("")}</ul></div>`;
}

function sectionDivider(label) {
  return `<div style="margin:28px 0 16px 0;border-bottom:3px solid #7c3aed;padding-bottom:6px"><span style="background:#7c3aed;color:#fff;padding:4px 14px;border-radius:12px;font-size:13px;font-weight:700">${label}</span></div>`;
}

function fieldTable(fields) {
  return table(
    ["Field","Type","Required","Notes/Validation"],
    fields,
    ["25%","15%","10%","50%"]
  );
}

function apiRow(method, endpoint, auth, desc) { return [method, endpoint, auth, desc]; }

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
body{font-family:'Segoe UI',Inter,Arial,sans-serif;margin:0;padding:40px 52px;color:#0f172a;line-height:1.6;font-size:13px;background:#fff}
h1{font-size:26px;color:#7c3aed;margin:32px 0 8px 0;border-bottom:3px solid #7c3aed;padding-bottom:6px}
h2{font-size:20px;color:#5b21b6;margin:28px 0 6px 0}
h3{font-size:16px;color:#6d28d9;margin:20px 0 4px 0}
h4{font-size:13px;color:#7c3aed;margin:14px 0 3px 0;text-transform:uppercase;letter-spacing:.06em}
p{margin:6px 0 10px 0}
ul,ol{margin:6px 0;padding-left:22px}
li{margin-bottom:3px}
table{border-collapse:collapse;margin:10px 0;width:100%}
th,td{padding:7px 12px;border:1px solid #e2e8f0;font-size:12px;vertical-align:top}
th{background:#7c3aed;color:#fff;font-weight:700}
tr:nth-child(even){background:#faf5ff}
code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-size:11px;color:#7c3aed;font-family:monospace}
.cover{text-align:center;padding:80px 20px 60px 20px;background:linear-gradient(135deg,#7c3aed 0%,#5b21b6 100%);color:#fff;border-radius:12px;margin-bottom:40px}
.cover h1{color:#fff;border:none;font-size:34px}
.cover p{color:#e9d5ff;font-size:15px}
.toc-item{display:flex;align-items:center;padding:6px 0;border-bottom:1px dotted #e2e8f0;font-size:13px}
.toc-num{color:#7c3aed;font-weight:700;min-width:40px}
.page-break{page-break-before:always;break-before:page}
`;

// ═══════════════════════════════════════════════════════════════════════════
// MAIN BUILD
// ═══════════════════════════════════════════════════════════════════════════
async function main() {
  console.log("Building blueprint.docx …");

  // ── Pre-render all diagrams ───────────────────────────────────────────────
  const navFlowUri = await svgToDataUri(navFlowSvg(), "nav-flow");

  const loginWireUri = await svgToDataUri(screenWireframe("Login Screen", [
    { label:"BusinessNow PSA — Logo", h:70, fill:"#7c3aed11", lines:["Centred brand mark + tagline"] },
    { label:"Workspace Selector", h:60, lines:["Avatar grid: select a user persona (demo workspace)"] },
    { label:"Role Selector", h:60, lines:["4 roles: account_admin | super_user | collaborator | customer"] },
    { label:"'Sign in' CTA Button", h:52, fill:"#7c3aed22", lines:["Primary button — sets session, redirects to /"] },
  ]), "login-wire");

  const dashWireUri = await svgToDataUri(screenWireframe("Dashboard / Overview", [
    { label:"KPI Tile Row", h:80, cols:["Active Projects","Billable Hours","Revenue","Utilisation","At-Risk","Invoices Due"] },
    { label:"Portfolio Health Panel", h:80, lines:["Horizontal bar: Green/Amber/Red project count. Click → filters projects table"] },
    { label:"Quick Actions", h:56, pills:["New Project","Log Time","New Invoice","New Account","Create Opportunity"] },
    { label:"Recent Activity Feed", h:80, lines:["Time-sorted event stream: task changes, comments, timesheet submissions"] },
    { label:"Onboarding Checklist (admin only)", h:72, lines:["Steps: Invite team → Create project → Allocate resource → Submit timesheet","Auto-hides when all done or dismissed"] },
  ]), "dash-wire");

  const projListUri = await svgToDataUri(screenWireframe("Projects List /projects", [
    { label:"Page Header: Projects", h:50, lines:["Title + 'New Project' button (admin/super_user only)"] },
    { label:"Toolbar: Search + Filters + Saved Views", h:56, pills:["Search","Status","Health","Saved Views","Bulk Select"] },
    { label:"Projects Table (desktop)", h:100, cols:["Name","Account","Status","Health","Budget","Progress","Owner","Due Date","Actions"] },
    { label:"Mobile Card List", h:56, lines:["Card per project: name badge + status pill + health dot + budget progress bar"] },
    { label:"Bulk Action Bar (on select)", h:44, pills:["Archive","Export CSV"] },
  ]), "projlist-wire");

  const projDetailUri = await svgToDataUri(screenWireframe("Project Detail /projects/:id", [
    { label:"Header: Project Name + Status + Health + Actions", h:56, pills:["Edit","Archive","Delete","Convert","Health dropdown"] },
    { label:"Summary KPIs", h:72, cols:["Budget Used","Hours Logged","Tasks Done","Days Left","Billing Type","Owner"] },
    { label:"Tabs", h:44, pills:["Overview","Tasks","Milestones","Team","Financials","Files","Status Updates","Activity"] },
    { label:"Gantt / Task Tree (Overview tab)", h:90, lines:["Phase rows collapsible. Task rows with assignee + dates. Drag-resize bars.","Timeline header: week/month toggle"] },
    { label:"Task Detail Sheet (right panel)", h:80, lines:["Slide-in sheet: title, assignee, dates, status, subtasks, comments, time entries"] },
  ]), "projdetail-wire");

  const timeWireUri = await svgToDataUri(screenWireframe("Time Tracking /time", [
    { label:"Page Header + Actions", h:50, pills:["Log Time","New Time-Off Request","AI Log Assistant","Live Timer"] },
    { label:"Tabs", h:44, pills:["Timesheet","Time Entries","By Project","By User","Pending Approvals (admin)","Time Off"] },
    { label:"Timesheet Grid (7-column week view)", h:110, cols:["Project / Task","Mon","Tue","Wed","Thu","Fri","Sat","Sun","Total"] },
    { label:"Week Navigation + Submit", h:50, lines:["← Prev Week | Date Range | Next Week → | Submit Timesheet button","Status badge: Draft / Submitted / Approved / Rejected"] },
    { label:"Summary KPI Bar", h:60, cols:["Total Hours","Billable","Non-Billable","Logged This Week","Approval Rate"] },
  ]), "time-wire");

  const resourcesWireUri = await svgToDataUri(screenWireframe("Resources /resources", [
    { label:"KPI Bar", h:60, cols:["Capacity (hrs)","Allocated","Available","Utilisation %","Over-Allocated","Open Requests"] },
    { label:"Tabs", h:44, pills:["Team Capacity","Utilisation Heatmap","Resource Timeline","Skills Matrix","Resource Requests"] },
    { label:"Team Capacity Table", h:90, cols:["Name","Department","Capacity","Allocated","Utilisation","Skills","Actions"] },
    { label:"Utilisation Heatmap", h:80, lines:["Member × Week grid. Cell colour = util %. Green/Amber/Red thresholds."] },
    { label:"Resource Requests Table", h:60, cols:["Project","Role","Skills","Hours/wk","Start","Status","Actions"] },
  ]), "res-wire");

  const financeWireUri = await svgToDataUri(screenWireframe("Finance /finance", [
    { label:"Finance Summary KPIs", h:60, cols:["Total Invoiced","Pending","Overdue","Paid","Pipeline"] },
    { label:"Tabs", h:44, pills:["Invoices","Billing Schedules","Revenue Recognition","Contracts","Rate Cards"] },
    { label:"Invoice List", h:90, cols:["Invoice #","Project","Account","Amount","Issue Date","Due Date","Status","Actions"] },
    { label:"Invoice Status Sub-tabs", h:40, pills:["All","Draft","In Review","Approved","Paid"] },
    { label:"Invoice Detail Panel (right sheet)", h:70, lines:["Line items, tax, totals, status history, actions: Approve / Mark Paid / Delete"] },
  ]), "fin-wire");

  const reportsWireUri = await svgToDataUri(screenWireframe("Reports /reports", [
    { label:"Tabs", h:44, pills:["Operations","Budget vs Actuals","Burn-Down","Revenue","Utilization","Project Health","Performance","Time Audit","CSAT","Forecast","Custom"] },
    { label:"Budget vs Actuals Chart", h:90, lines:["Horizontal bar chart per project. Budget (light violet) vs Spent (violet/red if >90%).","Summary cards: Total Budget / Total Spent / Remaining"] },
    { label:"Burn-Down Chart", h:80, lines:["Line chart: Ideal (dashed) vs Actual. Project selector dropdown.","Footer: Total tasks / Completed / Remaining"] },
    { label:"Utilization Chart", h:80, lines:["Bar chart by user. Billable vs Non-Billable bands. Role/week filters."] },
    { label:"Export Controls", h:46, pills:["Download CSV","Email Report","Save View"] },
  ]), "rep-wire");

  const cmdWireUri = await svgToDataUri(screenWireframe("Command Center /command-center", [
    { label:"KPI Row", h:70, cols:["Total Budget","Burn %","Billed","At-Risk Projects","Over-Allocated","Open Requests","Project Count"] },
    { label:"Filters", h:46, pills:["Search","Status","Health","Account","PM","Group by"] },
    { label:"Portfolio Table (collapsible groups)", h:90, cols:["Project","Account","Health","Budget","Actuals","EAC","Hours","Completion","Days Left"] },
    { label:"Over-Allocated Employees Panel", h:60, lines:["Collapsible list: name + util % + project breakdown"] },
    { label:"Budget Alerts Banner", h:50, lines:["Alert rows: spend >90%, hours over plan, EAC over budget. Each links to project."] },
  ]), "cmd-wire");

  const adminWireUri = await svgToDataUri(screenWireframe("Admin Settings /admin", [
    { label:"Horizontal Scrollable Tabs", h:44, pills:["Users","Project Templates","Document Templates","Skills Matrix","Job Roles","Tax Codes","Time Categories","Task Statuses","Time Settings","Holiday Calendars","Rate Cards","Custom Fields","Activity Defaults","Placeholders","Audit Log","Company Settings","Archived Projects"] },
    { label:"Users → User Management sub-tab", h:80, cols:["Name","Email","Role","Department","Secondary Roles","Skills","Actions"] },
    { label:"Users → User Configuration sub-tab", h:60, lines:["Per-user role assignment matrix. Inline role dropdowns. Constraint: assigner cannot grant higher role."] },
    { label:"Time Settings tab", h:80, lines:["Weekly capacity, auto-approve mode, lock date, week start day, min submit hours, approval routing, billability enforcement"] },
    { label:"Audit Log tab", h:60, cols:["Timestamp","Actor","Action","Entity","Old Value","New Value"] },
  ]), "admin-wire");

  const acctWireUri = await svgToDataUri(screenWireframe("Accounts /accounts", [
    { label:"Toolbar: Search + New Account", h:50, lines:["Search input + New Account button (admin/super_user)"] },
    { label:"Accounts Table", h:90, cols:["Name","Industry","Website","Phone","Contacts","Projects","Created","Actions"] },
    { label:"Account Detail Sheet (right panel)", h:90, lines:["Slide-in sheet: account info fields, linked contacts, linked projects, activity timeline"] },
    { label:"Create / Edit Dialog", h:80, lines:["Fields: Name*, Industry, Website, Phone, Email, Address, Notes"] },
    { label:"Delete Confirmation Dialog", h:50, lines:["Danger dialog: lists linked projects/contacts as impact warning"] },
  ]), "acct-wire");

  const prosWireUri = await svgToDataUri(screenWireframe("Prospects /prospects", [
    { label:"Toolbar + Saved Views", h:50, pills:["Search","Status filter","New Prospect","Saved Views"] },
    { label:"Prospects Table", h:90, cols:["Name","Company","Email","Phone","Status","Value","Source","Owner","Created","Actions"] },
    { label:"Prospect Sheet (right panel)", h:80, lines:["Full prospect details, linked account, activity history, notes"] },
    { label:"Convert to Account Dialog", h:60, lines:["Creates new Account record. Optional: create linked Opportunity."] },
  ]), "pros-wire");

  const oppWireUri = await svgToDataUri(screenWireframe("Opportunities /opportunities", [
    { label:"View Toggle + New Opportunity", h:50, pills:["Kanban","List","New Opportunity"] },
    { label:"Kanban Board", h:110, cols:["Discovery","Qualified","Proposal","Negotiation","Won","Lost"] },
    { label:"Opportunity Card", h:60, lines:["Account, value badge, owner avatar, close date. Drag to reorder stage."] },
    { label:"Convert Won → Project Dialog", h:60, lines:["Pre-fills project form from opportunity. Launches Create Project Wizard."] },
    { label:"List View Table", h:70, cols:["Name","Account","Stage","Value","Close Date","Owner","Probability","Actions"] },
  ]), "opp-wire");

  // RBAC matrix rows (permission, [admin, super_user, collaborator, customer])
  const rbacRows = [
    ["projects.create", [true, true, false, false]],
    ["projects.view",   [true, true, true,  false]],
    ["projects.delete", [true, true, false, false]],
    ["tasks.create",    [true, true, true,  false]],
    ["tasks.edit",      [true, true, true,  false]],
    ["accounts.create", [true, true, false, false]],
    ["accounts.view",   [true, true, true,  false]],
    ["timeTracking.view",    [true, true, true,  false]],
    ["timeTracking.approve", [true, true, false, false]],
    ["resources.manageAllocations", [true, true, false, false]],
    ["financials.viewBudgets",      [true, true, true,  false]],
    ["financials.viewCostRates",    [true, false, false, false]],
    ["invoicing.create",            [true, true, false, false]],
    ["invoicing.approve",           [true, true, false, false]],
    ["reports.view",                [true, true, false, false]],
    ["reports.createCustom",        [true, false, false, false]],
    ["settings.manageTeam",         [true, true, false, false]],
    ["settings.manageIntegrations", [true, false, false, false]],
    ["settings.manageAdvanced",     [true, false, false, false]],
    ["webhooks.manage",             [true, false, false, false]],
  ];
  const rbacUri = await svgToDataUri(rbacTableSvg(rbacRows), "rbac");

  // API tables
  const projApiRows = [
    apiRow("GET",    "/api/projects",                         "x-user-id + x-user-role", "List all projects (filtered by visibility / role)"),
    apiRow("POST",   "/api/projects",                         "requirePM",               "Create project (blank or from template)"),
    apiRow("GET",    "/api/projects/:id",                     "authenticated",            "Get single project with summary"),
    apiRow("PATCH",  "/api/projects/:id",                     "requirePM",               "Update name, dates, status, health, budget etc."),
    apiRow("DELETE", "/api/projects/:id",                     "requirePM",               "Soft-delete project"),
    apiRow("POST",   "/api/projects/:id/restore",             "requireAdmin",            "Restore archived project"),
    apiRow("GET",    "/api/projects/:id/summary",             "authenticated",            "Budget actuals, hours burned, task completion %"),
    apiRow("POST",   "/api/projects/:id/shift-dates",         "requirePM",               "Bulk shift all task dates by N days"),
    apiRow("GET",    "/api/projects/:id/gantt",               "authenticated",            "Gantt chart data (phases + tasks + milestones)"),
    apiRow("GET",    "/api/projects/:id/budget-entries",      "authenticated",            "Budget line items for project"),
  ];
  const projApiUri = await svgToDataUri(apiTableSvg(projApiRows), "api-proj");

  const timeApiRows = [
    apiRow("GET",    "/api/timesheets",               "authenticated", "List timesheets (filtered by userId, week, status)"),
    apiRow("POST",   "/api/timesheets",               "authenticated", "Create timesheet for a week"),
    apiRow("PATCH",  "/api/timesheets/:id",           "authenticated", "Update timesheet rows"),
    apiRow("POST",   "/api/timesheets/:id/submit",    "authenticated", "Submit timesheet for approval"),
    apiRow("POST",   "/api/timesheets/:id/approve",   "requirePM",    "Approve submitted timesheet"),
    apiRow("POST",   "/api/timesheets/:id/reject",    "authenticated", "Reject with reason message"),
    apiRow("POST",   "/api/timesheets/bulk-approve",  "requirePM",    "Bulk approve multiple timesheets"),
    apiRow("GET",    "/api/time-entries",             "authenticated", "List individual time entries"),
    apiRow("POST",   "/api/time-entries",             "authenticated", "Create a time entry"),
    apiRow("PATCH",  "/api/time-entries/:id",         "authenticated", "Edit a time entry"),
    apiRow("DELETE", "/api/time-entries/:id",         "authenticated", "Delete a time entry"),
    apiRow("GET",    "/api/time-entries/summary",     "authenticated", "Aggregated total / billable / by-project"),
    apiRow("POST",   "/api/timesheets/import-allocations","authenticated","Pre-fill grid rows from project allocations"),
  ];
  const timeApiUri = await svgToDataUri(apiTableSvg(timeApiRows), "api-time");

  const finApiRows = [
    apiRow("GET",    "/api/invoices",                          "requireFinance", "List invoices (filterable by project, status)"),
    apiRow("POST",   "/api/invoices",                          "requireFinance", "Create invoice (Draft)"),
    apiRow("PATCH",  "/api/invoices/:id",                      "requireFinance", "Update invoice fields (status, amount, due date)"),
    apiRow("DELETE", "/api/invoices/:id",                      "requireFinance", "Delete invoice"),
    apiRow("GET",    "/api/invoices/finance-summary",          "requireFinance", "KPI totals: total/pending/overdue/paid"),
    apiRow("POST",   "/api/invoices/from-timesheet/:id",       "requireFinance", "Auto-generate invoice from approved timesheet"),
    apiRow("GET",    "/api/billing-schedules",                 "requireFinance", "List billing schedules (optionally by project)"),
    apiRow("POST",   "/api/billing-schedules",                 "requireFinance", "Create billing schedule rule"),
    apiRow("POST",   "/api/billing-schedules/:id/trigger",     "requireFinance", "Manually fire billing schedule → creates invoice"),
    apiRow("GET",    "/api/revenue-entries",                   "requireFinance", "List revenue recognition entries"),
    apiRow("POST",   "/api/revenue-entries",                   "requireFinance", "Record revenue entry for a period"),
    apiRow("GET",    "/api/reports/revenue-by-period",         "requireFinance", "Revenue bar chart data grouped by period"),
  ];
  const finApiUri = await svgToDataUri(apiTableSvg(finApiRows), "api-fin");

  const resApiRows = [
    apiRow("GET",  "/api/capacity-overview",         "authenticated", "Per-user capacity, allocated hrs, util %"),
    apiRow("GET",  "/api/resource-requests",         "authenticated", "List resource requests"),
    apiRow("POST", "/api/resource-requests",         "requirePM",    "Raise resource request"),
    apiRow("PATCH","/api/resource-requests/:id/status","requirePM",  "Approve / Reject / Block / Fulfil request"),
    apiRow("POST", "/api/resources/suggest",         "requirePM",    "AI-assisted candidate suggestions for a request"),
    apiRow("GET",  "/api/allocations",               "authenticated", "List project allocations"),
    apiRow("POST", "/api/allocations",               "requirePM",    "Create allocation (user + project + hours/wk + dates)"),
    apiRow("PATCH","/api/allocations/:id",           "requirePM",    "Update allocation"),
    apiRow("DELETE","/api/allocations/:id",          "requirePM",    "Remove allocation"),
    apiRow("GET",  "/api/user-skills",               "authenticated", "All user→skill rows (bulk for match scoring)"),
    apiRow("GET",  "/api/users/:id/skills",          "authenticated", "Skills for one user"),
    apiRow("POST", "/api/users/:id/skills",          "requirePM",    "Assign skill to user"),
    apiRow("DELETE","/api/users/:id/skills/:skillId","requirePM",    "Remove skill from user"),
  ];
  const resApiUri = await svgToDataUri(apiTableSvg(resApiRows), "api-res");

  // ── Assemble HTML ──────────────────────────────────────────────────────────
  let html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>${CSS}</style></head><body>`;

  // ── COVER ──────────────────────────────────────────────────────────────────
  html += `<div class="cover">
    <h1>BusinessNow PSA</h1>
    <h1 style="font-size:22px;margin-top:4px">Frontend Blueprint Document</h1>
    <p style="margin-top:16px">Developer-Ready UI Specification — All Modules</p>
    <p>Version 1.0 &nbsp;|&nbsp; May 2026 &nbsp;|&nbsp; Confidential</p>
  </div>`;

  // ── TABLE OF CONTENTS ──────────────────────────────────────────────────────
  html += h1("Table of Contents");
  const toc = [
    ["1","Architecture & Technology Stack"],
    ["2","Authentication & Login"],
    ["3","Layout Shell (Sidebar, Header, Notifications Bell)"],
    ["4","Dashboard / Overview"],
    ["5","Projects Module"],
    ["5.1","Project List View"],
    ["5.2","Project Detail View"],
    ["5.3","Create Project Wizard"],
    ["6","Accounts Module"],
    ["7","Prospects Module"],
    ["8","Opportunities Module"],
    ["9","Time Tracking Module"],
    ["10","Resources Module"],
    ["11","Finance Module"],
    ["12","Reports Module"],
    ["13","Command Center Module"],
    ["14","Admin Settings Module"],
    ["15","Notifications Module"],
    ["16","Global Components & Design System"],
    ["17","RBAC / Permissions Matrix"],
    ["18","API Endpoint Reference"],
    ["19","Responsive & Accessibility Guidelines"],
  ];
  html += `<div style="background:#faf5ff;border-radius:8px;padding:20px 24px;margin-bottom:20px">`;
  toc.forEach(([n,t])=>{
    html += `<div class="toc-item"><span class="toc-num">${n}</span><span>${t}</span></div>`;
  });
  html += `</div>`;

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 1 — ARCHITECTURE
  // ═══════════════════════════════════════════════════════════════════════════
  html += `<div class="page-break">`;
  html += h1("1. Architecture & Technology Stack");
  html += p("BusinessNow PSA is a full-stack professional services automation platform delivered as a monorepo. The frontend is a React single-page application served by Vite, communicating with an Express/Node.js REST API backed by PostgreSQL.");

  html += h2("1.1 Frontend Stack");
  html += table(
    ["Layer","Technology","Notes"],
    [
      ["Framework","React 18 (functional components, hooks)","All pages use function components; no class components"],
      ["Build Tool","Vite","HMR in dev; BASE_URL env var controls sub-path deployment"],
      ["Routing","Wouter","Lightweight client-side router; routes defined in App.tsx"],
      ["State / Data","TanStack Query v5","All server data fetched via generated hooks from @workspace/api-client-react"],
      ["UI Library","shadcn/ui (Radix UI primitives)","Accessible headless components + Tailwind CSS tokens"],
      ["Styling","Tailwind CSS v3","Utility-first; dark-mode via class strategy"],
      ["Form Handling","react-hook-form + Zod","Schema validation on all create/edit forms"],
      ["Charts","Recharts","Bar, Line, Area, ComposedChart used in Reports & Finance"],
      ["Icons","Lucide React","Consistent icon set across all modules"],
      ["Drag & Drop","Custom pointer-events (Kanban)","Opportunities board drag-drop between stages"],
      ["Date Handling","date-fns","Week calculations, formatting, ISO parse"],
      ["Auth","x-user-id + x-user-role headers","Demo workspace; no password; role persisted in localStorage"],
    ],
    ["20%","25%","55%"]
  );

  html += h2("1.2 API Client Pattern");
  html += p("All API communication goes through <code>@workspace/api-client-react</code> — a generated hook library. Each hook wraps TanStack Query's <code>useQuery</code>/<code>useMutation</code>. Auth headers (<code>x-user-id</code>, <code>x-user-role</code>) are injected via the <code>authHeaders()</code> helper.");
  html += infoBox("Auth Header Injection Pattern", [
    "<code>authHeaders(extraHeaders?)</code> reads <code>currentUser.id</code> and <code>activeRole</code> from localStorage/context",
    "Injected on every fetch call as <code>x-user-id</code> and <code>x-user-role</code>",
    "Server-side RBAC is enforced via Express middleware: <code>requireAdmin</code>, <code>requirePM</code>, <code>requireFinance</code>, <code>requirePermission(perm)</code>",
    "Frontend permission gate: <code>useAccountPermissions(activeRole)</code> → <code>checkPerm('permission.key')</code>",
    "<code>RequirePermission</code> component wraps protected UI sections; renders <code>Forbidden</code> page on failure",
  ]);

  html += h2("1.3 Route Map");
  html += img(navFlowUri, "Application route navigation map");
  html += table(
    ["Route","Component","Auth Required","Notes"],
    [
      ["/login","login.tsx","None","User-picker + role selector; redirects to / on sign-in"],
      ["/","dashboard.tsx","Yes","KPI tiles, portfolio health, quick actions, onboarding checklist"],
      ["/projects","projects.tsx","Yes","Project list with filters, saved views, bulk operations"],
      ["/projects/:id","project-detail.tsx","Yes","Full project workspace with 8 tabs"],
      ["/accounts","accounts.tsx","accounts.view","CRM accounts list + detail sheet"],
      ["/prospects","prospects.tsx","accounts.view","Prospects CRM pipeline"],
      ["/opportunities","opportunities.tsx","Yes","Kanban + list view pipeline"],
      ["/time","time.tsx","timeTracking.view","Timesheet grid, entries, approvals, time-off"],
      ["/resources","resources.tsx","resources.viewPlans","Capacity, heatmap, timeline, skills, requests"],
      ["/finance","finance.tsx","invoicing.view","Invoices, billing schedules, revenue recognition, contracts"],
      ["/reports","reports.tsx","reports.view","8 report tabs with charts and CSV export"],
      ["/command-center","command-center.tsx","reports.view","Executive portfolio dashboard"],
      ["/admin","admin.tsx","settings.manageTeam","17-tab admin settings panel"],
      ["/notifications","notifications.tsx","Yes","Full notifications inbox"],
      ["/forbidden","forbidden.tsx","—","RBAC gate fallback page"],
    ],
    ["20%","22%","15%","43%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 2 — LOGIN
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("2. Authentication & Login");
  html += img(loginWireUri, "Login screen wireframe");

  html += h2("2.1 Screen Overview");
  html += p("The login page is a centred card layout on a gradient background. It provides a demo workspace sign-in experience: no password required. Users select a persona and a role before entering the application.");

  html += h2("2.2 UI Elements & Fields");
  html += fieldTable([
    ["Workspace User Selector","Avatar grid","Yes","Displays all users from <code>GET /api/users</code>. Clicking selects the persona."],
    ["Role Selector","Dropdown","Yes","Options: Account Admin, Super User, Collaborator, Customer"],
    ["Sign In Button","Primary CTA","Yes","Disabled until user and role are selected. On click: writes session to localStorage, redirects to /"],
    ["Brand Logo / Title","Static text","—","'BusinessNow PSA' word-mark centred at top"],
  ]);

  html += h2("2.3 Component Behaviour");
  html += ul([
    "User list is fetched on mount via <code>GET /api/users</code>. Shows skeleton loaders while loading.",
    "Selecting a user highlights their avatar card with a violet ring.",
    "Role selector defaults to <code>account_admin</code>.",
    "On 'Sign In': <code>currentUser</code> and <code>activeRole</code> are written to localStorage, then <code>navigate('/')</code>.",
    "If already signed in (localStorage has user), navigating to /login redirects to /.",
  ]);

  html += h2("2.4 API Connections");
  html += table(
    ["Call","Endpoint","Description"],
    [
      ["GET","GET /api/users","Load user list for persona picker"],
    ],
    ["10%","30%","60%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 3 — LAYOUT SHELL
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("3. Layout Shell");
  html += p("Every authenticated page is wrapped in the <code>&lt;Layout&gt;</code> component (<code>components/layout.tsx</code>). It provides the sidebar navigation, top header bar, and notification popover.");

  html += h2("3.1 Sidebar Navigation");
  html += table(
    ["Group","Items","Role Visibility"],
    [
      ["Workspace","Overview, Projects, Accounts, Prospects, Opportunities, Time Tracking, Resources","All authenticated roles"],
      ["Admin","Command Center, Finance, Reports, Admin","account_admin + super_user"],
    ],
    ["20%","55%","25%"]
  );
  html += infoBox("Sidebar Behaviour", [
    "Collapsed/expanded state persisted in localStorage key <code>sidebarCollapsed</code>.",
    "Collapsed: shows icon-only rail (48px wide). Expanded: shows icon + label (240px wide).",
    "Active route highlighted with violet background pill.",
    "On mobile (&lt;768px): sidebar becomes a drawer triggered by hamburger icon in top bar.",
    "Sidebar group headings ('Workspace', 'Admin') are non-clickable labels that collapse to hidden in icon-only mode.",
  ]);

  html += h2("3.2 Top Header Bar");
  html += ul([
    "Left: Page-specific breadcrumb trail (provided by each page via <code>&lt;PageHeader&gt;</code> component).",
    "Right: Notification bell icon with unread badge count → opens <code>&lt;NotificationPopover&gt;</code>.",
    "Right: User chip showing avatar initials + role badge. Click → user menu (profile, role switcher, sign out).",
    "Role switcher allows switching between roles the current user is entitled to (based on <code>ALLOWED_ASSIGNMENTS</code> matrix).",
  ]);

  html += h2("3.3 Notification Popover");
  html += ul([
    "Triggered by bell icon in the header. Renders as a Popover (not a full page).",
    "Shows last 5 notifications with type icon, message, and relative time.",
    "Action buttons: 'Mark all read', 'View all' → navigates to /notifications.",
    "Unread count badge is red circle on the bell icon; disappears when count is 0.",
    "Notification types: <code>project_alert</code>, <code>invoice_paid</code>, <code>task_assigned</code>, <code>timesheet_reminder</code>.",
    "Each item is clickable and navigates to the related entity: project detail, finance page, or time tracking.",
  ]);

  html += h2("3.4 Pending Timesheet Gate");
  html += p("A modal gate that appears on login or navigation if the current user has unresolved (not-submitted) timesheets from prior weeks. It lists the pending weeks as clickable rows; clicking a row navigates to <code>/time?weekStart=YYYY-MM-DD</code> and opens the timesheet tab pre-scrolled to that week.");

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 4 — DASHBOARD
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("4. Dashboard / Overview");
  html += img(dashWireUri, "Dashboard wireframe");

  html += h2("4.1 Screen Overview");
  html += p("The main landing page after login. Provides at-a-glance portfolio health, key metrics, and quick actions. Adapts content based on role.");

  html += h2("4.2 KPI Tile Row");
  html += table(
    ["Tile","Metric","API Source","Notes"],
    [
      ["Active Projects","Count of non-completed projects","GET /api/projects + filter","Clickable → navigates to /projects"],
      ["Billable Hours","Sum of billable time entries (current period)","GET /api/time-entries/summary","Period defaults to current month"],
      ["Revenue","Total invoiced (current period)","GET /api/invoices/finance-summary","Shown only to admin/super_user"],
      ["Utilisation","Portfolio avg utilisation %","GET /api/capacity-overview","Shown only to admin/super_user"],
      ["At-Risk Projects","Count of Amber + Red health projects","GET /api/reports/project-health","Click → /reports#health tab"],
      ["Invoices Due","Count of overdue invoices","GET /api/invoices/finance-summary","Shown only to finance roles"],
    ],
    ["18%","22%","28%","32%"]
  );

  html += h2("4.3 Portfolio Health Panel");
  html += ul([
    "Horizontal stacked bar: Green / Amber / Red project counts.",
    "Clicking a coloured segment filters the dashboard project mini-list to that health bucket.",
    "Data source: <code>GET /api/reports/project-health</code>.",
    "Health buckets: Green = On Track, Amber = At Risk, Red = Off Track.",
  ]);

  html += h2("4.4 Quick Actions");
  html += ul([
    "<strong>New Project</strong> — opens Create Project Wizard dialog (requires <code>projects.create</code>)",
    "<strong>Log Time</strong> — opens Log Time quick-entry sheet",
    "<strong>New Invoice</strong> — opens Create Invoice dialog (requires <code>invoicing.create</code>)",
    "<strong>New Account</strong> — opens Create Account dialog (requires <code>accounts.create</code>)",
    "<strong>Create Opportunity</strong> — opens Create Opportunity dialog",
    "Buttons hidden via <code>RequirePermission</code> if role does not have the required permission.",
  ]);

  html += h2("4.5 Onboarding Checklist");
  html += infoBox("Visibility Rule", [
    "Shown only to <code>account_admin</code> role.",
    "Auto-hides when all 4 steps are done OR the user clicks the × dismiss button.",
    "Dismiss state persisted via <code>PATCH /api/users/:id/onboarding-dismissed</code>.",
  ], "#0ea5e9");
  html += table(
    ["Step","Done Condition","CTA Destination"],
    [
      ["Invite your team","users.length > 1","→ /team (admin sub-section)"],
      ["Create your first project","projects.length > 0","→ /projects"],
      ["Allocate a resource","allocations.length > 0","→ /resources"],
      ["Submit a timesheet","timesheets with status Submitted > 0","→ /time"],
    ],
    ["35%","35%","30%"]
  );

  html += h2("4.6 Recent Activity Feed");
  html += ul([
    "Time-sorted event stream showing the 20 most recent workspace events.",
    "Events: task status changes, comments posted, timesheet submitted/approved, project created.",
    "Each row: actor avatar + description + relative timestamp.",
    "Clicking an event row navigates to the related entity.",
    "Data source: <code>GET /api/activity</code> with pagination.",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 5 — PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("5. Projects Module");

  html += sectionDivider("5.1 Project List View");
  html += img(projListUri, "Projects list screen wireframe");
  html += h3("Overview");
  html += p("Paginated, filterable list of all projects the current user can access. Desktop shows a table; mobile shows cards. Supports bulk operations and saved filter views.");

  html += h3("Toolbar Controls");
  html += table(
    ["Control","Type","Behaviour"],
    [
      ["Search box","Text input","Debounced 300ms. Filters by project name."],
      ["Status filter","Select dropdown","Options: All, Not Started, Started, In Progress, On Hold, Completed"],
      ["Health filter","Select dropdown","Options: All, On Track, At Risk, Off Track"],
      ["Saved Views bar","Pill bar","SavedViewsBar component; allows saving current filter combination as a named view. Stored per user."],
      ["Bulk select checkbox","Checkbox in table header","Selects all visible rows. Reveals bulk action bar."],
      ["New Project button","Primary button","Opens Create Project Wizard. Gated on <code>projects.create</code>."],
    ],
    ["22%","18%","60%"]
  );

  html += h3("Table Columns (Desktop)");
  html += table(
    ["Column","Type","Sortable","Notes"],
    [
      ["Project Name","Link text","Yes","Navigates to /projects/:id on click"],
      ["Account","Text","Yes","Linked account name"],
      ["Status","StatusBadge","Yes","Colour-coded: violet=In Progress, green=Completed, amber=On Hold"],
      ["Health","Pill","Yes","Green/Amber/Red dot + label"],
      ["Budget","Currency","Yes","Format: $X,XXX"],
      ["Progress","Progress bar","No","Task completion % bar"],
      ["Owner","Avatar+Name","Yes","Project owner user"],
      ["Due Date","Date","Yes","Formatted MMM DD, YYYY. Red if overdue."],
      ["Actions","Icon button","—","⋮ dropdown: View, Edit, Archive, Delete"],
    ],
    ["18%","13%","10%","59%"]
  );

  html += h3("Mobile Card Layout");
  html += ul([
    "Card per project with: Name (bold), Account (grey), Status badge (right), Health dot.",
    "Second row: Budget formatted, progress bar (full width), Owner initials chip, Due date.",
    "Tap card → navigates to project detail.",
    "Swipe-left action: quick Archive shortcut.",
  ]);

  html += h3("Bulk Actions");
  html += ul([
    "Bulk action bar appears at bottom of screen when ≥1 rows selected.",
    "<strong>Archive</strong>: PATCH /api/projects/:id with <code>archived:true</code> for each selected ID. Confirms in toast.",
    "<strong>Export CSV</strong>: Client-side CSV generation from selected row data. Downloads <code>projects.csv</code>.",
  ]);

  html += h3("API Connections");
  html += table(["Method","Endpoint","Purpose"],
    [["GET","/api/projects","Load project list (all active)"],["PATCH","/api/projects/:id","Archive / update status"],["DELETE","/api/projects/:id","Delete project (gated)"]],
    ["10%","35%","55%"]
  );

  // ── 5.2 Project Detail
  html += sectionDivider("5.2 Project Detail View");
  html += img(projDetailUri, "Project detail screen wireframe");
  html += h3("Header Section");
  html += ul([
    "Breadcrumb: Projects › Project Name.",
    "Project name (editable inline on double-click for admin/super_user).",
    "Status dropdown (admin/PM only): Not Started | Started | In Progress | On Hold | Completed.",
    "Health dropdown (admin/PM only): On Track | At Risk | Off Track.",
    "Action buttons: Edit (opens project edit dialog), Archive, Delete, Shift Dates.",
  ]);

  html += h3("Summary KPI Bar");
  html += table(
    ["Metric","Calculation","API Field"],
    [
      ["Budget Used","actuals / totalBudget × 100","GET /api/projects/:id/summary → percentUsed"],
      ["Hours Logged","Sum of all approved time entries","summary.actualHours"],
      ["Budgeted Hours","From project.budgetedHours","summary.plannedHours"],
      ["Tasks Done","completed tasks / total tasks","summary.taskCompletion"],
      ["Days Left","dueDate − today","Derived client-side"],
      ["Billing Type","project.billingType","Fixed Fee | T&M | Retainer"],
    ],
    ["22%","38%","40%"]
  );

  html += h3("Tab Structure");
  html += table(
    ["Tab","Content","Key Interactions"],
    [
      ["Overview","Gantt chart with phase + task bars","Drag bars to change dates; click task to open Task Detail Sheet"],
      ["Tasks","Tree view: Phases → Tasks → Sub-tasks","Create task, assign, set status, set dates; indent/outdent for hierarchy"],
      ["Milestones","Milestone list with CSAT ratings","Create milestone, toggle CSAT enabled; customer can rate via milestone.rate perm"],
      ["Team","Project members table","Add vendor / customer members; set project role (admin | collaborator | customer)"],
      ["Financials","Budget entries + actuals chart","Add budget line items; view spend vs budget per category"],
      ["Files","Document attachments","Upload files; link external URLs; type badges: PDF, Link, Spreadsheet, Rich Text"],
      ["Status Updates","Shared + private status posts","Create status update (shared or private); publish to customers"],
      ["Activity","Full event timeline","All changes, comments, time entries for this project"],
    ],
    ["15%","35%","50%"]
  );

  html += h3("Task Detail Sheet (Slide-in Panel)");
  html += ul([
    "Opens as a right-side Sheet (480px wide) when clicking any task row.",
    "Fields: Task name, Description, Assignee (multi-select), Start Date, Due Date, Status (custom or default statuses), Priority, Estimated Hours, Phase.",
    "Sub-task list with inline creation (press Enter to add).",
    "Comments thread with @mentions support.",
    "Time Entries section: lists logged time for this task.",
    "Convert to Milestone toggle (requires <code>tasks.convertToMilestone</code>).",
    "Mark Private toggle (hides from customer project role).",
    "Keyboard: Escape closes the sheet.",
  ]);

  html += h3("Gantt Chart");
  html += ul([
    "Phase rows are collapsible (chevron toggle).",
    "Task bars rendered with start/end dates; hover shows tooltip with dates + assignee.",
    "Drag bar left/right to shift dates (POST /api/projects/:id/shift-dates).",
    "Timeline header: Month/Week granularity toggle.",
    "Today line: vertical red reference line.",
    "Milestone diamonds displayed at due date.",
  ]);

  html += h3("API Connections (Project Detail)");
  html += img(projApiUri, "Project API endpoints table");

  // ── 5.3 Create Project Wizard
  html += sectionDivider("5.3 Create Project Wizard");
  html += h3("Wizard Flow");
  html += table(
    ["Step","Mode","Fields"],
    [
      ["1 — Choose Mode","Both","Blank Project or From Template (tile selection)"],
      ["2 — Basic Info","Blank","Name*, Account*, Owner*, Start Date*, Due Date*"],
      ["3 — Billing","Blank","Billing Type (Fixed Fee/T&M/Retainer), Budget, Budgeted Hours, Rate Card, Internal/External"],
      ["4 — Team","Blank","Multi-select team members + Starting Point (blank / apply template / later)"],
      ["5 — Submit","Blank","Creates project via POST /api/projects; if template selected: POST /api/projects/:id/apply-template"],
      ["2T — Template Info","Template","Name*, Account*, Owner*, Start Date*, Budget"],
      ["3T — Submit","Template","Creates via POST /api/project-templates/:id/create-project"],
    ],
    ["25%","15%","60%"]
  );
  html += infoBox("Validation Rules", [
    "Due Date must be ≥ Start Date (Zod refinement).",
    "Budget and Budgeted Hours must be ≥ 0.",
    "Account is required (select from existing accounts).",
    "Owner must be a workspace user.",
    "Template mode only shows templates the user has access to.",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 6 — ACCOUNTS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("6. Accounts Module");
  html += img(acctWireUri, "Accounts screen wireframe");

  html += h2("6.1 Screen Overview");
  html += p("CRM-style accounts list. Acts as the client/organisation registry. Accounts are linked to projects, prospects, and opportunities. Visible to all roles; create/edit/delete gated to admin/super_user.");

  html += h2("6.2 UI Elements & Fields");
  html += fieldTable([
    ["Name","Text","Yes","Primary identifier. Unique per workspace."],
    ["Industry","Text","No","Free text field for sector classification."],
    ["Website","URL","No","Opens in new tab from the table row."],
    ["Phone","Text","No","Formatted phone number."],
    ["Email","Email","No","Primary contact email."],
    ["Address","Text","No","Free-form address field."],
    ["Notes","Textarea","No","Internal notes, rendered with line breaks."],
  ]);

  html += h2("6.3 Table & Sheet Layout");
  html += ul([
    "Table columns: Name, Industry, Website, Phone, Contact Count, Project Count, Created Date, Actions (⋮).",
    "Row click opens Account Detail Sheet (right-side panel, 560px).",
    "Sheet tabs: Info, Contacts, Projects, Activity.",
    "Info tab: all fields in editable form (admin/super_user only).",
    "Contacts tab: linked contacts list with quick-add inline.",
    "Projects tab: list of projects linked to this account with status badges.",
    "Activity tab: timeline of changes to the account record.",
  ]);

  html += h2("6.4 Create / Edit Dialog");
  html += ul([
    "Triggered by 'New Account' button or ⋮ → Edit.",
    "Modal Dialog (max-width: 520px). Zod-validated form.",
    "Fields: Name*, Industry, Website, Phone, Email, Address, Notes.",
    "POST /api/accounts on create; PATCH /api/accounts/:id on edit.",
    "Toast confirmation on success; inline field error messages on validation failure.",
  ]);

  html += h2("6.5 Delete Confirmation");
  html += ul([
    "Triggered by ⋮ → Delete.",
    "Danger Dialog listing: N linked projects, N linked contacts.",
    "Requires typed confirmation ('DELETE') before submit.",
    "DELETE /api/accounts/:id.",
  ]);

  html += h2("6.6 API Connections");
  html += table(["Method","Endpoint","Auth","Purpose"],
    [["GET","/api/accounts","accounts.view","List accounts"],["POST","/api/accounts","accounts.create","Create account"],["PATCH","/api/accounts/:id","accounts.edit","Update account"],["DELETE","/api/accounts/:id","accounts.delete","Delete account"],["POST","/api/accounts/merge","accounts.merge","Merge two duplicate accounts"]],
    ["10%","28%","18%","44%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 7 — PROSPECTS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("7. Prospects Module");
  html += img(prosWireUri, "Prospects screen wireframe");

  html += h2("7.1 Screen Overview");
  html += p("Pre-sales prospect pipeline. Prospects represent potential clients before they become Accounts. Supports conversion to Account (and optionally to Opportunity).");

  html += h2("7.2 Fields");
  html += fieldTable([
    ["Name","Text","Yes","Contact or company name"],
    ["Company","Text","No","Organisation name"],
    ["Email","Email","No","Primary contact email"],
    ["Phone","Text","No","Contact phone"],
    ["Status","Select","Yes","New | Contacted | Qualified | Unqualified | Converted"],
    ["Estimated Value","Currency","No","Deal potential in USD"],
    ["Source","Select","No","Web | Referral | Email | Event | Other"],
    ["Owner","User Select","No","Assigned sales user"],
    ["Notes","Textarea","No","Freeform notes"],
  ]);

  html += h2("7.3 Saved Views & Filters");
  html += ul([
    "SavedViewsBar component allows saving filter + sort combinations as named views.",
    "Filter fields: status (enum), source (text), estimatedValue (number range), owner (user).",
    "Saved views are stored per entity type (<code>entity='prospects'</code>) via POST /api/saved-views.",
  ]);

  html += h2("7.4 Convert to Account Flow");
  html += ul([
    "⋮ → Convert to Account opens a confirmation dialog.",
    "Creates a new Account record from prospect name/company/email/phone.",
    "Optional checkbox: 'Also create an Opportunity linked to this account'.",
    "Prospect status is set to 'Converted'; row shows Converted badge.",
    "PATCH /api/prospects/:id + POST /api/accounts (+ POST /api/opportunities if checkbox checked).",
  ]);

  html += h2("7.5 API Connections");
  html += table(["Method","Endpoint","Purpose"],
    [["GET","/api/prospects","List prospects"],["POST","/api/prospects","Create prospect"],["PATCH","/api/prospects/:id","Update prospect"],["DELETE","/api/prospects/:id","Delete prospect"],["POST","/api/prospects/:id/convert","Convert to account"]],
    ["10%","32%","58%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 8 — OPPORTUNITIES
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("8. Opportunities Module");
  html += img(oppWireUri, "Opportunities screen wireframe");

  html += h2("8.1 Screen Overview");
  html += p("Sales pipeline management. Supports two views: Kanban board (default) and List table. Won opportunities can be converted to projects via the Create Project Wizard.");

  html += h2("8.2 Kanban View");
  html += ul([
    "Six stage columns: Discovery → Qualified → Proposal → Negotiation → Won → Lost.",
    "Opportunity cards show: Account name, deal value badge (green currency), owner avatar, close date, probability %.",
    "Drag-and-drop between columns triggers PATCH /api/opportunities/:id to update stage.",
    "Column header shows stage name + total value of all opportunities in that stage.",
    "Won column: cards have a 'Convert to Project' action button.",
    "Lost column: greyed-out card styling.",
  ]);

  html += h2("8.3 List View");
  html += ul([
    "Toggled via Kanban/List toggle buttons in the page header.",
    "Table columns: Name, Account, Stage, Value, Close Date, Owner, Probability, Actions.",
    "Sortable by all columns.",
    "Row Actions: Edit, Delete, Convert to Project (Won stage only).",
  ]);

  html += h2("8.4 Create / Edit Opportunity Dialog");
  html += fieldTable([
    ["Name","Text","Yes","Opportunity title"],
    ["Account","Select","Yes","Links to existing Account"],
    ["Stage","Select","Yes","Discovery | Qualified | Proposal | Negotiation | Won | Lost"],
    ["Value","Currency","No","Estimated deal value in USD"],
    ["Close Date","Date","No","Expected close date"],
    ["Owner","User Select","No","Assigned sales user"],
    ["Probability","Number (0-100)","No","Win probability %"],
    ["Notes","Textarea","No","Additional context"],
  ]);

  html += h2("8.5 Convert Won → Project");
  html += ul([
    "Available only when stage = 'Won'. Button in card actions and ⋮ menu.",
    "Opens Create Project Wizard pre-filled with: Account, Name (from opportunity name), Budget (from value).",
    "Wizard operates normally from Step 2 onwards.",
    "On project creation: opportunity stage remains Won; project is linked via accountId.",
  ]);

  html += h2("8.6 API Connections");
  html += table(["Method","Endpoint","Purpose"],
    [["GET","/api/opportunities","List all opportunities"],["POST","/api/opportunities","Create opportunity"],["PATCH","/api/opportunities/:id","Update stage/fields (used by drag-drop + edit)"],["DELETE","/api/opportunities/:id","Delete opportunity"]],
    ["10%","32%","58%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 9 — TIME TRACKING
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("9. Time Tracking Module");
  html += img(timeWireUri, "Time tracking screen wireframe");

  html += h2("9.1 Screen Overview");
  html += p("Full-featured time management module. The primary interface is a weekly timesheet grid (Jira-style). Additional tabs provide entry lists, per-project and per-user breakdowns, approval queues, and time-off management.");

  html += h2("9.2 Tab Structure");
  html += table(
    ["Tab","Audience","Content"],
    [
      ["Timesheet","All","7-column weekly grid. Per-row project/task + hours per day. Submit / approve / reject workflow."],
      ["Time Entries","All","Flat list of all individual time entry records. Editable + deletable."],
      ["By Project","All","Aggregated hours grouped by project. Bar chart + table."],
      ["By User","Admin/PM","Hours breakdown by team member. Filterable by date range."],
      ["Pending Approvals","Admin/PM (timeTracking.approve)","Table of submitted timesheets awaiting approval. Bulk approve/reject."],
      ["Time Off","All","PTO/Sick/Unpaid leave requests. My requests + team view (admin)."],
    ],
    ["22%","22%","56%"]
  );

  html += h2("9.3 Timesheet Grid");
  html += ul([
    "Rows represent project/task combinations. Each row: Project dropdown, Task dropdown (optional), billable checkbox, category badge, 7 day cells, row total.",
    "Day cells are inline-editable text inputs. Tab key advances to next cell.",
    "Click 'Add Row' to insert a new project/task row.",
    "Import Allocations button: <code>POST /api/timesheets/import-allocations</code> pre-fills rows from resource allocation plan.",
    "Non-project rows supported (e.g., Admin, Training) with <code>isNonProject: true</code>.",
    "Footer row: per-day column totals + grand total.",
    "Week navigation: ← Prev | Current Week Range | Next → arrows.",
    "Deep-link support: <code>?weekStart=YYYY-MM-DD</code> navigates to a specific week on load.",
    "Status badge: Draft | Submitted | Approved | Rejected.",
    "Lock icon on cells: locked if timesheet is in Approved state or past the lock date configured in Time Settings.",
  ]);

  html += h2("9.4 Timesheet Workflow");
  html += table(
    ["State","Actor","Action","Next State"],
    [
      ["Draft","Collaborator","Submit timesheet","Submitted"],
      ["Submitted","PM / Admin","Approve","Approved"],
      ["Submitted","PM / Admin","Reject + reason","Rejected"],
      ["Rejected","Collaborator","Edit + resubmit","Submitted"],
      ["Approved","Admin only","Un-approve","Draft"],
    ],
    ["15%","18%","37%","30%"]
  );

  html += h2("9.5 Live Timer");
  html += ul([
    "Timer button in page header: shows HH:MM:SS when running.",
    "Start → ticks in background. Stop → pre-fills Log Time dialog with calculated hours.",
    "Timer state is in-memory only (not persisted to server).",
    "One timer can run at a time.",
  ]);

  html += h2("9.6 Time Off Request");
  html += fieldTable([
    ["User","Select","Yes","Team member (admin can log for others; collaborator sees self)"],
    ["Type","Select","Yes","PTO | Sick | Unpaid | Other"],
    ["Start Date","Date","Yes",""],
    ["End Date","Date","Yes","Must be ≥ Start Date"],
    ["Duration Type","Select","Yes","Full Day | Half Day | Custom Hours"],
    ["Custom Hours","Number","Conditional","Required if Duration Type = Custom Hours"],
    ["Notes","Textarea","No","Optional reason"],
    ["Notify Project Owners","Checkbox","No","Sends notification to project owners if checked"],
    ["Additional Emails","Text","No","Comma-separated extra notification recipients"],
  ]);

  html += h2("9.7 AI Log Assistant");
  html += ul([
    "Opens as a Sheet panel. Natural-language time logging: 'Spent 2h on Client Portal API review'.",
    "AI parses the description and pre-fills project, task, hours, date, and description fields.",
    "User reviews and confirms; submits via standard time entry creation.",
    "Endpoint: POST /api/time-log-assistant (AI-powered parsing).",
  ]);

  html += h2("9.8 API Connections");
  html += img(timeApiUri, "Time tracking API endpoints");

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 10 — RESOURCES
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("10. Resources Module");
  html += img(resourcesWireUri, "Resources screen wireframe");

  html += h2("10.1 Screen Overview");
  html += p("Workforce planning and capacity management. Five tabs covering people capacity, visualisations, timeline planning, skills inventory, and resource request workflows.");

  html += h2("10.2 KPI Bar");
  html += table(
    ["Metric","Calculation","Source"],
    [
      ["Total Capacity","Sum of all users' weekly capacity hours","GET /api/capacity-overview"],
      ["Allocated Hours","Sum of all allocation hours this period","GET /api/capacity-overview"],
      ["Available Hours","Capacity − Allocated","Derived client-side"],
      ["Utilisation %","Allocated / Capacity × 100","GET /api/capacity-overview"],
      ["Over-Allocated","Users where utilisation > 100%","GET /api/capacity-overview"],
      ["Open Requests","Resource requests with status Pending","GET /api/resource-requests"],
    ],
    ["22%","38%","40%"]
  );

  html += h2("10.3 Tab Details");
  html += h3("Team Capacity Tab");
  html += ul([
    "Table: Name, Department, Weekly Capacity (hrs), Allocated (hrs), Utilisation % (progress bar), Skills (chips up to 2 + overflow), Actions.",
    "Search by name. Filter by department (unique departments extracted from users).",
    "SavedViewsBar with filterable fields: role, department, skills, utilisation.",
    "Row click: opens User Skills Sheet (see 10.5).",
    "Actions: Edit allocation, Raise resource request.",
  ]);

  html += h3("Utilisation Heatmap Tab");
  html += ul([
    "Grid: team member rows × week columns.",
    "Cell value = util %. Cell colour: ≤80% = green, 81–100% = amber, >100% = red.",
    "Week range selector (4 / 8 / 12 / 26 / 52 weeks).",
    "Rendered by <code>&lt;UtilisationHeatmap&gt;</code> component.",
    "Data: GET /api/capacity-overview with date range params.",
  ]);

  html += h3("Resource Timeline Tab");
  html += ul([
    "Horizontal Gantt-style view: team member rows × time columns.",
    "Allocation bars coloured by project.",
    "Rendered by <code>&lt;ResourceTimeline&gt;</code> component.",
    "Create allocation inline by clicking empty cells (opens allocation dialog).",
  ]);

  html += h3("Skills Matrix Tab");
  html += ul([
    "Grid: skills (rows) × team members (columns).",
    "Cell: proficiency level dot — Needs Help (amber) | Independent (blue) | Can Lead (green).",
    "Rendered by <code>&lt;SkillsMatrix&gt;</code> component.",
    "Data: GET /api/user-skills (bulk) + GET /api/skills.",
  ]);

  html += h3("Resource Requests Tab");
  html += ul([
    "Table: Project, Role, Required Skills, Hours/wk, Start, End, Status, Priority, Days Since Raised, Actions.",
    "Status filter pill bar: All | Pending | Approved | Blocked | Rejected | Fulfilled | Cancelled.",
    "SavedViewsBar filters: status, role, skill, hours, neededByDate.",
    "Actions (admin/super_user): Approve, Reject (with reason), Block (with reason), Fulfill (assigns user).",
    "Fulfill opens Assign Dialog: shows top-3 AI-suggested candidates with match scores.",
    "Match score badge: 100%=green, 75–99%=emerald, 50–74%=amber, <50%=red.",
    "In-row chat: send messages about a request (GET/POST /api/resource-requests/:id/messages).",
  ]);

  html += h2("10.4 Resource Request — Assign Dialog");
  html += ul([
    "Opens when clicking 'Fulfill' on a Pending request.",
    "Top section: suggested candidates from AI endpoint POST /api/resources/suggest.",
    "Each candidate: avatar, name, role, match score badge, skill breakdown list.",
    "'Low match' candidates hidden by default; 'Show low matches' toggle reveals them.",
    "Manual assignment: user select dropdown as fallback.",
    "Confirm assign: PATCH /api/resource-requests/:id/status {status:'Fulfilled', assignedUserId}.",
  ]);

  html += h2("10.5 User Skills Sheet");
  html += ul([
    "Opens when editing a user's skills (from team capacity table or admin page).",
    "Lists current skills as removable badge chips.",
    "Add skill: select from workspace skill catalog dropdown + Add button.",
    "Each skill tag: name + proficiency level badge (Needs Help / Independent / Can Lead).",
    "Uses GET /api/users/:id/skills, POST /api/users/:id/skills, DELETE /api/users/:id/skills/:skillId.",
  ]);

  html += h2("10.6 API Connections");
  html += img(resApiUri, "Resources API endpoints");

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 11 — FINANCE
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("11. Finance Module");
  html += img(financeWireUri, "Finance screen wireframe");
  html += p("Gated to <code>invoicing.view</code> permission (account_admin + super_user only). Covers invoice lifecycle, automated billing schedules, revenue recognition, and contract management.");

  html += h2("11.1 Finance Summary KPIs");
  html += table(
    ["KPI","Description","Source"],
    [
      ["Total Invoiced","Cumulative billed amount across all invoices","GET /api/invoices/finance-summary"],
      ["Pending","Sum of In Review + Approved invoice amounts","GET /api/invoices/finance-summary"],
      ["Overdue","Sum of unpaid invoices past due date","GET /api/invoices/finance-summary"],
      ["Paid","Sum of invoices with status Paid","GET /api/invoices/finance-summary"],
      ["Revenue Bar Chart","Monthly revenue bar chart from GET /api/reports/revenue-by-period","Recharts BarChart"],
    ],
    ["20%","45%","35%"]
  );

  html += h2("11.2 Invoices Tab");
  html += ul([
    "Filter: project selector dropdown + search box.",
    "Sub-tabs: All | Draft | In Review | Approved | Paid (count badges).",
    "Table columns: Invoice # (auto-generated), Project, Account, Amount (+ tax), Issue Date, Due Date, Status badge, Actions.",
    "Quick status advance: '→ In Review', '→ Approved', '→ Paid' buttons on each row (based on current status).",
    "Status progression: Draft → In Review → Approved → Paid.",
    "Void: admin-only. Sets status to Void.",
    "Row click: opens Invoice Detail panel (right Sheet).",
  ]);

  html += h2("11.3 Invoice Detail Sheet");
  html += ul([
    "Project + Account header.",
    "Invoice metadata: #, issue date, due date, status.",
    "Description block.",
    "Amount + Tax table (auto-calculates total).",
    "Status history timeline.",
    "Action buttons: Edit (opens inline edit form), Delete (danger confirm), Generate from Timesheet (POST /api/invoices/from-timesheet/:timesheetId).",
    "Edit form fields: Description, Amount, Due Date, Status.",
  ]);

  html += h2("11.4 Create Invoice Dialog");
  html += fieldTable([
    ["Project","Select","Yes","Links invoice to project"],
    ["Account","Select","Yes","Auto-populated from project's account on project select"],
    ["Issue Date","Date","Yes","Defaults to today"],
    ["Due Date","Date","Yes","Defaults to today"],
    ["Description","Textarea","Yes","Invoice description text"],
    ["Amount","Currency","Yes","Invoice amount (excl. tax); min 0"],
    ["Tax","Number","No","Tax amount; default 0"],
  ]);

  html += h2("11.5 Billing Schedules Tab");
  html += ul([
    "Automates invoice creation based on rules.",
    "Table: Project, Schedule Name, Trigger Type, Trigger Value, Action, Amount/%, Status.",
    "Trigger Types: Date | Task Completion | Phase Completion | Manual.",
    "Action: CreateInvoice (creates a draft invoice when triggered).",
    "'Trigger Now' button: POST /api/billing-schedules/:id/trigger — creates invoice immediately.",
    "Delete: removes the schedule rule.",
    "Create dialog fields: Project*, Name*, Trigger Type*, Trigger Value, Amount, % of Budget.",
  ]);

  html += h2("11.6 Revenue Recognition Tab");
  html += ul([
    "Records revenue recognised per project per period.",
    "Bar chart: Revenue by Period (GET /api/reports/revenue-by-period).",
    "Table: Project, Period (YYYY-MM), Amount, Method, Recognised At, Notes, Actions.",
    "Methods: Percentage of Completion | Completed Contract | Time & Materials | Milestone | Straight Line.",
    "Create: project, period (month input), recognised at date, amount, method, notes.",
  ]);

  html += h2("11.7 Contracts Tab");
  html += ul([
    "Tracks project-linked contract documents.",
    "Table: Name, Project, Status, Start/End Dates, Value, Document URL, Notes, Created.",
    "Statuses: Draft | Active | Expired | Terminated.",
    "Document URL rendered as external link icon.",
    "CRUD via GET/POST/PATCH/DELETE /api/contracts.",
  ]);

  html += h2("11.8 API Connections");
  html += img(finApiUri, "Finance API endpoints");

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 12 — REPORTS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("12. Reports Module");
  html += img(reportsWireUri, "Reports screen wireframe");
  html += p("Gated to <code>reports.view</code>. Provides 8+ pre-built analytical reports as tabbed chart + table views, all with CSV export.");

  html += h2("12.1 Report Tabs");
  html += table(
    ["Tab","Chart Type","Key Filters","API Endpoint"],
    [
      ["Operations","Summary stats + table","Status, Health, Template filter","GET /api/reports/project-performance"],
      ["Budget vs Actuals","Horizontal bar (budget vs spent)","None","GET /api/reports/budget-vs-actuals"],
      ["Burn-Down","Dual line (ideal vs actual)","Project selector","GET /api/reports/burn-down/:projectId"],
      ["Revenue","Bar chart by period","Period grouping (week/month)","GET /api/reports/revenue-by-period"],
      ["Utilization","Grouped bar (billable vs non-billable)","Role, week range, sort metric","GET /api/reports/utilization"],
      ["Project Health","Pie / table breakdown","None","GET /api/reports/project-health"],
      ["Time Audit","Table: who logged what when","Date range, event type (submission/approval), role","GET /api/reports/time-audit"],
      ["CSAT","Star rating averages per project","None","GET /api/reports/csat"],
      ["Forecast","Area chart: ETC + EAC projections","Week range","GET /api/reports/forecast"],
      ["Custom","Builder UI (admin only)","Dimension + metric selectors","GET /api/reports/custom"],
    ],
    ["18%","22%","25%","35%"]
  );

  html += h2("12.2 Common Report Controls");
  html += ul([
    "<strong>Download CSV</strong>: client-side <code>downloadCSV()</code> from current filtered table data.",
    "<strong>Email Report</strong>: sends report snapshot to entered email (POST /api/reports/email).",
    "<strong>Save View</strong>: saves current filter combination as a named report view.",
    "Reports are accessible only to account_admin and super_user. Collaborators see Forbidden fallback.",
    "Custom Reports tab is account_admin only (<code>reports.createCustom</code>).",
  ]);

  html += h2("12.3 Budget vs Actuals Chart");
  html += ul([
    "Horizontal BarChart: one row per project.",
    "Budget bar: light violet (#c4b5fd).",
    "Spent bar: violet (#7c3aed) or red (#ef4444) if >90% used, amber (#f59e0b) if >75%.",
    "Summary cards above chart: Total Budget, Total Spent (% of budget), Remaining (avg % utilised).",
  ]);

  html += h2("12.4 Burn-Down Chart");
  html += ul([
    "Line chart: Ideal (grey dashed) vs Actual (violet solid).",
    "Project selector dropdown. Defaults to first active project.",
    "Footer stats: Total tasks, Completed (green), Remaining.",
    "X-axis: dates (formatted 'MMM DD'). Y-axis: task count.",
  ]);

  html += h2("12.5 Utilization Chart");
  html += ul([
    "Grouped bar chart per user.",
    "Bars: Billable hours (violet) + Non-Billable hours (grey).",
    "Metric toggle: Overall Util % | Billable Util %.",
    "Filters: week range (4/8/12/26/52 weeks), role filter, sort metric.",
    "Reference line at 80% (healthy threshold).",
  ]);

  html += h2("12.6 Project Performance Report (Operations Tab)");
  html += ul([
    "Table with per-project row: Project, Status, Health, On-Time Rate %, CSAT avg (star), Template used, Billing Type.",
    "Filters: search, status, health, template yes/no.",
    "Summary row: average on-time rate, average CSAT.",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 13 — COMMAND CENTER
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("13. Command Center Module");
  html += img(cmdWireUri, "Command Center screen wireframe");
  html += p("Executive-level read-only portfolio dashboard. Aggregates all active projects with financial, resource, and schedule data into a single strategic view. Gated to admin/super_user.");

  html += h2("13.1 KPI Row");
  html += table(
    ["KPI","Emphasis","Behaviour"],
    [
      ["Total Budget (all active projects)","default","Static display"],
      ["Overall Burn %","warn if >75%, danger if >90%","Static display"],
      ["Total Billed","default","Static display"],
      ["At-Risk Count (Amber+Red)","warn if >0","Click → scrolls to at-risk projects in table"],
      ["Over-Allocated Employees","warn if >0","Click → opens over-allocated section"],
      ["Open Resource Requests","warn if >0","Click → scrolls to open requests table"],
      ["Project Count","default","Total active project count"],
    ],
    ["35%","25%","40%"]
  );

  html += h2("13.2 Portfolio Table");
  html += ul([
    "Filterable by: search text, status, health bucket, account, PM, grouping (by Account / by PM / no grouping).",
    "Columns: Project, Account, PM, Health (dot), Status, SOW Budget, Change Orders, Total Budget, Actuals, EAC, Hours (Planned vs Actual), Completion %, Start, Due, Days Remaining.",
    "Row: click → navigates to /projects/:id.",
    "Grouping: collapsible accordion rows when grouped by Account or PM.",
    "Health colouring: green/amber/red row background tint.",
    "<strong>Export CSV</strong> button: exports full portfolio table as projects-portfolio.csv.",
    "Last refreshed timestamp shown in header.",
    "Manual refresh button (RefreshCw icon) → re-fetches GET /api/command-center/portfolio.",
  ]);

  html += h2("13.3 Over-Allocated Employees Panel");
  html += ul([
    "Collapsible section below main table.",
    "One row per over-allocated employee: Avatar, Name, Role, Department, Capacity, Allocated, Util %.",
    "Expandable sub-rows: projects the employee is allocated to with hours/week.",
    "Data from <code>payload.overAllocatedEmployees</code> in the portfolio response.",
  ]);

  html += h2("13.4 Budget Alerts Panel");
  html += ul([
    "Alert types: spend_over_90 (red), hours_over_plan (amber), eac_over_budget (orange), no_budget (grey).",
    "Each alert row: project name link + alert message.",
    "Data from <code>payload.budgetAlerts</code>.",
  ]);

  html += h2("13.5 Utilisation Heatmap Section");
  html += ul([
    "Embedded <code>&lt;UtilisationHeatmap&gt;</code> component (same as Resources tab).",
    "Shows team-wide utilisation snapshot for the current planning horizon.",
  ]);

  html += h2("13.6 API Connections");
  html += table(["Method","Endpoint","Purpose"],
    [["GET","/api/command-center/portfolio","Full portfolio payload: KPIs, projects, over-alloc, alerts"]],
    ["10%","40%","50%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 14 — ADMIN SETTINGS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("14. Admin Settings Module");
  html += img(adminWireUri, "Admin settings screen wireframe");
  html += p("Horizontally scrollable 17-tab settings panel. Gated to account_admin (full) and super_user (partial). Each tab manages a distinct system entity.");

  html += h2("14.1 Tab Overview");
  html += table(
    ["Tab","Description","Min Role"],
    [
      ["Users","User management + role assignment + secondary roles","super_user"],
      ["Project Templates","Create/edit/delete reusable project templates","super_user"],
      ["Document Templates","Manage document template library (Rich Text / Spreadsheet / PDF / Link)","super_user"],
      ["Skills Matrix","Skill categories + skill catalog management","super_user"],
      ["Job Roles","Define job role titles for resource planning","super_user"],
      ["Tax Codes","Create/edit/delete tax codes (name + rate %)","super_user"],
      ["Time Categories","Time entry category labels (e.g. Development, Meetings)","super_user"],
      ["Task Statuses","Custom task status workflow with drag-reorder","super_user"],
      ["Time Settings","Weekly capacity, approval mode, lock date, week start day, etc.","account_admin"],
      ["Holiday Calendars","Create calendars + add holiday dates per calendar","super_user"],
      ["Rate Cards","Billable rate definitions per role (gated: financials.viewRateCards)","account_admin"],
      ["Custom Fields","Add custom fields to projects/tasks (type: text/number/date/boolean/select)","super_user"],
      ["Activity Defaults","Default activity/category options for time logging","super_user"],
      ["Placeholders","Unnamed resource slots for capacity planning","super_user"],
      ["Audit Log","Full system audit trail (who changed what when)","account_admin"],
      ["Company Settings","Workspace name, logo, timezone, currency","account_admin"],
      ["Archived Projects","View and restore soft-deleted projects","account_admin"],
    ],
    ["22%","56%","22%"]
  );

  html += h2("14.2 Users Tab — Management Sub-tab");
  html += ul([
    "Table: Avatar, Name, Email, Role (canonical), Department, Secondary Roles (comma-separated badges), Skills count, Last Active, Actions.",
    "Actions: Edit (opens User Edit Sheet), Deactivate, Manage Skills (opens UserSkillsDialog).",
    "Create User: opens New User Dialog. Fields: Name*, Email*, Role*, Department.",
    "Role constraint: user cannot assign a role higher than their own (<code>ALLOWED_ASSIGNMENTS</code> matrix).",
    "Secondary roles allow multi-role access (e.g., PM + Finance).",
  ]);

  html += h2("14.3 Users Tab — Configuration Sub-tab");
  html += ul([
    "Per-user role assignment matrix displayed as a table.",
    "Inline role dropdowns per user row.",
    "Approval routing config: who approves timesheets for each user.",
    "Toggle: account_admin | super_user | collaborator | customer selectable per user.",
  ]);

  html += h2("14.4 Time Settings Tab");
  html += fieldTable([
    ["Weekly Capacity Hours","Number","Yes","Default hours per week per user (e.g. 40)"],
    ["Approval Mode","Select","Yes","Manual (manager reviews) | Auto (approve on submit)"],
    ["Lock Before Date","Date","No","Prevents editing entries before this date"],
    ["Week Start Day","Select","Yes","Monday | Sunday"],
    ["Minimum Submit Hours","Number","No","Min total hours required before timesheet can be submitted"],
    ["Approval Routing","Select","Yes","Account Admins (default) | Designated Approver | Project Owners"],
    ["Date Lock Override Roles","Multi-select","No","Roles that can edit past locked dates"],
    ["Billability Enforcement","Select","No","None | Tasks only | Projects only | Both"],
    ["Invoice Generation Scope","Select","No","All entries | Approved only"],
  ]);

  html += h2("14.5 Task Statuses Tab");
  html += ul([
    "List of custom status definitions with drag-reorder (ArrowUp/ArrowDown buttons).",
    "Fields: Name, Color, Icon, Is Terminal (boolean), Is Default (boolean).",
    "Drag-reorder calls POST /api/task-status-definitions/reorder.",
    "Default statuses provided: To Do, In Progress, Blocked, Done, Cancelled.",
  ]);

  html += h2("14.6 Rate Cards Tab");
  html += ul([
    "Visible only to account_admin (financials.viewRateCards permission).",
    "Table: Card Name, Description, Rates (count), Default, Active, Created, Actions.",
    "Each rate card has line items: Role → Hourly Rate.",
    "Expand row to see role-rate pairs.",
    "CRUD: create/edit/delete rate cards and their role rates.",
  ]);

  html += h2("14.7 Custom Fields Tab");
  html += ul([
    "Define extra fields for Projects and Tasks.",
    "Field types: text | number | date | boolean | select (with options list).",
    "Fields appear in the Project Edit dialog and Task Detail Sheet under a 'Custom Fields' section.",
    "Max 20 custom fields per entity type.",
  ]);

  html += h2("14.8 Audit Log Tab");
  html += ul([
    "Read-only table: Timestamp, Actor (name + role), Action (created/updated/deleted), Entity Type, Entity ID/Name, Old Value (JSON), New Value (JSON).",
    "Filters: date range picker, actor, entity type.",
    "Paginated (50 rows/page).",
    "CSV export button.",
    "Data: GET /api/audit-log.",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 15 — NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("15. Notifications Module");

  html += h2("15.1 Notification Inbox (/notifications)");
  html += ul([
    "Full-page notification inbox. Max-width container (max-w-3xl, centred).",
    "Page header: 'Notifications' title + 'Mark all read' button (shown when unread count > 0) + 'Clear read' button.",
    "List of notification cards.",
    "Unread notifications: white background. Read: muted background.",
    "Each card: icon (type-specific), title/message, relative time stamp, × dismiss button.",
    "Click card → marks as read + navigates to linked entity.",
    "Dismiss (×) → DELETE /api/notifications/:id.",
  ]);

  html += h2("15.2 Notification Types");
  html += table(
    ["Type","Icon","Colour","Navigation Target"],
    [
      ["project_alert","AlertCircle","red","→ /projects/:projectId"],
      ["invoice_paid","DollarSign","green","→ /finance"],
      ["task_assigned","Briefcase","blue","→ /projects/:projectId"],
      ["timesheet_reminder","Clock","amber","→ /time"],
      ["default","Bell","primary","No navigation"],
    ],
    ["22%","18%","15%","45%"]
  );

  html += h2("15.3 API Connections");
  html += table(["Method","Endpoint","Purpose"],
    [
      ["GET","/api/notifications","Fetch all notifications for current user"],
      ["PATCH","/api/notifications/:id/read","Mark single notification as read"],
      ["DELETE","/api/notifications/:id","Dismiss (delete) notification"],
      ["PUT","/api/notification-preferences","Update notification preference settings"],
    ],
    ["10%","38%","52%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 16 — GLOBAL COMPONENTS & DESIGN SYSTEM
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("16. Global Components & Design System");

  html += h2("16.1 Component Inventory");
  html += table(
    ["Component","File","Usage"],
    [
      ["Layout","components/layout.tsx","Root shell: sidebar + header + notification popover. Wraps all pages."],
      ["PageHeader","components/page-header.tsx","Page title + breadcrumbs. Accepts title, description, breadcrumbs[], actions slot."],
      ["TimesheetGrid","components/timesheet-grid.tsx","Weekly time entry grid. Props: userId, weekStartDay, initialWeekStart."],
      ["CreateProjectWizard","components/create-project-wizard.tsx","Multi-step project creation dialog."],
      ["UtilisationHeatmap","components/utilisation-heatmap.tsx","Member × Week colour grid. Props: dateRange, teamData."],
      ["ResourceTimeline","components/resource-timeline.tsx","Gantt-style allocation timeline."],
      ["SkillsMatrix","components/skills-matrix.tsx","Skills × Members matrix grid."],
      ["ResourceKpiBar","components/resource-kpi-bar.tsx","KPI tile row for Resources page."],
      ["SavedViewsBar","components/saved-views-bar.tsx","Saved filter pill bar. Props: entity, fields, value, onChange."],
      ["TaskTree","components/task-tree.tsx","Recursive tree view for tasks/subtasks with TreeToggle."],
      ["InvoiceDetail","components/invoice-detail.tsx","Invoice detail Sheet panel."],
      ["TemplateEditor","components/template-editor.tsx","Project template CRUD UI (used in Admin)."],
      ["TimeLogAssistant","components/time-log-assistant.tsx","AI-powered time entry Sheet panel."],
      ["OnboardingChecklist","components/onboarding-checklist.tsx","Admin-only setup checklist card on dashboard."],
      ["StatusBadge","components/ui/status-badge.tsx","Colour-coded status pill. Accepts status string."],
    ],
    ["22%","30%","48%"]
  );

  html += h2("16.2 Design Tokens (Tailwind Config)");
  html += table(
    ["Token","Value","Usage"],
    [
      ["Primary / Violet","#7c3aed (violet-700)","Buttons, active nav, chart accent, section headers"],
      ["Primary Light","#5b21b6 (violet-800)","Hover states, dark nav elements"],
      ["Muted","#f1f5f9 (slate-100)","Table alternate row, input backgrounds"],
      ["Muted Foreground","#64748b (slate-500)","Secondary text, placeholders"],
      ["Destructive","#ef4444 (red-500)","Delete actions, overdue indicators, error messages"],
      ["Warning","#f59e0b (amber-500)","At-Risk health, timer running, pending states"],
      ["Success","#10b981 (emerald-500)","Completed states, On Track health, positive metrics"],
      ["Border","#e2e8f0 (slate-200)","All borders, dividers, table lines"],
      ["Font","Inter, system-ui, sans-serif","Body. Headings same stack at larger weights."],
      ["Border Radius","6px (rounded-md)","Cards, buttons, inputs, badges"],
      ["Shadow","shadow-sm","Cards, dropdown menus, popovers"],
    ],
    ["22%","28%","50%"]
  );

  html += h2("16.3 shadcn/ui Component Usage");
  html += ul([
    "<code>Dialog</code> — all create/edit/confirm modals. Always has DialogHeader + DialogFooter.",
    "<code>Sheet</code> — right-side panels (project detail sub-views, invoice detail, user skills). Width: 480–600px.",
    "<code>Tabs / TabsList / TabsTrigger / TabsContent</code> — all tabbed interfaces.",
    "<code>Table</code> — all data tables. Striped via Tailwind even:bg- classes.",
    "<code>Badge</code> — status chips, role indicators, skill tags.",
    "<code>Select</code> — all dropdowns (project select, user select, status select).",
    "<code>Avatar / AvatarFallback</code> — user initials display (no image uploads).",
    "<code>Progress</code> — budget bars, utilisation bars.",
    "<code>Skeleton</code> — loading placeholders matching element shape.",
    "<code>Toast</code> — success/error notifications (top-right, auto-dismiss 4s).",
    "<code>Collapsible</code> — gantt phase rows, audit log expansion, admin accordion sections.",
    "<code>Tooltip</code> — icon hover labels, truncated text titles.",
    "<code>Popover</code> — notification bell popover, filter popovers.",
    "<code>DropdownMenu</code> — ⋮ action menus on table rows.",
  ]);

  html += h2("16.4 Form Patterns");
  html += infoBox("Standard Form Implementation Pattern", [
    "All forms use <code>react-hook-form</code> with <code>zodResolver</code>.",
    "Form fields wrapped in <code>&lt;FormField&gt; → &lt;FormItem&gt; → &lt;FormLabel&gt; + &lt;FormControl&gt; + &lt;FormMessage&gt;</code>.",
    "<code>FormMessage</code> renders inline error below each field on blur/submit.",
    "Submit button shows loading spinner (<code>isPending</code> from mutation) and is disabled during submission.",
    "Toast on success; toast with variant='destructive' on API error.",
    "Dialog/Sheet closes on success; form resets to defaultValues.",
  ]);

  html += h2("16.5 Loading & Error States");
  html += table(
    ["State","Pattern","Component"],
    [
      ["Loading (data fetch)","Skeleton placeholder matching shape of content","<code>&lt;Skeleton className='h-X w-full'/&gt;</code>"],
      ["Loading (mutation)","Button disabled + spinner inside button","<code>disabled={isPending}</code>"],
      ["Empty state","Centred icon + message + optional CTA button","Custom per-section"],
      ["Error state","Red destructive toast (auto-dismiss)","<code>useToast() variant='destructive'</code>"],
      ["Forbidden","Full-page Forbidden component at /forbidden","<code>&lt;Forbidden/&gt;</code>"],
    ],
    ["20%","50%","30%"]
  );

  html += h2("16.6 Filter Evaluator System");
  html += ul([
    "<code>lib/filter-evaluator.ts</code> provides a reusable client-side filter engine.",
    "Types: <code>FieldDef</code> (id, label, type: text|number|date|enum), <code>FilterValue</code>.",
    "Function: <code>evaluateFilters(rows, filterValue, fields)</code> → filtered array.",
    "Used by: Resources (people + requests), Prospects, Accounts.",
    "Saved Views integration: <code>SavedViewsBar</code> reads/writes FilterValue objects to POST /api/saved-views.",
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 17 — RBAC / PERMISSIONS MATRIX
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("17. RBAC / Permissions Matrix");
  html += p("BusinessNow PSA uses a two-layer permission model: account-level (global role) and project-level (per-project role). Permissions are defined in <code>api-server/src/constants/permissions.ts</code>.");

  html += h2("17.1 Account Roles");
  html += table(
    ["Canonical Role","Display Name","Description"],
    [
      ["account_admin","Account Admin","Full access including billing, integrations, advanced settings, all reports"],
      ["super_user","Super User (PM)","Can manage projects, resources, invoicing. Cannot access cost rates, custom reports, or system settings"],
      ["collaborator","Collaborator","Can view projects/accounts, log time, create tasks. No financial or admin access"],
      ["customer","Customer","No access by default. Invited to specific projects only (project-level roles)"],
    ],
    ["20%","22%","58%"]
  );

  html += h2("17.2 Account-Level Permission Matrix");
  html += img(rbacUri, "RBAC permission matrix");

  html += h2("17.3 Project-Level Roles");
  html += table(
    ["Project Role","Description"],
    [
      ["admin","Full project management: change name, dates, owner, manage members, update status, delete"],
      ["collaborator","Participate in tasks, add vendor/customer members, create spaces, post status updates"],
      ["customer","Can create tasks, add customer members, rate milestones, view public content"],
    ],
    ["18%","82%"]
  );

  html += h2("17.4 Role Resolution");
  html += infoBox("Role Resolution Logic", [
    "Both legacy Title-Case ('Admin', 'PM', 'Finance') and canonical snake_case ('account_admin', 'super_user') role strings are accepted.",
    "Resolved via <code>resolveRole()</code> before permission lookup.",
    "Project role is capped by account role via <code>resolveProjectRole(accountRole, projectRole)</code>.",
    "Frontend: <code>useAccountPermissions(activeRole)</code> hook returns a <code>checkPerm(key)</code> function.",
    "Backend: <code>requirePermission('permission.key')</code> middleware factory + <code>requireAdmin</code>, <code>requirePM</code>, <code>requireFinance</code> shortcuts.",
    "RBAC failures return HTTP 403 with error message.",
  ]);

  html += h2("17.5 Frontend Permission Gate Components");
  html += table(
    ["Pattern","Usage","Example"],
    [
      ["<code>checkPerm('key')</code>","Inline conditional rendering","<code>{checkPerm('projects.create') && &lt;Button&gt;New Project&lt;/Button&gt;}</code>"],
      ["<code>&lt;RequirePermission perm='key'&gt;</code>","Wraps protected sections","Renders children or &lt;Forbidden&gt; based on active role"],
      ["<code>can(activeRole, 'key')</code>","Imperative check in event handlers","Called in admin tab rendering to conditionally show tabs"],
    ],
    ["30%","30%","40%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 18 — API ENDPOINT REFERENCE
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("18. API Endpoint Reference");
  html += p("All endpoints are prefixed <code>/api</code>. Auth via <code>x-user-id</code> + <code>x-user-role</code> headers. Base URL: relative path (proxied via Vite dev server in dev; same-origin in production).");

  html += h2("18.1 Projects API");
  html += img(projApiUri, "Projects API");

  html += h2("18.2 Time Tracking API");
  html += img(timeApiUri, "Time Tracking API");

  html += h2("18.3 Finance API");
  html += img(finApiUri, "Finance API");

  html += h2("18.4 Resources API");
  html += img(resApiUri, "Resources API");

  html += h2("18.5 Additional Endpoints (Reference)");
  html += table(
    ["Method","Endpoint","Auth","Description"],
    [
      ["GET","GET /api/accounts","accounts.view","List CRM accounts"],
      ["POST","POST /api/accounts","accounts.create","Create account"],
      ["GET","GET /api/prospects","authenticated","List prospects"],
      ["GET","GET /api/opportunities","authenticated","List opportunities"],
      ["GET","GET /api/users","authenticated","List workspace users"],
      ["GET","GET /api/reports/project-health","reports.view","Project health distribution"],
      ["GET","GET /api/reports/utilization","reports.view","Team utilisation data"],
      ["GET","GET /api/reports/csat","reports.view","CSAT ratings aggregated"],
      ["GET","GET /api/reports/time-audit","reports.view","Time entry audit trail"],
      ["GET","GET /api/command-center/portfolio","reports.view","Full portfolio payload"],
      ["GET","GET /api/notifications","authenticated","User notifications"],
      ["DELETE","DELETE /api/notifications/:id","authenticated","Dismiss notification"],
      ["GET","GET /api/audit-log","account_admin","System audit trail"],
      ["GET","GET /api/saved-views","authenticated","User's saved filter views"],
      ["POST","POST /api/saved-views","authenticated","Save a filter view"],
      ["GET","GET /api/skills","authenticated","Skill catalog"],
      ["GET","GET /api/time-settings","account_admin","Time tracking configuration"],
      ["PATCH","PATCH /api/time-settings","account_admin","Update time tracking config"],
      ["GET","GET /api/holiday-calendars","authenticated","Holiday calendars"],
      ["GET","GET /api/rate-cards","financials.viewRateCards","Billing rate cards"],
    ],
    ["10%","32%","20%","38%"]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SECTION 19 — RESPONSIVE & ACCESSIBILITY
  // ═══════════════════════════════════════════════════════════════════════════
  html += `</div><div class="page-break">`;
  html += h1("19. Responsive & Accessibility Guidelines");

  html += h2("19.1 Breakpoint Strategy");
  html += table(
    ["Breakpoint","Width","Layout Behaviour"],
    [
      ["Mobile (sm)","< 640px","Single-column layout. Tables → card lists. Sidebar → hamburger drawer. KPI tiles stack 2×3."],
      ["Tablet (md)","640–1023px","Two-column layout for forms and lists. Sidebar collapsed (icon rail). Table pagination active."],
      ["Desktop (lg+)","1024px+","Full sidebar. Multi-column tables. Split-pane detail sheets. Full Gantt visible."],
    ],
    ["22%","18%","60%"]
  );

  html += h2("19.2 Module-Specific Responsive Notes");
  html += table(
    ["Module","Mobile Adaptation"],
    [
      ["Projects List","Table → Card per project. Bulk select hidden on mobile."],
      ["Project Detail","Tabs scroll horizontally. Gantt replaced by simple task list on mobile."],
      ["Timesheet Grid","Horizontal scroll. Day columns compress. Add Row floats at bottom."],
      ["Kanban Board","Single-column: one stage visible at a time + swipe or stage picker."],
      ["Finance","Invoice table → stacked cards. Amount + status prominent."],
      ["Reports","Charts 100% width. Stacked layout. CSV export still available."],
      ["Admin","Tabs scroll horizontally. Data tables compress to key columns."],
      ["Command Center","KPI tiles 2-per-row. Portfolio table horizontal scrollable."],
    ],
    ["25%","75%"]
  );

  html += h2("19.3 Accessibility Requirements");
  html += ul([
    "<strong>Keyboard Navigation</strong>: All interactive elements reachable via Tab. Modals/Sheets trap focus. Escape key closes overlays.",
    "<strong>ARIA Labels</strong>: All icon-only buttons have <code>aria-label</code>. Modal dialogs have <code>aria-labelledby</code> pointing to DialogTitle.",
    "<strong>Colour Contrast</strong>: Primary violet (#7c3aed) on white meets WCAG AA (4.5:1 for normal text). Red/green status indicators supplemented with text labels (not colour alone).",
    "<strong>Screen Reader Support</strong>: shadcn/ui Radix primitives provide full ARIA role/state attributes out of the box. Status badges include hidden <code>sr-only</code> text.",
    "<strong>Form Labels</strong>: All form inputs have associated <code>&lt;label&gt;</code> elements via FormLabel. Required fields marked with * and <code>aria-required='true'</code>.",
    "<strong>Loading Announcements</strong>: Skeleton loading states should be wrapped with <code>aria-live='polite'</code> regions in screen-reader builds.",
    "<strong>Focus Visible</strong>: Tailwind <code>focus:ring-2 focus:ring-violet-500</code> applied to all interactive elements.",
    "<strong>Tables</strong>: All data tables use <code>&lt;th scope='col'&gt;</code> headers. Sortable columns include <code>aria-sort</code> attribute.",
    "<strong>Toast Notifications</strong>: Rendered in a live region so screen readers announce them. Auto-dismiss at 4 seconds (configurable).",
    "<strong>Drag & Drop</strong>: Kanban drag-drop supplemented with ⋮ menu 'Move to stage' option as keyboard alternative.",
  ]);

  html += h2("19.4 Performance Guidelines");
  html += ul([
    "<strong>TanStack Query caching</strong>: All list queries have <code>staleTime: 30_000</code> minimum. Avoid redundant refetches on tab switch.",
    "<strong>Skeleton-first rendering</strong>: Every data-dependent section shows <code>&lt;Skeleton&gt;</code> on first load. Never blank white space.",
    "<strong>Pagination</strong>: Tables with >50 rows should use server-side pagination (limit/offset params on API calls).",
    "<strong>Debounce search</strong>: All search inputs debounce at 300ms before triggering filter.",
    "<strong>Chart lazy loading</strong>: Reports charts use <code>ResponsiveContainer</code>; only render when tab is active.",
    "<strong>Large sheets</strong>: Resource Timeline and Utilisation Heatmap should virtualise rows (react-virtual) when team size >50.",
  ]);

  // ── Footer ────────────────────────────────────────────────────────────────
  html += `<div style="margin-top:48px;border-top:2px solid #7c3aed;padding-top:16px;text-align:center;color:#94a3b8;font-size:11px">
    <p>BusinessNow PSA — Frontend Blueprint Document v1.0 | May 2026 | Confidential</p>
    <p>Developer-ready specification. All field names, API endpoints, and permission keys are sourced directly from production codebase.</p>
  </div>`;

  html += `</body></html>`;

  // ── Write HTML ─────────────────────────────────────────────────────────────
  fs.writeFileSync(HTML_OUT, html, "utf8");
  console.log(`HTML written → ${HTML_OUT}`);

  // ── Convert to DOCX ────────────────────────────────────────────────────────
  const docxBuffer = await HTMLtoDOCX(html, null, {
    table: { row: { cantSplit: true } },
    footer: true,
    pageNumber: true,
    title: "BusinessNow PSA — Frontend Blueprint Document",
    margins: { top: 900, right: 1000, bottom: 900, left: 1000 },
  });
  fs.writeFileSync(DOCX_OUT, docxBuffer);
  console.log(`DOCX written → ${DOCX_OUT}`);
  console.log("Done!");
}

main().catch(err => { console.error(err); process.exit(1); });
