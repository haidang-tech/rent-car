import test from 'node:test';
import assert from 'node:assert/strict';
import { localDate, nextDate, validateDates } from '../client/js/pages/validation.js';

test('Dates use the local calendar and handle month/year/leap boundaries', () => {
  assert.equal(localDate(new Date(2026, 10, 19, 0, 1)), '2026-11-19');
  assert.equal(nextDate('2026-12-31'), '2027-01-01');
  assert.equal(nextDate('2028-02-28'), '2028-02-29');
  assert.equal(nextDate('2026-02-28'), '2026-03-01');
});
test('Search rejects missing, past, same-day and reversed rental dates', () => {
  const today = '2026-11-19';
  assert.ok(validateDates('', '', today));
  assert.ok(validateDates('2026-11-18', '2026-11-20', today));
  assert.ok(validateDates('2026-11-20', '2026-11-20', today));
  assert.ok(validateDates('2026-11-21', '2026-11-20', today));
  assert.equal(validateDates(today, '2026-11-20', today), '');
});
