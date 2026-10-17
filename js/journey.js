import { dayKey, formatDuration } from './util.js';
import { repo } from './repo.js';
import { journeyStats, lastSevenDays, heatLevel, gardenRings, GARDEN_DAYS, GARDEN_SIZE } from './stats.js';
import { BADGES } from './badges.js';
import { downloadShareCard } from './sharecard.js';

const journeyBody = document.getElementById('journeyBody');

// Each render awaits the repo, so a slow earlier read could land after a newer
// one; only the latest request is allowed to draw.
let renderSeq = 0;

function showMessage(text, className){
  journeyBody.innerHTML = '';
  const p = document.createElement('p');
  p.className = className;
  p.textContent = text;
  journeyBody.appendChild(p);
}

export function recordSession(minutes){
  return repo.recordSession(minutes).then(ok => { if(ok) renderJourney(); });
}

export async function renderJourney(){
  const seq = ++renderSeq;
  if(!journeyBody.firstChild) showMessage('Loading your journey…', 'journey-empty');

  let data;
  try {
    data = await repo.getJourney();
  } catch(e) {
    if(seq === renderSeq) showMessage("Couldn't load your journey. Close this tab and try again.", 'journey-empty journey-error');
    return;
  }
  if(seq !== renderSeq) return;

  const now = new Date();
  const history = data.history;
  const stats = journeyStats(history, data.flags, now);
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

  const week = lastSevenDays(history, now);
  const weekTotal = week.reduce((sum, d) => sum + d.minutes, 0);
  const peak = Math.max.apply(null, week.map(d => d.minutes));
  // Scale to at least an hour, rounded up to the next half hour, so a single
  // short day doesn't fill the whole track just for being the only day.
  const scaleMax = Math.max(60, Math.ceil(peak / 30) * 30);
  const todayKey = dayKey(now);

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
  renderGarden(history, stats, now);
  renderBadges(stats);
}

const HEATMAP_WEEKS = 53;

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
function svgEl(name, attrs){
  const el = document.createElementNS(SVG_NS, name);
  Object.keys(attrs).forEach(k => el.setAttribute(k, attrs[k]));
  return el;
}

function renderGarden(history, stats, now){
  const rings = gardenRings(history, now);
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
