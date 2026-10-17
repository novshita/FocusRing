import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

// A timezone with daylight saving, so the day-stepping tests are meaningful
// no matter where they run. Set before any Date is created.
process.env.TZ = 'America/New_York';

const {
  addSession, timeOfDayFlags, bestStreak, currentStreak, journeyStats,
  lastSevenDays, heatLevel, gardenRings, GARDEN_DAYS
} = await import('../js/stats.js');

const day = (y, m, d, h = 12) => new Date(y, m - 1, d, h);

describe('addSession', () => {
  test('creates the day on first session', () => {
    const next = addSession({}, 25, day(2026, 10, 18));
    assert.deepEqual(next, { '2026-10-18': { m: 25, n: 1 } });
  });

  test('accumulates minutes and sessions on the same day', () => {
    let h = addSession({}, 25, day(2026, 10, 18, 9));
    h = addSession(h, 30, day(2026, 10, 18, 15));
    assert.deepEqual(h['2026-10-18'], { m: 55, n: 2 });
  });

  test('does not mutate the history it was given', () => {
    const before = { '2026-10-17': { m: 10, n: 1 } };
    const snapshot = JSON.stringify(before);
    addSession(before, 25, day(2026, 10, 18));
    assert.equal(JSON.stringify(before), snapshot);
  });
});

describe('timeOfDayFlags', () => {
  test('before 8am earns early', () => {
    assert.equal(timeOfDayFlags({}, 7).early, true);
    assert.equal(timeOfDayFlags({}, 0).early, true);
  });

  test('8am itself is not early', () => {
    assert.equal(timeOfDayFlags({}, 8).early, undefined);
  });

  test('11pm and later earns night, 10pm does not', () => {
    assert.equal(timeOfDayFlags({}, 23).night, true);
    assert.equal(timeOfDayFlags({}, 22).night, undefined);
  });

  test('keeps flags already earned and does not mutate its input', () => {
    const flags = { early: true };
    const next = timeOfDayFlags(flags, 23);
    assert.deepEqual(next, { early: true, night: true });
    assert.deepEqual(flags, { early: true });
  });
});

describe('bestStreak', () => {
  test('is 0 for no history and 1 for a single day', () => {
    assert.equal(bestStreak({}), 0);
    assert.equal(bestStreak({ '2026-10-18': { m: 1, n: 1 } }), 1);
  });

  test('counts consecutive days and picks the longest run', () => {
    const h = {};
    ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06'].forEach(k => { h[k] = { m: 5, n: 1 }; });
    assert.equal(bestStreak(h), 3);
  });

  test('runs across month and year boundaries', () => {
    const h = {};
    ['2026-12-30', '2026-12-31', '2027-01-01'].forEach(k => { h[k] = { m: 5, n: 1 }; });
    assert.equal(bestStreak(h), 3);
  });

  test('runs across the spring daylight-saving change (a 23-hour day)', () => {
    const h = {};
    ['2026-03-07', '2026-03-08', '2026-03-09'].forEach(k => { h[k] = { m: 5, n: 1 }; });
    assert.equal(bestStreak(h), 3);
  });

  test('runs across the autumn daylight-saving change (a 25-hour day)', () => {
    const h = {};
    ['2026-10-31', '2026-11-01', '2026-11-02'].forEach(k => { h[k] = { m: 5, n: 1 }; });
    assert.equal(bestStreak(h), 3);
  });
});

describe('currentStreak', () => {
  const now = day(2026, 10, 18);
  const hist = (...keys) => Object.fromEntries(keys.map(k => [k, { m: 5, n: 1 }]));

  test('counts back from today', () => {
    assert.equal(currentStreak(hist('2026-10-16', '2026-10-17', '2026-10-18'), now), 3);
  });

  test('survives an empty today if yesterday had focus', () => {
    assert.equal(currentStreak(hist('2026-10-16', '2026-10-17'), now), 2);
  });

  test('is 0 once yesterday is also empty', () => {
    assert.equal(currentStreak(hist('2026-10-15', '2026-10-16'), now), 0);
  });

  test('stops at the first gap', () => {
    assert.equal(currentStreak(hist('2026-10-14', '2026-10-17', '2026-10-18'), now), 2);
  });

  test('is 0 with no history', () => {
    assert.equal(currentStreak({}, now), 0);
  });
});

