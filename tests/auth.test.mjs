import assert from "node:assert/strict";
import test from "node:test";
import { bookingValidationUrl, jsModuleUrl, tsModuleUrl } from "./load-ts.mjs";

const redirectUrl = await tsModuleUrl("../lib/auth-redirect.ts");
const { safeAuthNext } = await import(redirectUrl);
test("login redirects allow only known local destinations for the current role", () => {
  for (const value of ["https://evil.test", "//evil.test", "/\\evil.test", "/%2f%2fevil.test", "/xe/../../evil", "/xe\n/evil", "/quan-tri", "/dang-nhap", "javascript:alert(1)"]) {
    assert.equal(safeAuthNext(value, "/tai-khoan"), "/tai-khoan", value);
  }
  assert.equal(safeAuthNext("/xe/VF5-01?pickup=2026-11-22", "/tai-khoan"), "/xe/VF5-01?pickup=2026-11-22");
  assert.equal(safeAuthNext("/quan-tri/don", "/quan-tri"), "/quan-tri/don");
});

let profile, signedOut, created;
globalThis.__authMocks = {
  createClient: async () => {
    const query = { select: () => query, eq: () => query, maybeSingle: async () => ({ data: profile }) };
    return { from: () => query, auth: {
      signInWithPassword: async () => ({ error: null }),
      getUser: async () => ({ data: { user: { id: "user" } } }),
      signOut: async () => { signedOut = true; return { error: null }; },
    } };
  },
};
const boundary = jsModuleUrl(`export const createClient = () => globalThis.__authMocks.createClient();
export const createAdminClient = () => { throw new Error("Admin must not be called for invalid input"); };
export const ROLE_HOME = {admin:"/quan-tri",staff:"/nhan-vien",accountant:"/ke-toan",customer:"/tai-khoan"};
export const redirect = (path) => { throw new Error("redirect:" + path); };`);
const { signInAction, signUpAction } = await import(await tsModuleUrl("../lib/actions/auth.ts", {
  "next/navigation": boundary, "@/lib/supabase/server": boundary, "@/lib/supabase/admin": boundary,
  "@/lib/auth": boundary, "@/lib/auth-redirect": redirectUrl, "@/lib/booking-validation": bookingValidationUrl,
}));
const form = () => {
  const data = new FormData();
  for (const [key, value] of Object.entries({ email: "an@example.com", password: "password", next: "//evil.test", full_name: "Nguyễn An", phone: "bad" })) data.set(key, value);
  return data;
};
test("locked or missing profiles are signed out rather than redirected", async () => {
  for (const value of [null, { role: "customer", status: "locked" }]) {
    profile = value; signedOut = false;
    assert.ok((await signInAction(null, form())).error);
    assert.equal(signedOut, true);
  }
});
test("active login rejects external next and signup validates phone before admin access", async () => {
  profile = { role: "staff", status: "active" }; signedOut = false;
  await assert.rejects(signInAction(null, form()), /redirect:\/nhan-vien/);
  assert.equal(signedOut, false);
  created = await signUpAction(null, form());
  assert.match(created.error, /điện thoại/);
});
