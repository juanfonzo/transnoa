import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const sourceUrl = new URL("../../src/lib/request-number.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
  fileName: "request-number.ts",
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(
  transpiled.outputText,
).toString("base64")}`;
const { getNextRequestNumber } = await import(moduleUrl);

test("usa el mayor correlativo aunque no sea la solicitud más reciente", () => {
  assert.equal(
    getNextRequestNumber(["REQ-1001", "REQ-1007", "REQ-1002"]),
    "REQ-1008",
  );
});

test("ignora identificadores ajenos y comienza con cuatro dígitos", () => {
  assert.equal(getNextRequestNumber(["DEMO-55", "REQ-ABC"]), "REQ-0001");
});
