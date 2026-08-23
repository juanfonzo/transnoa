#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

const strict = process.argv.includes("--strict");
const scanAll = process.argv.includes("--all");
const normalize = (value) => String(value || "").replaceAll("\\", "/");

function git(args, cwd) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8", windowsHide: true });
  if (result.status !== 0) throw new Error(result.stderr.trim() || "git falló");
  return result.stdout;
}

async function main() {
  const root = path.resolve(process.cwd());
  const changed = scanAll
    ? git(["ls-files"], root).split(/\r?\n/).map(normalize).filter((file) => /\.(tsx?|jsx?|css)$/.test(file))
    : [...new Set([
        ...git(["diff", "--name-only", "HEAD"], root).split(/\r?\n/),
        ...git(["ls-files", "--others", "--exclude-standard"], root).split(/\r?\n/),
      ].map(normalize).filter((file) => /\.(tsx?|jsx?|css)$/.test(file)))];

  const findings = [];
  for (const relative of changed) {
    let text;
    try { text = await fs.readFile(path.join(root, relative), "utf8"); } catch { continue; }
    if (relative !== "src/app/globals.css" && /#[0-9a-fA-F]{3,8}\b/.test(text)) {
      findings.push({ relative, type: "color-hex", message: "color hexadecimal fuera de globals.css" });
    }
    if (/(?:bg|text|border)-\[(?:#|rgb|hsl)/.test(text)) {
      findings.push({ relative, type: "tailwind-arbitrary-color", message: "color Tailwind arbitrario" });
    }
    if (/devicePixelRatio|visualViewport\?.scale/.test(text)) {
      findings.push({ relative, type: "zoom-dpr", message: "detección de zoom/DPR usada para layout" });
    }
    if (/style=\{\{/.test(text)) {
      findings.push({ relative, type: "inline-style", message: "estilo inline; revisar patrón Tailwind" });
    }
  }

  if (findings.length === 0) return console.log("UI check: sin señales estáticas.");
  for (const finding of findings) {
    console.log(`${strict ? "ERROR" : "WARN"} [${finding.type}] ${finding.relative}: ${finding.message}`);
  }
  if (strict) process.exitCode = 1;
}

main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
