import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/validation.ts", import.meta.url), "utf8");
const { outputText, diagnostics } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  reportDiagnostics: true,
});
assert.equal(
  diagnostics?.some((diagnostic) => diagnostic.category === ts.DiagnosticCategory.Error),
  false,
);
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const validation = await import(moduleUrl);
const { MAX_IMAGE_BYTES, validateDateWindow, validateDates, validateImage } = validation;

test("validates supported image types and the 5 MB size boundary", () => {
  assert.equal(validateImage({ type: "image/jpeg", size: MAX_IMAGE_BYTES }), null);
  assert.equal(validateImage({ type: "image/webp", size: 1 }), null);
  assert.match(validateImage({ type: "image/gif", size: 1 }), /JPG, PNG hoặc WebP/);
  assert.match(validateImage({ type: "image/png", size: MAX_IMAGE_BYTES + 1 }), /5 MB/);
  assert.match(validateImage({ type: "image/png", size: 0 }), /rỗng/);
});

test("validates date-only search values against today and ordering", () => {
  assert.equal(validateDates("2026-11-21", "2026-11-22", "2026-11-20"), null);
  assert.match(validateDates("2026-11-19", "2026-11-22", "2026-11-20"), /quá khứ/);
  assert.match(validateDates("2026-11-21", "2026-11-21", "2026-11-20"), /sau ngày nhận/);
  assert.match(validateDates("2026-02-30", "2026-03-01", "2026-02-01"), /hợp lệ/);
});

test("requires a valid time window", () => {
  assert.equal(
    validateDateWindow("2026-11-20T08:00:00+07:00", "2026-11-21T08:00:00+07:00"),
    null,
  );
  assert.match(
    validateDateWindow("2026-11-20T08:00:00+07:00", "2026-11-20T08:00:00+07:00"),
    /sau thời gian nhận/,
  );
  assert.match(
    validateDateWindow("2026-11-20T08:00:00+07:00", "2026-02-31T08:00:00+07:00"),
    /thời gian nhận và trả xe hợp lệ/,
  );
  assert.match(
    validateDateWindow("2026-11-20T08:00:00+07:00", "2026-11-21T24:00:00+07:00"),
    /thời gian nhận và trả xe hợp lệ/,
  );
});
