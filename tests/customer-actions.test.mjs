import assert from "node:assert/strict";
import test from "node:test";
import { jsModuleUrl, timeUrl, tsModuleUrl, validationUrl } from "./load-ts.mjs";

let context;
let lookups = 0;
globalThis.__customerMocks = { getMyTrip: async () => { lookups++; return context; } };
const boundary = jsModuleUrl(`export const getMyTrip = (...args) => globalThis.__customerMocks.getMyTrip(...args);
export const revalidatePath = () => {};
export const redirect = path => { const error = new Error(path); error.redirect = path; throw error; };`);
const { submitKycAction, requestExtensionAction, signMyContractAction } = await import(await tsModuleUrl("../lib/actions/customer.ts", {
  "next/cache": boundary, "next/navigation": boundary, "@/lib/customer-portal": boundary,
  "@/lib/validation": validationUrl, "@/lib/time": timeUrl,
}));

function setup({ failUpload = 0, rpcError, transportFailure = false } = {}) {
  lookups = 0;
  const uploaded = [], removed = [], calls = [];
  const oldPaths = ["user/old-front.jpg", "user/old-back.jpg", "user/old-license.jpg", "user/old-selfie.jpg"];
  const query = {
    select: () => query, eq: () => query,
    maybeSingle: async () => ({ data: Object.fromEntries(["id_front_path", "id_back_path", "license_path", "selfie_path"].map((key, i) => [key, oldPaths[i]])), error: null }),
  };
  let count = 0;
  context = {
    profile: { id: "user" }, trip: { id: "booking", code: "LD-TEST", return_at: "2026-11-22T09:00:00+07:00" },
    db: { from: () => query,
      storage: { from: () => ({
        upload: async path => { count++; if (count === failUpload) return { error: { message: "upload failed" } }; uploaded.push(path); return { error: null }; },
        remove: async paths => { removed.push(...paths); return { error: null }; },
      }) },
      rpc: async (name, args) => { calls.push({ name, args }); if (transportFailure) throw new Error("connection lost"); return { error: rpcError ?? null }; },
    },
  };
  return { uploaded, removed, oldPaths, calls };
}
function form() {
  const data = new FormData();
  data.set("code", "LD-TEST");
  for (const name of ["id_front", "id_back", "license", "selfie"]) data.set(name, new File(["image"], `${name}.png`, { type: "image/png" }));
  return data;
}
const isRedirect = suffix => error => typeof error.redirect === "string" && error.redirect.includes(suffix);

test("partial image upload failure removes only successful new uploads", async () => {
  const state = setup({ failUpload: 3 });
  await assert.rejects(submitKycAction(form()), isRedirect("?loi="));
  assert.equal(state.uploaded.length, 2);
  assert.deepEqual(state.removed, state.uploaded);
  assert.equal(state.calls.length, 0);
});

test("SQL rejection rolls back new images but preserves previous KYC files", async () => {
  const state = setup({ rpcError: { code: "P0001", message: "Hồ sơ đang duyệt" } });
  await assert.rejects(submitKycAction(form()), isRedirect("?loi="));
  assert.equal(state.uploaded.length, 4);
  assert.deepEqual(state.removed, state.uploaded);
  assert.ok(state.oldPaths.every(path => !state.removed.includes(path)));
});

test("successful KYC replacement preserves new images and deletes old images", async () => {
  const state = setup();
  await assert.rejects(submitKycAction(form()), isRedirect("?ok=1"));
  assert.deepEqual(state.removed, state.oldPaths);
  assert.deepEqual(state.calls[0].args.p_paths, state.uploaded);
});

test("uncertain RPC transport failure preserves images that may already be committed", async () => {
  for (const options of [{ transportFailure: true }, { rpcError: { code: "", message: "fetch failed" } }]) {
    const state = setup(options);
    await assert.rejects(submitKycAction(form()), isRedirect("?loi="));
    assert.equal(state.uploaded.length, 4);
    assert.deepEqual(state.removed, []);
  }
});

test("extension uses one trip lookup and sends explicit Vietnam time", async () => {
  const state = setup();
  const data = new FormData();
  data.set("code", "LD-TEST");
  data.set("desired_return_at", "2026-11-23T09:00");
  await assert.rejects(requestExtensionAction(data), isRedirect("?ok=1"));
  assert.equal(lookups, 1);
  assert.equal(state.calls[0].args.p_return, "2026-11-23T09:00:00+07:00");
});

test("missing contract consent redirects to a visible form error", async () => {
  setup();
  await assert.rejects(signMyContractAction(form()), isRedirect("/hop-dong?loi="));
  assert.equal(lookups, 0);
});
