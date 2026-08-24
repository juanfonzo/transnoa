import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import {
  MIGRATION_URL_ENV_NAMES,
  resolveMigrationConnection,
} from "./lib/prisma-migration-connection.mjs";

const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

function readDotEnvValues(names) {
  if (!existsSync(".env")) return {};

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  return Object.fromEntries(
    names.flatMap((name) => {
      const prefix = `${name}=`;
      const line = lines.find((candidate) => candidate.startsWith(prefix));
      const value = line
        ?.slice(prefix.length)
        .trim()
        .replace(/^(['"])(.*)\1$/, "$2");
      return value ? [[name, value]] : [];
    }),
  );
}

const dotEnv = readDotEnvValues([
  "DATABASE_URL",
  ...MIGRATION_URL_ENV_NAMES,
]);
const connection = resolveMigrationConnection({ env: process.env, dotEnv });

if (connection.error) {
  console.error(connection.error);
  process.exit(1);
}

const childEnv = { ...process.env };
if (connection.migrationUrl) {
  childEnv.DATABASE_URL = connection.migrationUrl;
}

console.log(
  `Prisma migrate deploy: conexión provista por ${connection.sourceName}.`,
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
