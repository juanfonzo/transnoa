#!/usr/bin/env node
import { createHash } from "node:crypto";
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

function matchesAny(relative, globs) {
  return globs.some((glob) => globToRegex(glob).test(normalize(relative)));
}

export function evaluateOwnership({ agent, touchedPaths, map, phaseAllow = [] }) {
  const errors = [];
  const config = map?.agents?.[agent];
  if (!config) return { ok: false, errors: [`Agente desconocido: ${agent}`], touchedPaths };
  for (const raw of touchedPaths) {
    const relative = normalize(raw);
    if (matchesAny(relative, map.protected || [])) errors.push(`${relative}: alcance protegido`);
    else if (!matchesAny(relative, config.allowed || [])) errors.push(`${relative}: fuera del ownership máximo de ${agent}`);
    else if (phaseAllow.length > 0 && !matchesAny(relative, phaseAllow)) errors.push(`${relative}: fuera del scope lock de esta fase`);
  }
  return { ok: errors.length === 0, errors, touchedPaths };
}

function runGit(root, args) {
  const result = spawnSync("git", args, { cwd: root, encoding: "buffer", windowsHide: true });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(result.stderr.toString("utf8").trim() || `git ${args.join(" ")} falló`);
  return result.stdout;
}

function parseNullList(buffer) {
  return buffer.toString("utf8").split("\0").map(normalize).filter(Boolean);
}

async function fileState(root, relative) {
  const full = path.join(root, ...normalize(relative).split("/"));
  try {
    const stat = await fs.stat(full);
    if (!stat.isFile()) return { kind: stat.isDirectory() ? "directory" : "other", hash: null, size: 0 };
    const data = await fs.readFile(full);
    return { kind: "file", hash: createHash("sha256").update(data).digest("hex"), size: stat.size };
  } catch (error) {
    if (error?.code === "ENOENT") return { kind: "missing", hash: null, size: 0 };
    throw error;
  }
}

export async function collectWorktreeSnapshot(root) {
  const names = new Set([
    ...parseNullList(runGit(root, ["diff", "--name-only", "-z", "--diff-filter=ACDMRTUXB"])),
    ...parseNullList(runGit(root, ["diff", "--cached", "--name-only", "-z", "--diff-filter=ACDMRTUXB"])),
    ...parseNullList(runGit(root, ["ls-files", "--others", "--exclude-standard", "-z"])),
  ]);
  const files = {};
  for (const relative of [...names].sort()) files[relative] = await fileState(root, relative);
  return { capturedAt: new Date().toISOString(), files };
}

export function diffSnapshots(before, after) {
  const touched = [];
  const names = new Set([...Object.keys(before?.files || {}), ...Object.keys(after?.files || {})]);
  for (const relative of [...names].sort()) {
    const left = before?.files?.[relative] || { kind: "clean", hash: null, size: 0 };
    const right = after?.files?.[relative] || { kind: "clean", hash: null, size: 0 };
    if (left.kind !== right.kind || left.hash !== right.hash || left.size !== right.size) touched.push(relative);
  }
  return touched;
}

function parseArgs(argv) {
  const output = { command: argv[0], root: process.cwd(), agent: null, allow: [], force: false, json: false };
  for (let index = 1; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--root") output.root = argv[++index];
    else if (arg === "--agent") output.agent = argv[++index];
    else if (arg === "--allow") output.allow.push(argv[++index]);
    else if (arg === "--force") output.force = true;
    else if (arg === "--json") output.json = true;
    else if (arg === "--help" || arg === "-h") output.help = true;
    else throw new Error(`Argumento desconocido: ${arg}`);
  }
  output.root = path.resolve(output.root);
  return output;
}

function help() {
  console.log(`Uso:
  npm run kit:ownership -- begin --agent <agente> [--allow "glob"]
  npm run kit:ownership -- check --agent <agente>
  npm run kit:ownership -- clear --agent <agente>
  npm run kit:ownership -- status --agent <agente>`);
}

function statePath(root, agent) {
  const raw = runGit(root, ["rev-parse", "--git-dir"]).toString("utf8").trim();
  const gitDir = path.isAbsolute(raw) ? raw : path.resolve(root, raw);
  return path.join(gitDir, "ai-dev-kit", `ownership-${agent}.json`);
}

async function readJson(file) { return JSON.parse(await fs.readFile(file, "utf8")); }
async function writeJson(file, value) {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.command) return help();
  if (!args.agent) throw new Error("Falta --agent <nombre>.");
  const map = await readJson(path.join(args.root, "scripts/ai-dev-kit/ownership-map.json"));
  if (!map?.agents?.[args.agent]) throw new Error(`Agente desconocido: ${args.agent}`);
  const file = statePath(args.root, args.agent);

  if (args.command === "begin") {
    try {
      await fs.access(file);
      if (!args.force) throw new Error(`Ya existe un baseline para ${args.agent}. Usá check/clear o --force.`);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await writeJson(file, { version: 1, agent: args.agent, root: args.root, phaseAllow: args.allow.map(normalize), baseline: await collectWorktreeSnapshot(args.root) });
    console.log(`Ownership baseline abierto: ${args.agent}`);
    return;
  }

  if (args.command === "status") {
    try {
      const state = await readJson(file);
      console.log(JSON.stringify({ active: true, agent: state.agent, phaseAllow: state.phaseAllow }, null, 2));
    } catch (error) {
      if (error?.code === "ENOENT") console.log(JSON.stringify({ active: false, agent: args.agent }, null, 2));
      else throw error;
    }
    return;
  }

  if (args.command === "clear") {
    await fs.rm(file, { force: true });
    console.log(`Ownership baseline liberado: ${args.agent}`);
    return;
  }

  if (args.command === "check") {
    const state = await readJson(file);
    if (path.resolve(state.root) !== args.root || state.agent !== args.agent) throw new Error("El baseline pertenece a otra raíz o agente.");
    const touchedPaths = diffSnapshots(state.baseline, await collectWorktreeSnapshot(args.root));
    const result = evaluateOwnership({ agent: args.agent, touchedPaths, map, phaseAllow: state.phaseAllow || [] });
    if (args.json) console.log(JSON.stringify(result, null, 2));
    else {
      console.log(`Archivos tocados por la fase: ${touchedPaths.length}`);
      for (const relative of touchedPaths) console.log(` - ${relative}`);
      for (const error of result.errors) console.error(`ERROR: ${error}`);
      console.log(`Ownership: ${result.ok ? "OK" : "FAIL"}`);
    }
    if (!result.ok) process.exitCode = 1;
    return;
  }

  throw new Error(`Comando inválido: ${args.command}`);
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 2; });
