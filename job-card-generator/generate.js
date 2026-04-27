#!/usr/bin/env node
"use strict";

const path = require("path");
const fs   = require("fs");
const log  = require("./src/utils/logger");

const OUTPUT_DIR      = path.join(__dirname, "output");
const SCREENSHOTS_DIR = path.join(__dirname, "screenshots");

// Ensure output directories exist
[OUTPUT_DIR, SCREENSHOTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// ── Parse CLI flags ─────────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const format = (args.find(a => a.startsWith("--format="))?.split("=")[1]) ||
               (args[args.indexOf("--format") + 1]) ||
               "all";
const doScreenshot = args.includes("--screenshot");

async function main() {
  log.banner("Enterprise Job Card Generator  ·  Meridian Advisory Group");

  // Load sample data
  log.section("Loading job card data");
  const { SAMPLE_JOB } = require("./src/data/sample-job");
  log.done("Sample data loaded", `${Object.keys(SAMPLE_JOB).length} sections`);

  const outputFiles = [];

  // ── 1. HTML ───────────────────────────────────────────────────────────────
  if (format === "all" || format === "html" || format === "pdf") {
    log.section("Generating HTML");
    log.step("Building document structure", "26 sections");
    const { buildHTML } = require("./src/generators/html");
    const html = buildHTML(SAMPLE_JOB);
    const htmlPath = path.join(OUTPUT_DIR, "job-card.html");
    fs.writeFileSync(htmlPath, html, "utf-8");
    const htmlSize = fs.statSync(htmlPath).size;
    log.done("HTML generated", `${(htmlSize / 1024).toFixed(1)} KB`);

    if (format === "all" || format === "html") {
      outputFiles.push({ label: "HTML", path: htmlPath, size: htmlSize });
    }

    // ── 2. PDF ────────────────────────────────────────────────────────────
    if (format === "all" || format === "pdf") {
      log.section("Generating PDF (via wkhtmltopdf)");
      const { generatePDF, getWkhtmltopdfBin } = require("./src/generators/pdf");
      const bin = getWkhtmltopdfBin();
      if (!bin) {
        log.warn("wkhtmltopdf not found — skipping PDF generation");
        log.info("Install wkhtmltopdf or add the nix bin to PATH");
      } else {
        log.step("Running wkhtmltopdf", path.basename(bin));
        try {
          const pdfPath = path.join(OUTPUT_DIR, "job-card.pdf");
          const result = generatePDF(htmlPath, pdfPath, {
            title: SAMPLE_JOB.project.name,
            footer: true,
          });
          log.done("PDF generated", `${(result.size / 1024).toFixed(0)} KB`);
          outputFiles.push({ label: "PDF", path: pdfPath, size: result.size });
        } catch (err) {
          log.error(`PDF generation failed: ${err.message}`);
        }
      }
    }
  }

  // ── 3. MARKDOWN ───────────────────────────────────────────────────────────
  if (format === "all" || format === "markdown") {
    log.section("Generating Markdown");
    const { buildMarkdown } = require("./src/generators/markdown");
    const md = buildMarkdown(SAMPLE_JOB);
    const mdPath = path.join(OUTPUT_DIR, "job-card.md");
    fs.writeFileSync(mdPath, md, "utf-8");
    const mdSize = fs.statSync(mdPath).size;
    log.done("Markdown generated", `${(mdSize / 1024).toFixed(1)} KB`);
    outputFiles.push({ label: "Markdown", path: mdPath, size: mdSize });
  }

  // ── 4. DOCX ───────────────────────────────────────────────────────────────
  if (format === "all" || format === "docx") {
    log.section("Generating DOCX");
    try {
      const { generateDOCX } = require("./src/generators/docx");
      const docxPath = path.join(OUTPUT_DIR, "job-card.docx");
      log.step("Building Word document", "styles, tables, headers, footers");
      const result = await generateDOCX(SAMPLE_JOB, docxPath);
      log.done("DOCX generated", `${(result.size / 1024).toFixed(0)} KB`);
      outputFiles.push({ label: "DOCX (Word)", path: docxPath, size: result.size });
    } catch (err) {
      log.error(`DOCX generation failed: ${err.message}`);
      if (process.env.DEBUG) console.error(err);
    }
  }

  // ── 5. SCREENSHOTS ────────────────────────────────────────────────────────
  if (format === "all" || doScreenshot) {
    log.section("Capturing Screenshots (via wkhtmltoimage)");
    const { captureScreenshot, captureURL, getWkhtmltoimageBin } = require("./src/generators/screenshots");
    const bin = getWkhtmltoimageBin();

    if (!bin) {
      log.warn("wkhtmltoimage not found — skipping screenshot capture");
    } else {
      const htmlPath = path.join(OUTPUT_DIR, "job-card.html");

      // Capture the full HTML document as a screenshot
      const shots = [
        { input: htmlPath, output: "job-card-preview.png",         label: "Full document preview" },
      ];

      // Demo URLs — capture if accessible
      const urlShots = [
        { url: "https://www.salesforce.com", out: "01-salesforce.png",  label: "Salesforce.com" },
        { url: "https://status.mulesoft.com",out: "03-mulesoft.png",    label: "MuleSoft Status" },
      ];

      for (const s of shots) {
        log.step(s.label);
        const outPath = path.join(SCREENSHOTS_DIR, s.output);
        const result = captureScreenshot(s.input, outPath, { width: 1400 });
        if (result.success) {
          log.done(s.label, `${(result.size / 1024).toFixed(0)} KB → ${s.output}`);
          outputFiles.push({ label: `Screenshot: ${s.label}`, path: outPath, size: result.size });
        } else {
          log.warn(`${s.label}: ${result.reason}`);
        }
      }

      for (const s of urlShots) {
        log.step(`URL screenshot: ${s.label}`);
        const outPath = path.join(SCREENSHOTS_DIR, s.out);
        const result = captureURL(s.url, outPath, { width: 1280, delay: 3000 });
        if (result.success) {
          log.done(`Captured ${s.label}`, `${(result.size / 1024).toFixed(0)} KB → ${s.out}`);
          outputFiles.push({ label: `URL screenshot: ${s.label}`, path: outPath, size: result.size });
        } else {
          log.warn(`URL screenshot failed: ${result.reason}`);
        }
      }
    }
  }

  // ── SUMMARY ───────────────────────────────────────────────────────────────
  if (outputFiles.length > 0) {
    log.summary(outputFiles);
    log.info(`All files saved to: ${OUTPUT_DIR}`);
    log.info(`Screenshots saved to: ${SCREENSHOTS_DIR}`);
  } else {
    log.warn("No files generated. Check --format flag.");
  }

  log.info("Done. Open output/job-card.html in a browser for the best viewing experience.");
}

main().catch(err => {
  console.error("\n  ✖  Fatal error:", err.message);
  if (process.env.DEBUG) console.error(err.stack);
  process.exit(1);
});
