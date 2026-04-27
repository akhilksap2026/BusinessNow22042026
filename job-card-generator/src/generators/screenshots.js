"use strict";

const { execFileSync } = require("child_process");
const path = require("path");
const fs   = require("fs");

const WKHTMLTOIMAGE_PATHS = [
  "/nix/store/hxiay4lkq4389vxnhnb3d0pbaw6siwkw-wkhtmltopdf/bin/wkhtmltoimage",
  "/nix/store/k9ll6qzflskra53b3b35iijnldcn929a-wkhtmltopdf-0.12.6/bin/wkhtmltoimage",
  "/usr/bin/wkhtmltoimage",
  "/usr/local/bin/wkhtmltoimage",
];

function getWkhtmltoimageBin() {
  for (const p of WKHTMLTOIMAGE_PATHS) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

function captureScreenshot(inputPath, outputPath, opts = {}) {
  const bin = getWkhtmltoimageBin();
  if (!bin) {
    console.warn("  ⚠  wkhtmltoimage not found — skipping screenshot capture");
    return { success: false, reason: "wkhtmltoimage not found" };
  }

  const {
    width   = 1200,
    quality = 90,
    format  = "png",
  } = opts;

  const args = [
    "--quiet",
    "--width",   String(width),
    "--quality", String(quality),
    "--format",  format,
    "--enable-local-file-access",
    "--javascript-delay", "300",
    "--load-error-handling", "ignore",
    "--load-media-error-handling", "ignore",
    inputPath,
    outputPath,
  ];

  try {
    execFileSync(bin, args, { stdio: "pipe", timeout: 60_000 });
    if (!fs.existsSync(outputPath)) throw new Error("Output file not created");
    const size = fs.statSync(outputPath).size;
    return { success: true, path: outputPath, size };
  } catch (err) {
    const msg = err.stderr ? err.stderr.toString().slice(0, 200) : err.message;
    return { success: false, reason: msg };
  }
}

function captureURL(url, outputPath, opts = {}) {
  const bin = getWkhtmltoimageBin();
  if (!bin) {
    return { success: false, reason: "wkhtmltoimage not found" };
  }
  const { width = 1280, quality = 85, format = "png", delay = 2000 } = opts;
  const args = [
    "--quiet",
    "--width",   String(width),
    "--quality", String(quality),
    "--format",  format,
    "--javascript-delay", String(delay),
    "--load-error-handling", "ignore",
    "--load-media-error-handling", "ignore",
    url,
    outputPath,
  ];
  try {
    execFileSync(bin, args, { stdio: "pipe", timeout: 60_000 });
    const size = fs.existsSync(outputPath) ? fs.statSync(outputPath).size : 0;
    return { success: size > 500, path: outputPath, size };
  } catch {
    return { success: false, reason: "URL capture failed" };
  }
}

module.exports = { captureScreenshot, captureURL, getWkhtmltoimageBin };
