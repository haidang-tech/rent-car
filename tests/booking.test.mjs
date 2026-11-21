import assert from "node:assert/strict";
import test from "node:test";
import { bookingValidationUrl, jsModuleUrl, timeUrl, tsModuleUrl } from "./load-ts.mjs";

const { validateBookingInput, bookingErrorMessage } = await import(bookingValidationUrl);
const { vnDateTimeInput } = await import(timeUrl);
const now = new Date("2026-11-21T00:00:00Z");
const valid = {
  carId: "11111111-1111-4111-8111-000000000001", name: "Nguyễn An",
  phone: "0905123456", email: "an@example.com", pickup: "2026-11-22T08:00",
  ret: "2026-11-23T08:00", location: "Đà Nẵng", note: "",
};

test("booking validation parses Vietnam time and enforces 1 day / 30 day boundaries", () => {
  assert.deepEqual(validateBookingInput(valid, now), {
    pickupAt: "2026-11-22T08:00:00+07:00", returnAt: "2026-11-23T08:00:00+07:00",
  });
  assert.ok(!validateBookingInput({ ...valid, pickup: "2026-11-20T07:00" }, now).error);
  assert.match(validateBookingInput({ ...valid, pickup: "2026-11-20T06:59" }, now).error, /quá khứ/);
  assert.ok(!validateBookingInput({ ...valid, ret: "2026-12-22T08:00" }, now).error);
  assert.match(validateBookingInput({ ...valid, ret: "2026-12-22T08:01" }, now).error, /30 ngày/);
  for (const pickup of ["invalid", "2026-02-30T09:00", "2026-11-22T24:00"]) {
    assert.ok(validateBookingInput({ ...valid, pickup }, now).error);
  }
  assert.match(validateBookingInput({ ...valid, ret: valid.pickup }, now).error, /sau/);
});

test("booking validates identity, contact, location and note before RPC", () => {
  for (const change of [{ carId: "bad" }, { name: "A" }, { name: "x".repeat(121) }, { name: "An\nLe" }, { phone: "123" }, { phone: "0905abc123456" }, { email: "bad@" }, { email: `${"a".repeat(250)}@x.vn` }, { note: "x".repeat(2001) }, { location: "" }]) {
    assert.ok(validateBookingInput({ ...valid, ...change }, now).error, JSON.stringify(change));
  }
  assert.ok(!validateBookingInput({ ...valid, phone: "+84905123456", email: "", note: "x".repeat(2000) }, now).error);
  assert.match(bookingErrorMessage({ code: "23P01" }), /lịch thuê/);
  assert.doesNotMatch(bookingErrorMessage({ message: "private database detail" }), /private database/);
});

let client;
globalThis.__bookingMocks = {
  createClient: async () => client, getProfile: async () => null, revalidatePath: () => {},
};
const boundary = jsModuleUrl(`export const createClient = (...args) => globalThis.__bookingMocks.createClient(...args);
export const getProfile = (...args) => globalThis.__bookingMocks.getProfile(...args);
export const revalidatePath = (...args) => globalThis.__bookingMocks.revalidatePath(...args);
export const redirect = (path) => { throw new Error(path); };`);
const { createBookingAction } = await import(await tsModuleUrl("../lib/actions/bookings.ts", {
  "next/cache": boundary, "next/navigation": boundary, "@/lib/supabase/server": boundary,
  "@/lib/auth": boundary, "@/lib/booking-validation": bookingValidationUrl,
}));

function form() {
  const data = new FormData();
  Object.entries({ car_id: valid.carId, customer_name: valid.name, customer_phone: valid.phone,
    customer_email: valid.email, pickup_location: valid.location,
    pickup_at: vnDateTimeInput(new Date(Date.now() + 3 * 86400000)),
    return_at: vnDateTimeInput(new Date(Date.now() + 5 * 86400000)), note: "",
  }).forEach(([key, value]) => data.set(key, value));
  return data;
}

function mockClient(location, rpc) {
  const query = { select: () => query, eq: () => query, limit: () => query, maybeSingle: async () => location };
  return { from: () => query, rpc };
}

test("createBookingAction never calls RPC on invalid form or inactive location", async () => {
  let calls = 0;
  client = mockClient({ data: null, error: null }, async () => { calls++; });
  const invalid = form();
  invalid.set("pickup_at", "bad");
  assert.ok((await createBookingAction(null, invalid)).error);
  assert.match((await createBookingAction(null, form())).error, /Điểm nhận/);
  assert.equal(calls, 0);
});

test("createBookingAction sends explicit +07:00 and returns a guest booking code", async () => {
  let payload;
  client = mockClient({ data: { id: "location" }, error: null }, async (name, input) => {
    assert.equal(name, "create_booking"); payload = input;
    return { data: { code: "LD-TEST" }, error: null };
  });
  assert.equal((await createBookingAction(null, form())).code, "LD-TEST");
  assert.match(payload.p_pickup_at, /:00\+07:00$/);
  assert.match(payload.p_return_at, /:00\+07:00$/);
});

test("RPC collisions and transport failures return friendly errors", async () => {
  client = mockClient({ data: { id: "location" } }, async () => ({ data: null, error: { code: "23P01", message: "database details" } }));
  assert.match((await createBookingAction(null, form())).error, /lịch thuê/);
  client = mockClient({ data: { id: "location" } }, async () => { throw new Error("secret network detail"); });
  assert.match((await createBookingAction(null, form())).error, /Kết nối/);
});
