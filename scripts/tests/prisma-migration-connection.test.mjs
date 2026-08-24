import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { resolveMigrationConnection } from "../lib/prisma-migration-connection.mjs";

const pooledUrl =
  "postgresql://user:secret@ep-demo-pooler.us-east-2.aws.neon.tech/transnoa";
const directUrl =
  "postgresql://user:secret@ep-demo.us-east-2.aws.neon.tech/transnoa";

test("el build de Vercel no ejecuta operaciones de base de datos", () => {
  const packageJson = JSON.parse(
    readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
  );
  const buildCommand = packageJson.scripts["vercel-build"];
  const buildChain = `${buildCommand} && ${packageJson.scripts.build}`;

  assert.equal(buildCommand, "npm run build");
  assert.doesNotMatch(buildChain, /migrate|db:push|seed/i);
});

test("prioriza DIRECT_URL para las migraciones", () => {
  const result = resolveMigrationConnection({
    env: {
      DATABASE_URL: pooledUrl,
      DIRECT_URL: directUrl,
      DATABASE_URL_UNPOOLED: "postgresql://other:secret@other.neon.tech/db",
    },
  });

  assert.equal(result.migrationUrl, directUrl);
  assert.equal(result.sourceName, "DIRECT_URL");
});

test("usa DATABASE_URL_UNPOOLED provista por Neon y Vercel", () => {
  const result = resolveMigrationConnection({
    env: {
      DATABASE_URL: pooledUrl,
      DATABASE_URL_UNPOOLED: directUrl,
    },
  });

  assert.equal(result.migrationUrl, directUrl);
  assert.equal(result.sourceName, "DATABASE_URL_UNPOOLED");
});

test("rechaza una variable de migración que todavía apunta al pooler", () => {
  const result = resolveMigrationConnection({
    env: { DATABASE_URL: pooledUrl, DATABASE_URL_UNPOOLED: pooledUrl },
  });

  assert.match(result.error, /endpoint directo/);
});

test("mantiene el fallo seguro cuando sólo existe una URL pooled", () => {
  const result = resolveMigrationConnection({
    env: { DATABASE_URL: pooledUrl },
  });

  assert.match(result.error, /DATABASE_URL_UNPOOLED/);
});

test("permite migrar con DATABASE_URL cuando ya es directa", () => {
  const result = resolveMigrationConnection({
    env: { DATABASE_URL: directUrl },
  });

  assert.equal(result.migrationUrl, undefined);
  assert.equal(result.sourceName, "DATABASE_URL");
});

test("admite la configuración de .env como fallback local", () => {
  const result = resolveMigrationConnection({
    env: {},
    dotEnv: { DATABASE_URL: pooledUrl, DATABASE_URL_UNPOOLED: directUrl },
  });

  assert.equal(result.migrationUrl, directUrl);
  assert.equal(result.sourceName, "DATABASE_URL_UNPOOLED");
});
