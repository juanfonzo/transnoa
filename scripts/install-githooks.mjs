#!/usr/bin/env node

import { chmodSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

const hook = resolve(".githooks", "pre-commit");

if (!existsSync(hook)) {
  console.log("[hooks] .githooks/pre-commit no existe. Se omite.");
  process.exit(0);
}

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
} catch {
  console.log("[hooks] No es un worktree Git. Se omite.");
  process.exit(0);
}

try {
  chmodSync(hook, 0o755);
} catch {
  // Git for Windows puede ejecutar el hook mediante sh.
}

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit" });
  console.log("[hooks] Instalados: core.hooksPath=.githooks");
} catch {
  console.log("[hooks] No se pudo configurar core.hooksPath; ejecutar manualmente si hace falta.");
}
