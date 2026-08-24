import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/notification-rules.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "notification-rules.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const {
  getNotificationBadgeCount,
  isNotificationUnread,
  sortNotifications,
} = await import(moduleUrl);

const before = new Date("2026-08-20T12:00:00.000Z");
const seenAt = new Date("2026-08-21T12:00:00.000Z");
const after = new Date("2026-08-22T12:00:00.000Z");

test("una tarea pendiente permanece marcada aunque se haya abierto la campana", () => {
  assert.equal(isNotificationUnread("ACTION", before, seenAt), true);
});

test("una novedad informativa respeta la última lectura del usuario", () => {
  assert.equal(isNotificationUnread("INFO", before, seenAt), false);
  assert.equal(isNotificationUnread("INFO", after, seenAt), true);
  assert.equal(isNotificationUnread("INFO", before, null), true);
});

test("el contador suma tareas activas y novedades no leídas", () => {
  assert.equal(getNotificationBadgeCount(3, 2), 5);
  assert.equal(getNotificationBadgeCount(-1, 2), 2);
});

test("prioriza acciones y luego ordena por fecha descendente", () => {
  const items = sortNotifications([
    { id: "info", kind: "INFO", occurredAt: after },
    { id: "old-action", kind: "ACTION", occurredAt: before },
    { id: "new-action", kind: "ACTION", occurredAt: after },
  ]);

  assert.deepEqual(items.map((item) => item.id), [
    "new-action",
    "old-action",
    "info",
  ]);
});
