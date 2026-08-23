#!/usr/bin/env node
import { promises as fs } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const EXPECTED_AGENTS = [
  "arquitectura",
  "diagnostico",
  "implementador_typescript",
  "planificacion_producto",
  "qa_seguridad",
  "refinamiento_kit",
];

const EXPECTED_SKILLS = [
  "arquitectura-contratos",
  "backlog-tecnico",
  "cambio-cliente",
  "diagnostico",
  "diseno-ui-ux-transnoa",
  "evolucion-prisma-postgres",
  "faltantes",
  "implementacion-nextjs",
  "intake-proyecto",
  "integracion-externa-resiliente",
  "prd-tecnico",
  "refinamiento-backlog",
  "refinamiento-kit",
  "verificacion",
];

const REQUIRED_PATHS = [
  "AGENTS.md",
  ".codex/config.toml",
  "docs/ai/PROJECT_CONTEXT.md",
  "docs/ai/SOFTWARE_FACTORY.md",
  "docs/ai/ACTIVATION_MATRIX.md",
  "docs/ai/CODE_CONTEXT_POLICY.md",
  "docs/ai/TESTING_POLICY.md",
  "docs/ai/AUTH_POLICY.md",
  "docs/ai/ENVIRONMENT_POLICY.md",
  "docs/ai/UTF8_POLICY.md",
  "docs/ai/UI_VALIDATION_POLICY.md",
  "docs/ai/CONTRACT_CHECKPOINT_POLICY.md",
  "docs/ai/OWNERSHIP_POLICY.md",
  "docs/ai/SUBAGENT_LIFECYCLE.md",
  "docs/ai/CLOSURE_POLICY.md",
  "docs/ai/repo-surfaces.json",
  "docs/ai/subagent-policy.json",
  "docs/ai/evals/routing-cases.json",
  "scripts/ai-dev-kit/preservation-contract.json",
  "scripts/ai-dev-kit/ownership-map.json",
  "GUIA_USO_CODEX_KIT.md",
  "GUIA_DESARROLLADOR.md",
];

function issue(code, message, file) {
  return { code, message, ...(file ? { file } : {}) };
}

async function exists(root, relative) {
  try { await fs.access(path.join(root, relative)); return true; } catch { return false; }
}

async function readText(root, relative) {
  return fs.readFile(path.join(root, relative), "utf8");
}

async function readJson(root, relative) {
  return JSON.parse(await readText(root, relative));
}

async function directories(root, relative) {
  try {
    return (await fs.readdir(path.join(root, relative), { withFileTypes: true }))
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort();
  } catch { return []; }
}

async function files(root, relative, extension) {
  try {
    return (await fs.readdir(path.join(root, relative), { withFileTypes: true }))
      .filter((entry) => entry.isFile() && (!extension || entry.name.endsWith(extension)))
      .map((entry) => entry.name)
      .sort();
  } catch { return []; }
}

