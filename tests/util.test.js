import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dayKey, formatDuration, formatTime } from '../js/util.js';

test('dayKey uses the local date and zero-pads month and day', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 9)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31, 23, 59)), '2026-12-31');
});

test('dayKey stays on the local day late at night', () => {
  // toISOString() would roll this to the next day in timezones behind UTC.
  assert.equal(dayKey(new Date(2026, 5, 15, 23, 30)), '2026-06-15');
});

test('formatDuration shows hours and minutes, dropping zero parts', () => {
  assert.equal(formatDuration(0), '0m');
  assert.equal(formatDuration(45), '45m');
  assert.equal(formatDuration(60), '1h');
  assert.equal(formatDuration(125), '2h 5m');
});

test('formatTime renders mm:ss', () => {
  assert.equal(formatTime(0), '00:00');
  assert.equal(formatTime(65), '01:05');
  assert.equal(formatTime(25 * 60), '25:00');
  assert.equal(formatTime(99 * 60 + 59), '99:59');
});
