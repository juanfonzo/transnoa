#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function normalize(value) {
  return String(value || "").replaceAll("\\", "/").replace(/^\.\//, "").replace(/\/+/g, "/").trim();
}

function globToRegex(glob) {
  const source = normalize(glob);
  let output = "^";
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
    if (char === "*" && source[index + 1] === "*") { index += 1; output += ".*"; }
    else if (char === "*") output += "[^/]*";
    else if (char === "?") output += "[^/]";
    else if ("\\.^$+{}()|[]".includes(char)) output += `\\${char}`;
    else output += char;
  }
  return new RegExp(`${output}$`);
}

export function resolveSurfacesForFiles(files, config) {
  const normalized = [...new Set(files.map(normalize).filter(Boolean))];
  const surfaces = [];
  for (const surface of config?.surfaces || []) {
    const patterns = (surface.paths || []).map(globToRegex);
    const matchedFiles = normalized.filter((file) => patterns.some((pattern) => pattern.test(file)));
    if (matchedFiles.length > 0) surfaces.push({ ...surface, matchedFiles });
  }
  const covered = new Set(surfaces.flatMap((surface) => surface.matchedFiles));
  return { files: normalized, surfaces, unmatched: normalized.filter((file) => !covered.has(file)) };
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "buffer", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString("utf8") || `git ${args.join(" ")} falló`);
  return result.stdout.toString("utf8").split("\0").map(normalize).filter(Boolean);
}

function changedFiles(root) {
  return [...new Set([
    ...runGit(root, ["diff", "--name-only", "-z"]),
    ...runGit(root, ["diff", "--cached", "--name-only", "-z"]),
    ...runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"]),
  ])];
}

async function main() {
  const args = process.argv.slice(2);
  const json = args.includes("--json");
  const filesIndex = args.indexOf("--files");
  const files = filesIndex >= 0 ? args.slice(filesIndex + 1).filter((arg) => !arg.startsWith("--")) : changedFiles(process.cwd());
  const config = JSON.parse(await fs.readFile(path.join(process.cwd(), "docs/ai/repo-surfaces.json"), "utf8"));
  const result = resolveSurfacesForFiles(files, config);
  if (json) return console.log(JSON.stringify(result, null, 2));
  if (result.files.length === 0) return console.log("No hay archivos modificados para clasificar.");
  for (const surface of result.surfaces) {
    console.log(`\n[${surface.id}] ${surface.label}`);
    console.log(`Rol: ${surface.agent} | cwd: ${surface.working_directory}`);
    console.log(`Archivos: ${surface.matchedFiles.join(", ")}`);
    for (const check of surface.checks || []) console.log(` - ${check.command} (${check.when})`);
  }
  if (result.unmatched.length > 0) {
    console.log("\nSin superficie declarada:");
    for (const file of result.unmatched) console.log(` - ${file}`);
  }
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