function parseFrontmatter(text) {
  const match = text.match(/^---\s*\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const result = {};
  for (const line of match[1].split(/\r?\n/)) {
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim();
    const value = line.slice(separator + 1).trim().replace(/^['"]|['"]$/g, "");
    result[key] = value;
  }
  return result;
}

function sameMembers(actual, expected) {
  return actual.length === expected.length && actual.every((value, index) => value === expected[index]);
}

export async function runChecks({ root = process.cwd() } = {}) {
  const resolvedRoot = path.resolve(root);
  const errors = [];
  const warnings = [];

  for (const relative of REQUIRED_PATHS) {
    if (!(await exists(resolvedRoot, relative))) errors.push(issue("required-path", "Falta un archivo requerido.", relative));
  }

  const skillFolders = await directories(resolvedRoot, ".agents/skills");
  if (!sameMembers(skillFolders, EXPECTED_SKILLS)) {
    errors.push(issue("skill-catalog", `Skills esperadas: ${EXPECTED_SKILLS.join(", ")}; encontradas: ${skillFolders.join(", ")}`, ".agents/skills"));
  }

  const skillNames = new Map();
  for (const folder of skillFolders) {
    const relative = `.agents/skills/${folder}/SKILL.md`;
    if (!(await exists(resolvedRoot, relative))) {
      errors.push(issue("skill-entrypoint", "Falta SKILL.md.", relative));
      continue;
    }
    const text = await readText(resolvedRoot, relative);
    const frontmatter = parseFrontmatter(text);
    if (!frontmatter?.name || !frontmatter?.description) {
      errors.push(issue("skill-frontmatter", "Se requieren name y description.", relative));
      continue;
    }
    if (frontmatter.name !== folder) errors.push(issue("skill-folder-name", `El name debe coincidir con la carpeta ${folder}.`, relative));
    if (frontmatter.description.length < 40) errors.push(issue("skill-description", "La description no discrimina suficientemente el uso.", relative));
    if (skillNames.has(frontmatter.name)) errors.push(issue("skill-duplicate", `Nombre duplicado con ${skillNames.get(frontmatter.name)}.`, relative));
    skillNames.set(frontmatter.name, relative);
    if (/TODO|<skill-name>|PLACEHOLDER/i.test(text)) warnings.push(issue("skill-placeholder", "Revisar placeholder potencial.", relative));
  }

  if (await exists(resolvedRoot, ".codex/skills")) {
    errors.push(issue("legacy-skill", "Las skills del repositorio deben vivir en .agents/skills, no .codex/skills.", ".codex/skills"));
  }

  const agentFiles = await files(resolvedRoot, ".codex/agents", ".toml");
  const expectedAgentFiles = EXPECTED_AGENTS.map((name) => `${name}.toml`).sort();
  if (!sameMembers(agentFiles, expectedAgentFiles)) {
    errors.push(issue("agent-catalog", `Agentes esperados: ${expectedAgentFiles.join(", ")}; encontrados: ${agentFiles.join(", ")}`, ".codex/agents"));
  }

  for (const file of agentFiles) {
    const relative = `.codex/agents/${file}`;
    const text = await readText(resolvedRoot, relative);
    const name = file.replace(/\.toml$/, "");
    if (!text.includes(`name = "${name}"`)) errors.push(issue("agent-name", "El nombre TOML no coincide con el archivo.", relative));
    if (!text.includes("HANDOFF_FINAL:")) errors.push(issue("agent-handoff", "Falta contrato HANDOFF_FINAL.", relative));
    if (!text.includes("No crees otros subagentes")) errors.push(issue("agent-nesting", "El agente debe prohibir subdelegación.", relative));
    if (["arquitectura", "diagnostico", "planificacion_producto", "qa_seguridad", "refinamiento_kit"].includes(name)
      && !text.includes('sandbox_mode = "read-only"')) {
      errors.push(issue("agent-readonly", "El agente analítico debe ser read-only.", relative));
    }
  }

  if (await exists(resolvedRoot, ".codex/config.toml")) {
    const config = await readText(resolvedRoot, ".codex/config.toml");
    if (!config.includes("max_concurrent_threads_per_session = 1")) errors.push(issue("agent-concurrency", "La concurrencia debe estar limitada a uno.", ".codex/config.toml"));
    if (!config.includes("interrupt_message = true")) errors.push(issue("agent-interrupt", "Falta interrupt_message = true.", ".codex/config.toml"));
  }

  if (await exists(resolvedRoot, "package.json")) {
    const pkg = await readJson(resolvedRoot, "package.json");
    const requiredScripts = ["kit:check", "kit:test", "kit:ownership", "kit:surfaces", "kit:ui-check", "check:encoding", "typecheck"];
    for (const name of requiredScripts) {
      if (!pkg.scripts?.[name]) errors.push(issue("package-script", `Falta script ${name}.`, "package.json"));
    }
  }

  const policy = await readJson(resolvedRoot, "docs/ai/subagent-policy.json").catch((error) => {
    errors.push(issue("subagent-policy-json", error.message, "docs/ai/subagent-policy.json"));
    return null;
  });
  if (policy) {
    if (policy.default_spawn !== false) errors.push(issue("subagent-policy-default", "default_spawn debe ser false.", "docs/ai/subagent-policy.json"));
    if (policy.max_total_per_task !== 1 || policy.max_active !== 1) errors.push(issue("subagent-policy-limit", "El presupuesto y concurrencia deben ser uno.", "docs/ai/subagent-policy.json"));
    if (policy.second_spawn !== "forbidden") errors.push(issue("subagent-policy-second", "Un segundo spawn debe estar prohibido.", "docs/ai/subagent-policy.json"));
  }

  const surfaces = await readJson(resolvedRoot, "docs/ai/repo-surfaces.json").catch((error) => {
    errors.push(issue("surfaces-json", error.message, "docs/ai/repo-surfaces.json"));
    return null;
  });
  if (surfaces) {
    const ids = new Set();
    for (const surface of surfaces.surfaces || []) {
      if (!surface.id || ids.has(surface.id)) errors.push(issue("surface-id", "ID de superficie ausente o duplicado.", "docs/ai/repo-surfaces.json"));
      ids.add(surface.id);
      if (!EXPECTED_AGENTS.includes(surface.agent)) errors.push(issue("surface-agent", `Rol desconocido: ${surface.agent}`, "docs/ai/repo-surfaces.json"));
      for (const skill of surface.skills || []) {
        if (!EXPECTED_SKILLS.includes(skill)) errors.push(issue("surface-skill", `Skill desconocida: ${skill}`, "docs/ai/repo-surfaces.json"));
      }
      if (!Array.isArray(surface.paths) || surface.paths.length === 0 || !Array.isArray(surface.checks) || surface.checks.length === 0) {
        errors.push(issue("surface-contract", `Superficie incompleta: ${surface.id}`, "docs/ai/repo-surfaces.json"));
      }
    }
    for (const requiredId of ["nextjs-app", "prisma-postgres", "ai-dev-kit"]) {
      if (!ids.has(requiredId)) errors.push(issue("surface-required", `Falta superficie ${requiredId}.`, "docs/ai/repo-surfaces.json"));
    }
  }

  const cases = await readJson(resolvedRoot, "docs/ai/evals/routing-cases.json").catch((error) => {
    errors.push(issue("routing-json", error.message, "docs/ai/evals/routing-cases.json"));
    return [];
  });
  const caseIds = new Set();
  let delegatedCases = 0;
  for (const item of cases) {
    if (!item.id || caseIds.has(item.id)) errors.push(issue("routing-id", "Caso sin ID o duplicado.", "docs/ai/evals/routing-cases.json"));
    caseIds.add(item.id);
    if (!EXPECTED_AGENTS.includes(item.expected_role)) errors.push(issue("routing-role", `Rol desconocido en ${item.id}.`, "docs/ai/evals/routing-cases.json"));
    if (!EXPECTED_SKILLS.includes(item.expected_skill)) errors.push(issue("routing-skill", `Skill desconocida en ${item.id}.`, "docs/ai/evals/routing-cases.json"));
    if (item.spawn === true) {
      delegatedCases += 1;
      if (!policy?.allowed_reasons?.includes(item.delegation_reason)) errors.push(issue("routing-delegation-reason", `Razón inválida en ${item.id}.`, "docs/ai/evals/routing-cases.json"));
    } else if (item.spawn !== false) errors.push(issue("routing-spawn", `spawn debe ser booleano en ${item.id}.`, "docs/ai/evals/routing-cases.json"));
  }
  if (cases.length < 8) errors.push(issue("routing-coverage", "Se requieren al menos ocho casos de routing.", "docs/ai/evals/routing-cases.json"));
  if (cases.length > 0 && delegatedCases / cases.length > 0.25) errors.push(issue("routing-direct-ratio", "El catálogo dejó de ser Direct-First.", "docs/ai/evals/routing-cases.json"));

  const preservation = await readJson(resolvedRoot, "scripts/ai-dev-kit/preservation-contract.json").catch((error) => {
    errors.push(issue("preservation-json", error.message, "scripts/ai-dev-kit/preservation-contract.json"));
    return null;
  });
  for (const rule of preservation?.rules || []) {
    if (!(await exists(resolvedRoot, rule.path))) {
      errors.push(issue("preservation-path", `Falta path para ${rule.id}.`, rule.path));
      continue;
    }
    const text = await readText(resolvedRoot, rule.path);
    for (const token of rule.must_include || []) {
      if (!text.includes(token)) errors.push(issue("preservation-rule", `${rule.id}: falta ${JSON.stringify(token)}.`, rule.path));
    }
  }

  return { ok: errors.length === 0, errors, warnings, summary: { skills: skillFolders.length, agents: agentFiles.length, routingCases: cases.length } };
}

async function main() {
  const json = process.argv.includes("--json");
  const result = await runChecks({ root: process.cwd() });
  if (json) console.log(JSON.stringify(result, null, 2));
  else {
    for (const warning of result.warnings) console.warn(`WARN [${warning.code}] ${warning.file || ""}: ${warning.message}`);
    for (const error of result.errors) console.error(`ERROR [${error.code}] ${error.file || ""}: ${error.message}`);
    console.log(`Kit Dev IA: ${result.ok ? "OK" : "FAIL"} | ${result.summary.skills} skills | ${result.summary.agents} agentes | ${result.summary.routingCases} casos`);
  }
  if (!result.ok) process.exitCode = 1;
}

const isCli = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isCli) main().catch((error) => { console.error(`ERROR: ${error.message}`); process.exitCode = 2; });
