import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BADGES } from '../js/badges.js';

const blank = { totalSessions: 0, totalMinutes: 0, bestStreak: 0, bestDay: 0, flags: {} };
const badge = name => BADGES.find(b => b.name === name);

test('badge names are unique', () => {
  const names = BADGES.map(b => b.name);
  assert.equal(new Set(names).size, names.length);
});

test('nothing is unlocked with no activity', () => {
  assert.equal(BADGES.filter(b => b.done(blank)).length, 0);
});

test('session-count badges unlock exactly at their goal', () => {
  [['First Focus', 1], ['Finding Rhythm', 5], ['Committed', 25]].forEach(([name, goal]) => {
    const b = badge(name);
    assert.equal(b.done({ ...blank, totalSessions: goal - 1 }), false, name + ' below goal');
    assert.equal(b.done({ ...blank, totalSessions: goal }), true, name + ' at goal');
  });
});

test('streak badges use the best streak, so they are never taken away', () => {
  assert.equal(badge('Three in a Row').done({ ...blank, bestStreak: 3 }), true);
  assert.equal(badge('Week Warrior').done({ ...blank, bestStreak: 6 }), false);
  assert.equal(badge('Week Warrior').done({ ...blank, bestStreak: 7 }), true);
});

test('Deep Work needs two hours in one day, Ten Hours Deep needs ten in total', () => {
  assert.equal(badge('Deep Work').done({ ...blank, bestDay: 119 }), false);
  assert.equal(badge('Deep Work').done({ ...blank, bestDay: 120 }), true);
  assert.equal(badge('Ten Hours Deep').done({ ...blank, totalMinutes: 599 }), false);
  assert.equal(badge('Ten Hours Deep').done({ ...blank, totalMinutes: 600 }), true);
});

test('time-of-day badges follow the stored flags', () => {
  assert.equal(badge('Early Riser').done({ ...blank, flags: { early: true } }), true);
  assert.equal(badge('Night Owl').done({ ...blank, flags: {} }), false);
});

test('progress badges report how far along you are', () => {
  const s = { ...blank, totalSessions: 3, bestDay: 90 };
  assert.equal(badge('Finding Rhythm').have(s), 3);
  assert.equal(badge('Deep Work').have(s), 1);
});
