import { readFile } from "node:fs/promises";
import ts from "typescript";

// Load real source with explicit boundary mocks, without booting Next or Supabase.
export async function tsModuleUrl(path, imports = {}) {
  let source = await readFile(new URL(path, import.meta.url), "utf8");
  for (const [specifier, url] of Object.entries(imports)) {
    source = source.replaceAll(`"${specifier}"`, JSON.stringify(url));
  }
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  return `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
}

export function jsModuleUrl(source) {
  return `data:text/javascript;base64,${Buffer.from(source).toString("base64")}`;
}

export const timeUrl = await tsModuleUrl("../lib/time.ts");
export const validationUrl = await tsModuleUrl("../lib/validation.ts");
export const bookingValidationUrl = await tsModuleUrl("../lib/booking-validation.ts", {
  "./time": timeUrl, "./validation": validationUrl,
});
