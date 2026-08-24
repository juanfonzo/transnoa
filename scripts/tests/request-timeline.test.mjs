import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/request-timeline.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "request-timeline.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const { buildRequestTimeline } = await import(moduleUrl);

const at = (value) => new Date(value);

test("ordena la trazabilidad desde el evento más reciente", () => {
  const events = buildRequestTimeline({
    requestCreatedAt: at("2026-08-20T10:00:00Z"),
    createdByName: "Jefatura",
    versions: [
      {
        id: "v1",
        versionNumber: 1,
        createdAt: at("2026-08-20T10:01:00Z"),
        createdByName: "Jefatura",
        signature: {
          id: "s1",
          signedAt: at("2026-08-21T10:00:00Z"),
          signedByName: "Jefatura",
          method: "firma interna demo",
        },
        payment: {
          id: "p1",
          createdAt: at("2026-08-22T10:00:00Z"),
          paidAt: at("2026-08-22T00:00:00Z"),
          reference: "DEP-1001",
          createdByName: "Tesorería",
        },
        corrections: [],
        renditions: [],
      },
    ],
    audits: [],
  });

  assert.deepEqual(
    events.map((event) => event.title),
    ["Pago registrado", "Versión 1 firmada", "Versión inicial registrada", "Solicitud creada"],
  );
});

test("incorpora correcciones y auditoría con copy de negocio", () => {
  const events = buildRequestTimeline({
    requestCreatedAt: at("2026-08-20T10:00:00Z"),
    createdByName: "Jefatura",
    versions: [
      {
        id: "v1",
        versionNumber: 1,
        createdAt: at("2026-08-20T10:01:00Z"),
        createdByName: "Jefatura",
        corrections: [
          {
            id: "c1",
            requestedAt: at("2026-08-21T11:00:00Z"),
            requestedByName: "Tesorería",
            reason: "Revisar fecha del lote",
          },
        ],
        renditions: [],
      },
    ],
    audits: [
      {
        id: "a1",
        action: "admin_create_correction",
        createdAt: at("2026-08-22T11:00:00Z"),
        userName: "Administración",
      },
      {
        id: "raw",
        action: "seed_scenario",
        createdAt: at("2026-08-23T11:00:00Z"),
      },
    ],
  });

  assert.equal(events[0].title, "Corrección resuelta");
  assert.match(events[1].description, /Revisar fecha del lote/);
  assert.equal(events.some((event) => event.id === "audit-raw"), false);
});
