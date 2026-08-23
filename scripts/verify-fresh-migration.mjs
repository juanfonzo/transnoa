import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import prismaPackage from "@prisma/client";

const { PrismaClient } = prismaPackage;
const require = createRequire(import.meta.url);
const prismaCli = require.resolve("prisma/build/index.js");

if (process.env.ALLOW_MIGRATION_SMOKE_TEST !== "1") {
  console.error(
    "Smoke test cancelado. Define ALLOW_MIGRATION_SMOKE_TEST=1 sólo sobre una base de pruebas."
  );
  process.exit(1);
}

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
const baseUrl = directUrl || runtimeUrl;
if (!baseUrl) {
  console.error("Falta DIRECT_URL o DATABASE_URL.");
  process.exit(1);
}

try {
  if (new URL(baseUrl).hostname.includes("-pooler.")) {
    console.error(
      "DIRECT_URL es obligatoria para el smoke de migración cuando DATABASE_URL usa el pooler de Neon."
    );
    process.exit(1);
  }
} catch {
  console.error("DIRECT_URL o DATABASE_URL no contiene una URL válida.");
  process.exit(1);
}

const schema = `qa_migration_${Date.now()}_${randomUUID().slice(0, 8)}`;
if (!/^qa_migration_[a-z0-9_]+$/.test(schema)) {
  console.error("El identificador del schema de prueba no es seguro.");
  process.exit(1);
}

const targetUrl = new URL(baseUrl);
targetUrl.searchParams.set("schema", schema);

const admin = new PrismaClient({ datasources: { db: { url: baseUrl } } });
let verificationClient;

try {
  const existing = await admin.$queryRawUnsafe(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
    schema
  );
  if (existing.length > 0) {
    throw new Error("El schema aislado ya existía; no se modificó.");
  }

  const result = spawnSync(
    process.execPath,
    [prismaCli, "migrate", "deploy", "--schema", "prisma/schema.prisma"],
    {
      cwd: process.cwd(),
      env: { ...process.env, DATABASE_URL: targetUrl.toString(), DIRECT_URL: "" },
      stdio: "inherit",
    }
  );
  if (result.status !== 0) {
    throw new Error("prisma migrate deploy falló en el schema aislado.");
  }

  verificationClient = new PrismaClient({
    datasources: { db: { url: targetUrl.toString() } },
  });
  const [areas, tables, migrations] = await Promise.all([
    verificationClient.area.count(),
    verificationClient.$queryRawUnsafe(
      "SELECT COUNT(*)::int AS count FROM information_schema.tables WHERE table_schema = $1",
      schema
    ),
    verificationClient.$queryRawUnsafe(
      'SELECT migration_name FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL AND rolled_back_at IS NULL',
      "0_init"
    ),
  ]);

  if (migrations.length !== 1) {
    throw new Error("La migración 0_init no quedó registrada como aplicada.");
  }

  console.log(
    JSON.stringify({
      schemaCreated: true,
      migration: "0_init",
      businessRows: { areas },
      tableCount: tables[0]?.count ?? 0,
    })
  );
} finally {
  await verificationClient?.$disconnect();
  const created = await admin.$queryRawUnsafe(
    "SELECT schema_name FROM information_schema.schemata WHERE schema_name = $1",
    schema
  );
  if (created.length > 0) {
    await admin.$executeRawUnsafe(`DROP SCHEMA "${schema}" CASCADE`);
    console.log("Schema aislado de prueba eliminado.");
  }
  await admin.$disconnect();
}
