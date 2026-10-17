import { dayKey, formatDuration } from './util.js';
import { readJSON, writeJSON } from './storage.js';
import { downloadShareCard } from './sharecard.js';

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
  renderHeatmap(history);
  renderGarden(history, stats);
  renderBadges(stats);
}

const HEATMAP_WEEKS = 53;

function heatLevel(minutes){
  if(minutes <= 0) return 0;
  if(minutes < 30) return 1;
  if(minutes < 60) return 2;
  if(minutes < 120) return 3;
  return 4;
}

// One cell per day for the past year, a column per week (Sunday on top), laid
// out by explicit grid position so the partial first and last weeks line up.
// Dates are built from y/m/d at noon rather than by adding 24h, so daylight
// saving shifts can't skip or repeat a day.
function renderHeatmap(history){
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const first = new Date(today.getFullYear(), today.getMonth(),
    today.getDate() - today.getDay() - (HEATMAP_WEEKS - 1) * 7, 12);
  const todayKey = dayKey(today);

  const head = document.createElement('div');
  head.className = 'chart-head heatmap-head';
  const heading = document.createElement('span');
  heading.className = 'category-title';
  heading.textContent = '🗓️ Focus year';
  const total = document.createElement('span');
  total.className = 'chart-total';
  head.appendChild(heading);
  head.appendChild(total);
  journeyBody.appendChild(head);

  const columns = 'repeat(' + HEATMAP_WEEKS + ', 1fr)';
  const months = document.createElement('div');
  months.className = 'heatmap-months';
  months.style.gridTemplateColumns = columns;
  const grid = document.createElement('div');
  grid.className = 'heatmap';
  grid.style.gridTemplateColumns = columns;

  let activeDays = 0;
  let lastMonth = -1;
  let lastLabelCol = -10;

  for(let w = 0; w < HEATMAP_WEEKS; w++){
    for(let dow = 0; dow < 7; dow++){
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + w * 7 + dow, 12);
      if(date > today) continue;

      if(dow === 0 && date.getMonth() !== lastMonth){
        lastMonth = date.getMonth();
        // Skip a label that would collide with the previous one.
        if(w - lastLabelCol >= 3){
          const label = document.createElement('span');
          label.textContent = date.toLocaleDateString(undefined, { month: 'short' });
          label.style.gridColumn = String(w + 1);
          months.appendChild(label);
          lastLabelCol = w;
        }
      }

      const rec = history[dayKey(date)];
      const minutes = rec ? rec.m : 0;
      if(minutes > 0) activeDays += 1;

      const cell = document.createElement('span');
      cell.className = 'heat-cell heat-' + heatLevel(minutes) + (dayKey(date) === todayKey ? ' heat-today' : '');
      cell.style.gridColumn = String(w + 1);
      cell.style.gridRow = String(dow + 1);
      cell.title = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) +
        (minutes > 0 ? ' · ' + formatDuration(minutes) : ' · no focus');
      grid.appendChild(cell);
    }
  }

  total.textContent = activeDays + (activeDays === 1 ? ' day' : ' days');

  const wrap = document.createElement('div');
  wrap.className = 'heatmap-wrap';
  wrap.setAttribute('role', 'img');
  wrap.setAttribute('aria-label', 'Focus heatmap for the past year. You focused on ' + activeDays + ' days.');
  wrap.appendChild(months);
  wrap.appendChild(grid);
  journeyBody.appendChild(wrap);

  const legend = document.createElement('div');
  legend.className = 'heatmap-legend';
  legend.setAttribute('aria-hidden', 'true');
  legend.appendChild(document.createTextNode('less'));
  for(let level = 0; level <= 4; level++){
    const swatch = document.createElement('span');
    swatch.className = 'heat-cell heat-' + level;
    legend.appendChild(swatch);
  }
  legend.appendChild(document.createTextNode('more'));
  journeyBody.appendChild(legend);
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const GARDEN_DAYS = 30;
const GARDEN_SIZE = 220;
const GARDEN_MIN_R = 12;
const GARDEN_MAX_R = 104;

function svgEl(name, attrs){
  const el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
  return el;
}

// Geometry for the last 30 days as concentric rings in a 220-unit square: the
// oldest day is the innermost ring and today is the outermost. Thicker, more
// opaque rings mean more focus; a day with no focus is a faint hairline. Shared
// by the on-screen SVG and the exported share card so they always match.
function gardenRings(history){
  const c = GARDEN_SIZE / 2;
  const step = (GARDEN_MAX_R - GARDEN_MIN_R) / (GARDEN_DAYS - 1);
  const rings = [];
  for(let i = 0; i < GARDEN_DAYS; i++){
    const date = new Date();
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

function renderGarden(history, stats){
  const rings = gardenRings(history);
  const grown = rings.filter(r => r.grown).length;

  const head = document.createElement('div');
  head.className = 'chart-head garden-head';
  const heading = document.createElement('span');
  heading.className = 'category-title';
  heading.textContent = '🌳 Growth rings';
  const total = document.createElement('span');
  total.className = 'chart-total';
  total.textContent = grown + ' of ' + GARDEN_DAYS + ' days';
  head.appendChild(heading);
  head.appendChild(total);
  journeyBody.appendChild(head);

  const svg = svgEl('svg', {
    'class': 'garden',
    viewBox: '0 0 ' + GARDEN_SIZE + ' ' + GARDEN_SIZE,
    role: 'img',
    'aria-label': 'Growth rings for your last ' + GARDEN_DAYS + ' days. ' +
      grown + ' of them have a focus session.'
  });
  svg.appendChild(svgEl('circle', { 'class': 'garden-core', cx: GARDEN_SIZE / 2, cy: GARDEN_SIZE / 2, r: 4 }));

  rings.forEach(ring => {
    const el = svgEl('circle', {
      'class': 'garden-ring' + (ring.grown ? ' garden-grown' : '') + (ring.isToday ? ' garden-today' : ''),
      cx: ring.cx,
      cy: ring.cy,
      r: ring.r,
      'stroke-width': ring.width.toFixed(2),
      'stroke-opacity': ring.opacity.toFixed(2)
    });
    if(ring.isToday && ring.grown){
      el.style.setProperty('--ring-len', (2 * Math.PI * ring.r).toFixed(1));
    }
    const title = svgEl('title', {});
    title.textContent = ring.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) +
      (ring.grown
        ? ' · ' + formatDuration(ring.minutes) + ' · ' + ring.sessions + (ring.sessions === 1 ? ' session' : ' sessions')
        : ' · no focus');
    el.appendChild(title);
    svg.appendChild(el);
  });

  journeyBody.appendChild(svg);

  const note = document.createElement('p');
  note.className = 'garden-note';
  note.textContent = 'Each ring is a day, oldest in the middle, today on the outside. Thicker means more focus.';
  journeyBody.appendChild(note);

  const shareBtn = document.createElement('button');
  shareBtn.type = 'button';
  shareBtn.className = 'share-btn';
  shareBtn.textContent = 'Save as image';
  shareBtn.addEventListener('click', () => {
    shareBtn.disabled = true;
    downloadShareCard({ rings: rings, size: GARDEN_SIZE, stats: stats }).then(ok => {
      shareBtn.textContent = ok ? 'Saved ✓' : "Couldn't create image";
      setTimeout(() => {
        shareBtn.textContent = 'Save as image';
        shareBtn.disabled = false;
      }, 2000);
    });
  });
  journeyBody.appendChild(shareBtn);
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
