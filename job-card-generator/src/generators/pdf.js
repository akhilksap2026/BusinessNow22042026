"use strict";

const { execSync, execFileSync } = require("child_process");
const path  = require("path");
const fs    = require("fs");

const WKHTMLTOPDF_PATHS = [
  "/nix/store/hxiay4lkq4389vxnhnb3d0pbaw6siwkw-wkhtmltopdf/bin/wkhtmltopdf",
  "/nix/store/k9ll6qzflskra53b3b35iijnldcn929a-wkhtmltopdf-0.12.6/bin/wkhtmltopdf",
  "/usr/bin/wkhtmltopdf",
  "/usr/local/bin/wkhtmltopdf",
];

function getWkhtmltopdfBin() {
  for (const p of WKHTMLTOPDF_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function generatePDF(htmlPath, outputPath, opts = {}) {
  const bin = getWkhtmltopdfBin();
  if (!bin) {
    throw new Error(
      "wkhtmltopdf not found. Expected at one of:\n" + WKHTMLTOPDF_PATHS.join("\n")
    );
  }

  const {
    pageSize       = "A4",
    orientation    = "Portrait",
    marginTop      = "18mm",
    marginBottom   = "22mm",
    marginLeft     = "16mm",
    marginRight    = "16mm",
    enableLocalFileAccess = true,
    footer         = true,
    title          = "Job Card Document",
  } = opts;

  const footerOpts = footer
    ? [
        "--footer-font-size", "7",
        "--footer-font-name", "Arial",
        "--footer-center", "CONFIDENTIAL — Meridian Advisory Group",
        "--footer-right", "Page [page] of [topage]",
        "--footer-spacing", "3",
      ]
    : [];

  const args = [
    "--quiet",
    "--page-size",    pageSize,
    "--orientation",  orientation,
    "--margin-top",   marginTop,
    "--margin-bottom",marginBottom,
    "--margin-left",  marginLeft,
    "--margin-right", marginRight,
    "--encoding",     "UTF-8",
    "--title",        title,
    "--print-media-type",
    "--disable-smart-shrinking",
    "--load-error-handling", "ignore",
    "--load-media-error-handling", "ignore",
    "--javascript-delay", "500",
    ...(enableLocalFileAccess ? ["--enable-local-file-access"] : []),
    ...footerOpts,
    htmlPath,
    outputPath,
  ];

  try {
    // Use execFileSync with array args to avoid shell quoting issues
    execFileSync(bin, args, { stdio: "pipe", timeout: 120_000 });
  } catch (err) {
    // wkhtmltopdf exits with code 1 on network warnings but still produces a valid PDF.
    // Only re-throw if no output file was created or it's empty.
    if (!fs.existsSync(outputPath)) {
      const msg = err.stderr ? err.stderr.toString().slice(0, 400) : err.message;
      throw new Error(`wkhtmltopdf failed (no output): ${msg}`);
    }
  }
  const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
  if (size < 1000) {
    throw new Error(`PDF output too small (${size} bytes) — wkhtmltopdf likely failed silently`);
  }
  return { success: true, path: outputPath, size };
}

module.exports = { generatePDF, getWkhtmltopdfBin };
