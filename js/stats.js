import { dayKey } from './util.js';

// Pure functions over the focus history -- no DOM, no storage -- so they can be
// unit-tested in Node. History is aggregated per local day
// ({"2026-09-17": {m: minutes, n: sessions}}) rather than one record per
// session, so it stays a few KB even after years.

export const GARDEN_DAYS = 30;
export const GARDEN_SIZE = 220;
const GARDEN_MIN_R = 12;
const GARDEN_MAX_R = 104;

// Returns a new history object instead of mutating, so callers can't corrupt
// what they just read if a later write fails.
export function addSession(history, minutes, date){
  const key = dayKey(date);
  const day = history[key] || { m: 0, n: 0 };
  return Object.assign({}, history, { [key]: { m: day.m + minutes, n: day.n + 1 } });
}

// Time-of-day badges can't be recomputed later -- history only keeps daily
// totals -- so they're stamped at the moment the session ends.
export function timeOfDayFlags(flags, hour){
  const next = Object.assign({}, flags);
  if(hour < 8) next.early = true;
  if(hour >= 23) next.night = true;
  return next;
}

// Badges use the best streak ever, not the current one, so an earned badge is
// never taken away when a streak breaks. Dates are stepped at noon to dodge
// daylight-saving shifts making a day 23 or 25 hours long.
export function bestStreak(history){
  let best = 0;
  let run = 0;
  let prevKey = null;
  Object.keys(history).sort().forEach(key => {
    if(prevKey){
      const expected = new Date(prevKey + 'T12:00:00');
      expected.setDate(expected.getDate() + 1);
      run = dayKey(expected) === key ? run + 1 : 1;
    } else {
      run = 1;
    }
    prevKey = key;
    if(run > best) best = run;
  });
  return best;
}

// A streak survives today being empty -- it only breaks once yesterday is
// empty too, otherwise it would read as 0 every morning.
export function currentStreak(history, now){
  const cursor = new Date(now);
  if(!history[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while(history[dayKey(cursor)]){
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function journeyStats(history, flags, now){
  let totalMinutes = 0;
  let totalSessions = 0;
  let bestDay = 0;
  Object.keys(history).forEach(k => {
    totalMinutes += history[k].m;
    totalSessions += history[k].n;
    bestDay = Math.max(bestDay, history[k].m);
  });

  return {
    totalMinutes: totalMinutes,
    totalSessions: totalSessions,
    streak: currentStreak(history, now),
    bestStreak: bestStreak(history),
    bestDay: bestDay,
    flags: flags
  };
}

export function lastSevenDays(history, now){
  const days = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const rec = history[dayKey(d)];
    days.push({ date: d, minutes: rec ? rec.m : 0 });
  }
  return days;
}

export function heatLevel(minutes){
  if(minutes <= 0) return 0;
  if(minutes < 30) return 1;
  if(minutes < 60) return 2;
  if(minutes < 120) return 3;
  return 4;
}

// Geometry for the last 30 days as concentric rings in a 220-unit square: the
// oldest day is the innermost ring and today is the outermost. Thicker, more
// opaque rings mean more focus; a day with no focus is a faint hairline. Shared
// by the on-screen SVG and the exported share card so they always match.
export function gardenRings(history, now){
  const c = GARDEN_SIZE / 2;
  const step = (GARDEN_MAX_R - GARDEN_MIN_R) / (GARDEN_DAYS - 1);
  const rings = [];
  for(let i = 0; i < GARDEN_DAYS; i++){
    const date = new Date(now);
    date.setDate(date.getDate() - (GARDEN_DAYS - 1 - i));
    const rec = history[dayKey(date)];
    const minutes = rec ? rec.m : 0;
    const strength = Math.min(minutes / 120, 1);
    // Wood is never perfectly round, so each ring drifts a little off-centre.
    const wobble = Math.sin(i * 1.7) * 0.9;
    rings.push({
      date: date,
      minutes: minutes,
      sessions: rec ? rec.n : 0,
      grown: minutes > 0,
      isToday: i === GARDEN_DAYS - 1,
      r: GARDEN_MIN_R + step * i,
      cx: c + wobble,
      cy: c - wobble * 0.6,
      width: minutes > 0 ? 0.9 + strength * 1.6 : 0.5,
      opacity: minutes > 0 ? 0.55 + strength * 0.45 : 0.35
    });
  }
  return rings;
}
