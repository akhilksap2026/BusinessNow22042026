"use strict";

const BOLD   = "\x1b[1m";
const RESET  = "\x1b[0m";
const CYAN   = "\x1b[36m";
const GREEN  = "\x1b[32m";
const YELLOW = "\x1b[33m";
const RED    = "\x1b[31m";
const GREY   = "\x1b[90m";
const GOLD   = "\x1b[33m";

function banner(title) {
  const line = "═".repeat(64);
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`);
  console.log(`${CYAN}${line}${RESET}\n`);
}

function section(title) {
  console.log(`\n${GOLD}▶ ${BOLD}${title}${RESET}`);
}

function success(msg) {
  console.log(`  ${GREEN}✔${RESET}  ${msg}`);
}

function info(msg) {
  console.log(`  ${CYAN}ℹ${RESET}  ${msg}`);
}

function warn(msg) {
  console.log(`  ${YELLOW}⚠${RESET}  ${msg}`);
}

function error(msg) {
  console.log(`  ${RED}✖${RESET}  ${msg}`);
}

function step(label, detail) {
  process.stdout.write(`  ${GREY}→${RESET}  ${label}...`);
  if (detail) process.stdout.write(` ${GREY}${detail}${RESET}`);
  process.stdout.write("\n");
}

function done(label, detail) {
  console.log(`  ${GREEN}✔${RESET}  ${BOLD}${label}${RESET}${detail ? `  ${GREY}(${detail})${RESET}` : ""}`);
}

function summary(files) {
  const line = "─".repeat(64);
  console.log(`\n${CYAN}${line}${RESET}`);
  console.log(`${BOLD}  OUTPUT FILES${RESET}`);
  console.log(`${CYAN}${line}${RESET}`);
  files.forEach(({ label, path, size }) => {
    const sz = size ? `  ${GREY}${(size / 1024).toFixed(1)} KB${RESET}` : "";
    console.log(`  ${GREEN}●${RESET}  ${BOLD}${label}${RESET}${sz}`);
    console.log(`     ${GREY}${path}${RESET}`);
  });
  console.log(`${CYAN}${line}${RESET}\n`);
}

module.exports = { banner, section, success, info, warn, error, step, done, summary };
