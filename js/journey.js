import { dayKey, formatDuration } from './util.js';
import { readJSON, writeJSON } from './storage.js';

const HISTORY_KEY = 'focusring_history';
const BADGE_FLAGS_KEY = 'focusring_badge_flags';

const journeyBody = document.getElementById('journeyBody');

const BADGES = [
  { emoji: '🌱', name: 'First Focus', need: 'Finish your first session',
    done: s => s.totalSessions >= 1, have: s => s.totalSessions, goal: 1 },
  { emoji: '🎯', name: 'Finding Rhythm', need: 'Finish 5 sessions',
    done: s => s.totalSessions >= 5, have: s => s.totalSessions, goal: 5 },
  { emoji: '🏅', name: 'Committed', need: 'Finish 25 sessions',
    done: s => s.totalSessions >= 25, have: s => s.totalSessions, goal: 25 },
  { emoji: '🔥', name: 'Three in a Row', need: 'Focus 3 days running',
    done: s => s.bestStreak >= 3, have: s => s.bestStreak, goal: 3 },
  { emoji: '⚡', name: 'Week Warrior', need: 'Focus 7 days running',
    done: s => s.bestStreak >= 7, have: s => s.bestStreak, goal: 7 },
  { emoji: '🧠', name: 'Deep Work', need: '2 hours in a single day',
    done: s => s.bestDay >= 120, have: s => Math.floor(s.bestDay / 60), goal: 2 },
  { emoji: '⏳', name: 'Ten Hours Deep', need: '10 hours focused in total',
    done: s => s.totalMinutes >= 600, have: s => Math.floor(s.totalMinutes / 60), goal: 10 },
  { emoji: '🌅', name: 'Early Riser', need: 'Finish a session before 8am',
    done: s => !!s.flags.early },
  { emoji: '🦉', name: 'Night Owl', need: 'Finish a session after 11pm',
    done: s => !!s.flags.night }
];

// History is aggregated per local day ({"2026-09-17": {m: minutes, n: sessions}})
// rather than one record per session, so it stays a few KB even after years.
function loadHistory(){
  return readJSON(HISTORY_KEY, {});
}

function loadBadgeFlags(){
  return readJSON(BADGE_FLAGS_KEY, {});
}

// Time-of-day badges can't be recomputed later -- history only keeps daily
// totals -- so they're stamped at the moment the session ends.
function recordTimeOfDayFlags(){
  const hour = new Date().getHours();
  const flags = loadBadgeFlags();
  if(hour < 8) flags.early = true;
  if(hour >= 23) flags.night = true;
  writeJSON(BADGE_FLAGS_KEY, flags);
}

