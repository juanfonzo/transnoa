export const MIGRATION_URL_ENV_NAMES = [
  "DIRECT_URL",
  "DATABASE_URL_UNPOOLED",
];

function readValue(name, env, dotEnv) {
  return env[name]?.trim() || dotEnv[name]?.trim() || undefined;
}

function isPooledNeonUrl(value) {
  if (!value) return false;

  try {
    return new URL(value).hostname.includes("-pooler.");
  } catch {
    return false;
  }
}

export function resolveMigrationConnection({ env = {}, dotEnv = {} } = {}) {
  const runtimeUrl = readValue("DATABASE_URL", env, dotEnv);
  const selectedName = MIGRATION_URL_ENV_NAMES.find((name) =>
    readValue(name, env, dotEnv),
  );
  const migrationUrl = selectedName
    ? readValue(selectedName, env, dotEnv)
    : undefined;

  if (migrationUrl && isPooledNeonUrl(migrationUrl)) {
    return {
      error: `${selectedName} debe usar el endpoint directo, no el pooler de Neon.`,
    };
  }

  if (runtimeUrl && isPooledNeonUrl(runtimeUrl) && !migrationUrl) {
    return {
      error:
        "La migración requiere DIRECT_URL o DATABASE_URL_UNPOOLED cuando DATABASE_URL usa el pooler de Neon.",
    };
  }

  return {
    runtimeUrl,
    migrationUrl,
    sourceName: selectedName || "DATABASE_URL",
  };
}
