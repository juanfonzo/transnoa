import test from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runChecks } from "./check.mjs";
import { evaluateOwnership } from "./ownership-check.mjs";
import { resolveSurfacesForFiles } from "./surfaces.mjs";

const sourceRoot = path.resolve(path.join(path.dirname(fileURLToPath(import.meta.url)), "..", ".."));

async function fixture() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "transnoa-ai-kit-"));
  const copies = [
    "AGENTS.md", ".agents", ".codex", "docs/ai", "package.json",
    "scripts/ai-dev-kit", "GUIA_USO_CODEX_KIT.md", "GUIA_DESARROLLADOR.md",
  ];
  for (const relative of copies) {
    const source = path.join(sourceRoot, relative);
    const target = path.join(root, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(source, target, { recursive: true });
  }
  return root;
}

function hasCode(result, code) {
  return result.errors.some((item) => item.code === code);
}

test("el kit adaptado válido pasa", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const result = await runChecks({ root });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
});

test("detecta un archivo canónico ausente", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  await fs.rm(path.join(root, "docs/ai/AUTH_POLICY.md"));
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "required-path"), true);
});

test("bloquea concurrencia mayor a uno", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, ".codex/config.toml");
  const text = await fs.readFile(file, "utf8");
  await fs.writeFile(file, text.replace("max_concurrent_threads_per_session = 1", "max_concurrent_threads_per_session = 2"), "utf8");
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "agent-concurrency"), true);
});

test("detecta nombre duplicado de skill", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, ".agents/skills/backlog-tecnico/SKILL.md");
  const text = await fs.readFile(file, "utf8");
  await fs.writeFile(file, text.replace("name: backlog-tecnico", "name: arquitectura-contratos"), "utf8");
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "skill-duplicate"), true);
});

test("detecta una skill inexistente en routing", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "docs/ai/evals/routing-cases.json");
  const cases = JSON.parse(await fs.readFile(file, "utf8"));
  cases[0].expected_skill = "skill-inexistente";
  await fs.writeFile(file, `${JSON.stringify(cases, null, 2)}\n`, "utf8");
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "routing-skill"), true);
});

test("detecta pérdida de una regla preservada", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "docs/ai/PROJECT_CONTEXT.md");
  const text = await fs.readFile(file, "utf8");
  await fs.writeFile(file, text.replaceAll("demo_role", "rol_demo_eliminado"), "utf8");
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "preservation-rule"), true);
});

test("la política debe conservar ejecución directa", async (context) => {
  const root = await fixture();
  context.after(() => fs.rm(root, { recursive: true, force: true }));
  const file = path.join(root, "docs/ai/subagent-policy.json");
  const policy = JSON.parse(await fs.readFile(file, "utf8"));
  policy.default_spawn = true;
  await fs.writeFile(file, `${JSON.stringify(policy, null, 2)}\n`, "utf8");
  const result = await runChecks({ root });
  assert.equal(hasCode(result, "subagent-policy-default"), true);
});

test("ownership bloquea secretos y rutas fuera de scope", () => {
  const map = {
    protected: [".env", "CONTINUITY.md"],
    agents: { implementador_typescript: { allowed: ["src/**", "prisma/**"] } },
  };
  const result = evaluateOwnership({
    agent: "implementador_typescript",
    touchedPaths: ["src/app/page.tsx", ".env", "AGENTS.md"],
    map,
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some((item) => item.includes("alcance protegido")), true);
  assert.equal(result.errors.some((item) => item.includes("fuera del ownership")), true);
});

test("surfaces clasifica aplicación, datos y kit", () => {
  const config = {
    surfaces: [
      { id: "nextjs-app", paths: ["src/**"] },
      { id: "prisma-postgres", paths: ["prisma/**"] },
      { id: "ai-dev-kit", paths: [".agents/**"] },
    ],
  };
  const result = resolveSurfacesForFiles(
    ["src/app/page.tsx", "prisma/schema.prisma", ".agents/skills/verificacion/SKILL.md"],
    config
  );
  assert.deepEqual(result.surfaces.map((item) => item.id), ["nextjs-app", "prisma-postgres", "ai-dev-kit"]);
  assert.deepEqual(result.unmatched, []);
});
