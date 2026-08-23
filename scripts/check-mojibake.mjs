#!/usr/bin/env node

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".mjs", ".cjs", ".jsx", ".json", ".md",
  ".yml", ".yaml", ".toml", ".ini", ".sql", ".prisma", ".css",
  ".scss", ".html", ".txt", ".sh", ".ps1", ".py",
]);

const TEXT_FILENAMES = new Set([
  "dockerfile", "makefile", ".gitignore", ".gitattributes", ".editorconfig",
]);

const PATTERNS = [
  { name: "replacement-char", regex: /\uFFFD/ },
  { name: "utf8-as-latin1-a", regex: new RegExp("\\u00C3.") },
  { name: "utf8-as-latin1-b", regex: new RegExp("\\u00C2.") },
  { name: "smart-quotes-corrupt", regex: new RegExp("\\u00E2[\\u0080-\\u00BF]") },
  { name: "double-encoded-replacement", regex: new RegExp("\\u00EF\\u00BF\\u00BD") },
];

const SKIP_DIRS = new Set([
  ".git", ".next", ".venv", "node_modules", "dist", "build", "coverage", ".turbo",
]);

const SKIP_FILES = new Set(["docs/ai/UTF8_POLICY.md"]);

function isLikelyText(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath).toLowerCase())
    || TEXT_FILENAMES.has(path.basename(filePath).toLowerCase());
}

function isBinary(buffer) {
  const limit = Math.min(buffer.length, 8192);
  for (let index = 0; index < limit; index += 1) {
    if (buffer[index] === 0) return true;
  }
  return false;
}

function listTextFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const absolute = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (!SKIP_DIRS.has(entry.name)) stack.push(absolute);
        continue;
      }
      const relative = path.relative(root, absolute).replaceAll("\\", "/");
      if (!SKIP_FILES.has(relative) && isLikelyText(relative)) files.push(relative);
    }
  }
  return files;
}

const files = listTextFiles(process.cwd());
const findings = [];

for (const file of files) {
  const buffer = readFileSync(file);
  if (isBinary(buffer)) continue;
  const lines = buffer.toString("utf8").split(/\r?\n/);
  lines.forEach((line, index) => {
    const match = PATTERNS.find((pattern) => pattern.regex.test(line));
    if (match) findings.push({ file, line: index + 1, reason: match.name, text: line.trim().slice(0, 140) });
  });
}

if (findings.length > 0) {
  console.error("Encoding check failed. Posible mojibake:");
  for (const finding of findings) {
    console.error(`- ${finding.file}:${finding.line} [${finding.reason}] ${finding.text}`);
  }
  process.exit(1);
}

console.log(`Encoding check passed. Files scanned: ${files.length}`);
