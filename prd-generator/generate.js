#!/usr/bin/env node
"use strict";

const path = require("path");
const fs   = require("fs");
const { execFileSync } = require("child_process");

const data         = require("./src/data");
const { generateHTML } = require("./src/html");

const OUT_DIR  = path.join(__dirname, "output");
const HTML_OUT = path.join(OUT_DIR, "prd.html");
const PDF_OUT  = path.join(OUT_DIR, "prd.pdf");

const WKHTMLTOPDF_PATHS = [
  "/nix/store/hxiay4lkq4389vxnhnb3d0pbaw6siwkw-wkhtmltopdf/bin/wkhtmltopdf",
  "/usr/bin/wkhtmltopdf",
  "wkhtmltopdf",
];
function findWk() {
  for (const p of WKHTMLTOPDF_PATHS) {
    try {
      if (p.startsWith("/") && fs.existsSync(p)) return p;
      execFileSync(p, ["--version"], { stdio: "pipe" });
      return p;
    } catch {}
  }
  return null;
}

/* ── Tiny logger ── */
const c = (code) => (s) => `\x1b[${code}m${s}\x1b[0m`;
const navy = c(34), green = c(32), red = c(31), grey = c(90), bold = c(1);
const log = {
  step: (m) => console.log(`\n${bold(navy("▶"))} ${bold(m)}`),
  ok:   (m) => console.log(`  ${green("✔")}  ${m}`),
  info: (m) => console.log(`  ${grey("→")}  ${grey(m)}`),
  err:  (m) => console.log(`  ${red("✖")}  ${red(m)}`),
};

(function main() {
  console.log(navy("\n══════════════════════════════════════════════════════════════"));
  console.log(navy("  ") + bold("BusinessNow PSA — PRD Generator"));
  console.log(navy("══════════════════════════════════════════════════════════════\n"));

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  // 1. HTML
  log.step("Generating HTML");
  log.info(`${data.modules.length} modules · ${data.userStories.length} user stories · ${data.workflows.length} workflows`);
  const html = generateHTML(data);
  fs.writeFileSync(HTML_OUT, html);
  log.ok(`HTML written  (${(fs.statSync(HTML_OUT).size / 1024).toFixed(1)} KB)`);

  // 2. PDF
  log.step("Generating PDF");
  const wk = findWk();
  if (!wk) {
    log.err("wkhtmltopdf not found — skipping PDF");
    return;
  }
  log.info(`Using ${wk}`);

  const args = [
    "--quiet",
    "--page-size", "A4",
    "--orientation", "Portrait",
    "--margin-top", "12mm",
    "--margin-bottom", "14mm",
    "--margin-left", "10mm",
    "--margin-right", "10mm",
    "--encoding", "UTF-8",
    "--print-media-type",
    "--enable-local-file-access",
    "--disable-smart-shrinking",
    "--load-error-handling", "ignore",
    "--load-media-error-handling", "ignore",
    "--javascript-delay", "300",
    "--footer-font-size", "8",
    "--footer-font-name", "Segoe UI",
    "--footer-left",   "BusinessNow PSA · PRD v" + data.meta.version,
    "--footer-center", data.meta.classification,
    "--footer-right",  "Page [page] of [topage]",
    "--footer-spacing", "4",
    HTML_OUT,
    PDF_OUT,
  ];

  try {
    execFileSync(wk, args, { stdio: "pipe", timeout: 120_000 });
  } catch (err) {
    if (!fs.existsSync(PDF_OUT)) {
      const msg = err.stderr ? err.stderr.toString().slice(0, 400) : err.message;
      log.err(`wkhtmltopdf failed: ${msg}`);
      return;
    }
    // wkhtmltopdf often exits with code 1 on harmless network warnings
  }

  const size = fs.existsSync(PDF_OUT) ? fs.statSync(PDF_OUT).size : 0;
  if (size < 1000) {
    log.err(`PDF too small (${size}B) — likely failed`);
    return;
  }
  log.ok(`PDF written  (${(size / 1024).toFixed(1)} KB)`);

  // Summary
  console.log(navy("\n──────────────────────────────────────────────────────────────"));
  console.log("  " + bold("OUTPUT FILES"));
  console.log(navy("──────────────────────────────────────────────────────────────"));
  console.log(`  ${green("●")} HTML  ${bold((fs.statSync(HTML_OUT).size / 1024).toFixed(1) + " KB")}`);
  console.log(`     ${grey(HTML_OUT)}`);
  console.log(`  ${green("●")} PDF   ${bold((size / 1024).toFixed(1) + " KB")}`);
  console.log(`     ${grey(PDF_OUT)}`);
  console.log(navy("──────────────────────────────────────────────────────────────\n"));
})();
