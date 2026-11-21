import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../lib/customer-state.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
const { selectCurrentTrip, tripRouteApplies } = await import(`data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`);
const trip = (id, status, pickup, ret) => ({ id, status, pickup_at: `${pickup}T09:00:00+07:00`, return_at: `${ret}T18:00:00+07:00` });

test("current trip prioritizes the rental in use over newest future reservations", () => {
  const now = Date.parse("2026-11-21T12:00:00+07:00");
  const upcoming = trip("future", "pending", "2026-12-01", "2026-12-03");
  const inUse = trip("in-use", "handed_over", "2026-11-20", "2026-11-22");
  const completed = trip("done", "completed", "2026-11-20", "2026-11-21");
  assert.equal(selectCurrentTrip([upcoming, completed, inUse], now).id, "in-use");
  assert.equal(selectCurrentTrip([completed], now), null);
});

test("current trip picks nearest upcoming before a stale pending reservation without mutating input", () => {
  const now = Date.parse("2026-11-21T12:00:00+07:00");
  const list = [trip("late", "confirmed", "2026-12-01", "2026-12-03"), trip("stale", "pending", "2026-10-01", "2026-10-03"), trip("soon", "confirmed", "2026-11-22", "2026-11-24")];
  assert.equal(selectCurrentTrip(list, now).id, "soon");
  assert.deepEqual(list.map(t => t.id), ["late", "stale", "soon"]);
  assert.equal(selectCurrentTrip([trip("today", "confirmed", "2026-11-21", "2026-11-23"), ...list], now).id, "today");
});

test("trip mutation routes match lifecycle while documents remain readable", () => {
  assert.equal(tripRouteApplies("huy", "handed_over"), false);
  assert.equal(tripRouteApplies("doi-xe", "handed_over"), false);
  assert.equal(tripRouteApplies("gia-han", "handed_over"), true);
  assert.equal(tripRouteApplies("danh-gia", "pending"), false);
  assert.equal(tripRouteApplies("danh-gia", "completed"), true);
  for (const route of ["huy", "doi-xe", "gia-han", "su-co", "danh-gia"]) assert.equal(tripRouteApplies(route, "cancelled"), false);
  for (const route of ["", "ekyc", "hop-dong", "thanh-toan"]) assert.equal(tripRouteApplies(route, "cancelled"), true);
});