// Badges use the best streak ever, not the current one, so an earned badge is
// never taken away when a streak breaks. Dates are stepped at noon to dodge
// daylight-saving shifts making a day 23 or 25 hours long.
function bestStreak(history){
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

function journeyStats(history){
  let totalMinutes = 0;
  let totalSessions = 0;
  Object.keys(history).forEach(k => {
    totalMinutes += history[k].m;
    totalSessions += history[k].n;
  });

  // A streak survives today being empty -- it only breaks once yesterday is
  // empty too, otherwise it would read as 0 every morning.
  const cursor = new Date();
  if(!history[dayKey(cursor)]) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while(history[dayKey(cursor)]){
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }

  return {
    totalMinutes: totalMinutes,
    totalSessions: totalSessions,
    streak: streak,
    bestStreak: bestStreak(history),
    bestDay: Object.keys(history).reduce((max, k) => Math.max(max, history[k].m), 0),
    flags: loadBadgeFlags()
  };
}

function lastSevenDays(history){
  const days = [];
  for(let i = 6; i >= 0; i--){
    const d = new Date();
    d.setDate(d.getDate() - i);
    const rec = history[dayKey(d)];
    days.push({ date: d, minutes: rec ? rec.m : 0 });
  }
  return days;
}

export function recordSession(minutes){
  recordTimeOfDayFlags();
  const history = loadHistory();
  const key = dayKey(new Date());
  const day = history[key] || { m: 0, n: 0 };
  day.m += minutes;
  day.n += 1;
  history[key] = day;
  if(!writeJSON(HISTORY_KEY, history)) return;
  renderJourney();
}

export function renderJourney(){
  const history = loadHistory();
  const stats = journeyStats(history);
  journeyBody.innerHTML = '';

  if(stats.totalSessions === 0){
    const empty = document.createElement('p');
    empty.className = 'journey-empty';
    empty.textContent = 'No sessions yet. Finish your first focus session and your streak starts here.';
    journeyBody.appendChild(empty);
    renderBadges(stats);
    return;
  }

  const tiles = document.createElement('div');
  tiles.className = 'stat-tiles';
  [
    [stats.streak, 'day streak'],
    [stats.totalSessions, stats.totalSessions === 1 ? 'session' : 'sessions'],
    [formatDuration(stats.totalMinutes), 'focused']
  ].forEach(pair => {
    const tile = document.createElement('div');
    tile.className = 'stat-tile';
    const value = document.createElement('div');
    value.className = 'stat-value';
    value.textContent = pair[0];
    const label = document.createElement('div');
    label.className = 'stat-label';
    label.textContent = pair[1];
    tile.appendChild(value);
    tile.appendChild(label);
    tiles.appendChild(tile);
  });
  journeyBody.appendChild(tiles);

  const week = lastSevenDays(history);
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
  const peak = Math.max.apply(null, week.map(d => d.minutes));
  // Scale to at least an hour, rounded up to the next half hour, so a single
  // short day doesn't fill the whole track just for being the only day.
  const scaleMax = Math.max(60, Math.ceil(peak / 30) * 30);
  const todayKey = dayKey(new Date());

  const head = document.createElement('div');
  head.className = 'chart-head';
  const heading = document.createElement('span');
  heading.className = 'category-title';
  heading.textContent = '📊 Last 7 days';
  const total = document.createElement('span');
  total.className = 'chart-total';
  total.textContent = formatDuration(weekTotal);
  head.appendChild(heading);
  head.appendChild(total);
  journeyBody.appendChild(head);

  const chart = document.createElement('div');
  chart.className = 'bar-chart';
  week.forEach(day => {
    const isToday = dayKey(day.date) === todayKey;
    const col = document.createElement('div');
    col.className = 'bar-col';

    const track = document.createElement('div');
    track.className = 'bar-track';
    const fill = document.createElement('div');
    fill.className = 'bar-fill';
    fill.style.height = (day.minutes > 0 ? Math.max((day.minutes / scaleMax) * 100, 4) : 0) + '%';
    const value = document.createElement('span');
    value.className = 'bar-value';
    value.textContent = day.minutes > 0 ? formatDuration(day.minutes) : '--';
    track.appendChild(fill);
    track.appendChild(value);

    const label = document.createElement('span');
    label.className = 'bar-label' + (isToday ? ' bar-label-today' : '');
    label.textContent = day.date.toLocaleDateString(undefined, { weekday: 'narrow' });

    col.appendChild(track);
    col.appendChild(label);
    chart.appendChild(col);
  });
  journeyBody.appendChild(chart);
  renderBadges(stats);
}

function renderBadges(stats){
  const heading = document.createElement('div');
  heading.className = 'category-title badge-heading';
  const unlocked = BADGES.filter(b => b.done(stats)).length;
  heading.textContent = '🏆 Achievements · ' + unlocked + '/' + BADGES.length;
  journeyBody.appendChild(heading);

  const list = document.createElement('div');
  list.className = 'badge-list';

  BADGES.forEach(badge => {
    const earned = badge.done(stats);
    const row = document.createElement('div');
    row.className = 'badge-row' + (earned ? ' badge-earned' : '');

    const icon = document.createElement('span');
    icon.className = 'badge-icon';
    icon.textContent = badge.emoji;
    icon.setAttribute('aria-hidden', 'true');

    const text = document.createElement('div');
    text.className = 'badge-text';
    const name = document.createElement('div');
    name.className = 'badge-name';
    name.textContent = badge.name;
    const need = document.createElement('div');
    need.className = 'badge-need';
    if(!earned && badge.goal){
      need.textContent = badge.need + ' · ' + Math.min(badge.have(stats), badge.goal) + '/' + badge.goal;
    } else {
      need.textContent = badge.need;
    }
    text.appendChild(name);
    text.appendChild(need);

    row.appendChild(icon);
    row.appendChild(text);
    list.appendChild(row);
  });

  journeyBody.appendChild(list);
}
