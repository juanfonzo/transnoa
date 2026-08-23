import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

function readDotEnvValue(name) {
  if (!existsSync(".env")) return undefined;

  const prefix = `${name}=`;
  const line = readFileSync(".env", "utf8")
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(prefix));

  return line?.slice(prefix.length).trim().replace(/^(['"])(.*)\1$/, "$2");
}

const runtimeUrl =
  process.env.DATABASE_URL?.trim() || readDotEnvValue("DATABASE_URL");
const directUrl = process.env.DIRECT_URL?.trim() || readDotEnvValue("DIRECT_URL");

if (directUrl) {
  try {
    if (new URL(directUrl).hostname.includes("-pooler.")) {
      console.error("DIRECT_URL debe usar el endpoint directo, no el pooler de Neon.");
      process.exit(1);
    }
  } catch {
    // Prisma mostrará el diagnóstico de una URL inválida.
  }
}

if (runtimeUrl && !directUrl) {
  try {
    const hostname = new URL(runtimeUrl).hostname;
    if (hostname.includes("-pooler.")) {
      console.error(
        "DIRECT_URL es obligatoria para migrar cuando DATABASE_URL usa el pooler de Neon.",
      );
      process.exit(1);
    }
  } catch {
    // Prisma mostrará el diagnóstico de una URL inválida.
  }
}

const childEnv = { ...process.env };
if (directUrl) {
  childEnv.DATABASE_URL = directUrl;
}

console.log(
  `Prisma migrate deploy: ${directUrl ? "conexión directa" : "DATABASE_URL"}.`,
);

const result = spawnSync(
  process.execPath,
  [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
  {
    cwd: process.cwd(),
    env: childEnv,
    stdio: "inherit",
  },
);

if (result.error) {
  console.error("No se pudo iniciar Prisma Migrate.");
  process.exit(1);
}

process.exit(result.status ?? 1);
