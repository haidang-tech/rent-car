import assert from "node:assert/strict";
import test from "node:test";
import ts from "typescript";
import { readFile } from "node:fs/promises";

const source = await readFile(new URL("../lib/portal-validation.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const helpers = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("portal monetary validation rejects invalid values", () => {
  assert.equal(helpers.validMoney(0), true);
  assert.equal(helpers.validMoney(500000), true);
  assert.equal(helpers.validMoney(-1), false);
  assert.equal(helpers.validMoney(Number.NaN), false);
  assert.equal(helpers.validMoney(0, false), false);
});

test("portal status validation is whitelisted", () => {
  assert.equal(helpers.validIncidentStatus("processing"), true);
  assert.equal(helpers.validIncidentStatus("deleted"), false);
  assert.equal(helpers.validFineStatus("waiting"), true);
  assert.equal(helpers.validFineStatus("paid"), false);
  assert.equal(helpers.validMaintenanceStatus("completed"), true);
  assert.equal(helpers.validMaintenanceStatus("pending"), false);
});
