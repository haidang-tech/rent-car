import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/time.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { VN_TZ, VN_OFFSET, parseVnDateTimeLocal, vnDateKey, vnMonthStartIso, vnDateTimeInput } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);

test("Vietnam constants and strict datetime-local parsing", () => {
  assert.equal(VN_TZ, "Asia/Ho_Chi_Minh");
  assert.equal(VN_OFFSET, "+07:00");
  assert.equal(parseVnDateTimeLocal("2026-11-21T08:30"), "2026-11-21T08:30:00+07:00");
  assert.equal(parseVnDateTimeLocal("2024-02-29T00:00"), "2024-02-29T00:00:00+07:00");
  for (const value of ["", "bad", "2026-02-29T08:00", "2026-02-30T08:00", "2026-13-01T08:00", "2026-11-21T24:00", "2026-11-21T08:60", "2026-11-21", "2026-11-21T08:00Z"]) {
    assert.equal(parseVnDateTimeLocal(value), null, value);
  }
});

test("Vietnam day, month and input cross UTC boundaries", () => {
  assert.equal(vnDateKey("2026-11-21T23:00:00Z"), "2026-11-22");
  assert.equal(vnDateTimeInput("2026-11-21T23:00:00Z"), "2026-11-22T06:00");
  assert.equal(vnDateTimeInput("2026-11-21T17:00:00Z"), "2026-11-22T00:00");
  assert.equal(vnMonthStartIso(new Date("2026-12-31T23:00:00Z")), "2027-01-01T00:00:00+07:00");
  assert.equal(vnDateKey("2026-11-21"), "2026-11-21");
  assert.equal(vnDateTimeInput("2026-11-21T08:30"), "2026-11-21T08:30");
  assert.throws(() => vnDateKey("invalid"), RangeError);
});

test("helpers are independent of process timezone", () => {
  const original = process.env.TZ;
  try {
    for (const zone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = zone;
      assert.equal(parseVnDateTimeLocal("2026-11-21T08:30"), "2026-11-21T08:30:00+07:00");
      assert.equal(vnDateKey("2026-11-21T23:00:00Z"), "2026-11-22");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