describe('journeyStats', () => {
  test('sums totals and finds the best day', () => {
    const history = {
      '2026-10-16': { m: 50, n: 2 },
      '2026-10-17': { m: 125, n: 5 },
      '2026-10-18': { m: 25, n: 1 }
    };
    const stats = journeyStats(history, { early: true }, day(2026, 10, 18));
    assert.equal(stats.totalMinutes, 200);
    assert.equal(stats.totalSessions, 8);
    assert.equal(stats.bestDay, 125);
    assert.equal(stats.streak, 3);
    assert.equal(stats.bestStreak, 3);
    assert.deepEqual(stats.flags, { early: true });
  });

  test('handles an empty history', () => {
    const stats = journeyStats({}, {}, day(2026, 10, 18));
    assert.equal(stats.totalMinutes, 0);
    assert.equal(stats.totalSessions, 0);
    assert.equal(stats.streak, 0);
    assert.equal(stats.bestDay, 0);
  });
});

describe('lastSevenDays', () => {
  test('returns 7 days, oldest first, ending today', () => {
    const now = day(2026, 10, 18);
    const days = lastSevenDays({ '2026-10-18': { m: 30, n: 1 }, '2026-10-12': { m: 10, n: 1 } }, now);
    assert.equal(days.length, 7);
    assert.equal(days[0].minutes, 10);
    assert.equal(days[6].minutes, 30);
    assert.equal(days[1].minutes, 0);
  });

  test('does not mutate the date it is given', () => {
    const now = day(2026, 10, 18);
    lastSevenDays({}, now);
    assert.equal(now.getDate(), 18);
  });
});

test('heatLevel buckets minutes into five levels at the boundaries', () => {
  assert.equal(heatLevel(0), 0);
  assert.equal(heatLevel(1), 1);
  assert.equal(heatLevel(29), 1);
  assert.equal(heatLevel(30), 2);
  assert.equal(heatLevel(59), 2);
  assert.equal(heatLevel(60), 3);
  assert.equal(heatLevel(119), 3);
  assert.equal(heatLevel(120), 4);
  assert.equal(heatLevel(600), 4);
});

describe('gardenRings', () => {
  const now = day(2026, 10, 18);

  test('makes one ring per day, with today outermost', () => {
    const rings = gardenRings({}, now);
    assert.equal(rings.length, GARDEN_DAYS);
    assert.equal(rings[GARDEN_DAYS - 1].isToday, true);
    assert.equal(rings.filter(r => r.isToday).length, 1);
    for(let i = 1; i < rings.length; i++){
      assert.ok(rings[i].r > rings[i - 1].r, 'radii should strictly increase');
    }
  });

  test('marks only days with focus as grown, and draws empty days faint', () => {
    const rings = gardenRings({ '2026-10-18': { m: 60, n: 2 } }, now);
    const today = rings[GARDEN_DAYS - 1];
    const empty = rings[0];
    assert.equal(today.grown, true);
    assert.equal(today.sessions, 2);
    assert.equal(empty.grown, false);
    assert.ok(today.width > empty.width);
    assert.ok(today.opacity > empty.opacity);
  });

  test('ring thickness stops growing at two hours', () => {
    const two = gardenRings({ '2026-10-18': { m: 120, n: 1 } }, now)[GARDEN_DAYS - 1];
    const six = gardenRings({ '2026-10-18': { m: 360, n: 1 } }, now)[GARDEN_DAYS - 1];
    assert.equal(two.width, six.width);
    assert.equal(two.opacity, six.opacity);
  });

  test('is deterministic, so the screen and the share card match', () => {
    const h = { '2026-10-10': { m: 45, n: 2 } };
    assert.deepEqual(gardenRings(h, now), gardenRings(h, now));
  });
});
