import { MODE, formatTime } from './util.js';
import { readSettings, patchSettings } from './storage.js';
import { recordSession } from './journey.js';
import { playChime, notifySessionEnd } from './alerts.js';
import { renderDate } from './dateline.js';

const greeting = document.getElementById('greeting');
const modeTabs = document.getElementById('modeTabs');
const startPauseBtn = document.getElementById('startPauseBtn');
const stopBtn = document.getElementById('stopBtn');
const resetBtn = document.getElementById('resetBtn');
const editRow = document.getElementById('editRow');
const workInput = document.getElementById('workInput');
const breakInput = document.getElementById('breakInput');
const longInput = document.getElementById('longInput');
const progressRing = document.getElementById('progressRing');
const seedsWrap = document.getElementById('seeds');
const timeDisplay = document.getElementById('timeDisplay');

const RADIUS = 148;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const GREETINGS = {
  [MODE.WORK]: "let's get to work!",
  [MODE.BREAK]: 'take a short break',
  [MODE.LONG]: 'time for a long rest'
};

let mode = MODE.WORK;
let totalSeconds = 0;
let remaining = 0;
let running = false;
let timerId = null;
let endsAt = 0;
let completedWork = 0;
let cycleIndex = 0;

function restoreMinutes(el, value){
  const n = parseInt(value, 10);
  if(isNaN(n)) return;
  el.value = Math.min(Math.max(n, parseInt(el.min, 10)), parseInt(el.max, 10));
}

function getMinutes(which){
  const el = which === 'work' ? workInput : which === 'break' ? breakInput : longInput;
  const v = parseInt(el.value, 10);
  return isNaN(v) || v < 1 ? 1 : v;
}

function durationFor(m){
  if(m === MODE.WORK) return getMinutes('work') * 60;
  if(m === MODE.BREAK) return getMinutes('break') * 60;
  return getMinutes('long') * 60;
}

function save(){
  patchSettings({
    workMins: workInput.value,
    breakMins: breakInput.value,
    longMins: longInput.value
  });
}

function buildSeeds(){
  seedsWrap.innerHTML = '';
  for(let i = 0; i < 4; i++){
    const s = document.createElement('span');
    s.className = 'seed';
    seedsWrap.appendChild(s);
  }
}

function renderSeeds(){
  seedsWrap.querySelectorAll('.seed').forEach((s, i) => {
    s.classList.toggle('filled', i < cycleIndex);
  });
}

function renderAll(){
  renderDate();
  greeting.textContent = GREETINGS[mode];

  modeTabs.querySelectorAll('.mode-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.mode === mode);
  });

  timeDisplay.textContent = formatTime(remaining);

  const frac = remaining / (totalSeconds || 1);
  progressRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - frac);

  startPauseBtn.textContent = running ? 'Pause' : (remaining === totalSeconds ? 'Start' : 'Resume');
  renderSeeds();
}

function setEditable(canEdit){
  editRow.classList.toggle('visible', canEdit);
  [workInput, breakInput, longInput].forEach(i => i.disabled = !canEdit);
}

// Remaining time comes from a target timestamp rather than counting ticks,
// because browsers throttle background-tab timers to once a minute -- counting
// ticks made a backgrounded session run long.
function tick(){
  remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
  if(remaining <= 0){
    const finished = mode;
    renderAll();
    playChime();
    advanceMode();
    notifySessionEnd(finished, mode);
    return;
  }
  renderAll();
}

function advanceMode(){
  stopTimer();
  if(mode === MODE.WORK){
    completedWork += 1;
    recordSession(Math.round(totalSeconds / 60));
    cycleIndex += 1;
    mode = cycleIndex >= 4 ? MODE.LONG : MODE.BREAK;
  } else {
    if(mode === MODE.LONG){ cycleIndex = 0; }
    mode = MODE.WORK;
  }
  totalSeconds = durationFor(mode);
  remaining = totalSeconds;
  setEditable(false);
  renderAll();
}

function switchMode(newMode){
  if(running) return;
  mode = newMode;
  totalSeconds = durationFor(mode);
  remaining = totalSeconds;
  setEditable(true);
  renderAll();
}

function startTimer(){
  if(running) return;
  running = true;
  endsAt = Date.now() + remaining * 1000;
  setEditable(false);
  timerId = setInterval(tick, 1000);
  renderAll();
}

function stopTimer(){
  running = false;
  if(timerId){ clearInterval(timerId); timerId = null; }
}

function pauseTimer(){
  stopTimer();
  renderAll();
}

function stopToSessionStart(){
  stopTimer();
  totalSeconds = durationFor(mode);
  remaining = totalSeconds;
  setEditable(true);
  renderAll();
}

function fullReset(){
  stopTimer();
  mode = MODE.WORK;
  completedWork = 0;
  cycleIndex = 0;
  totalSeconds = durationFor(mode);
  remaining = totalSeconds;
  setEditable(true);
  renderAll();
}

// Called when the tab becomes visible again, so a throttled countdown catches up
// to the wall clock immediately instead of on its next tick.
export function resync(){
  if(running) tick();
}

export function initTimer(){
  const saved = readSettings();
  restoreMinutes(workInput, saved.workMins);
  restoreMinutes(breakInput, saved.breakMins);
  restoreMinutes(longInput, saved.longMins);

  progressRing.style.strokeDasharray = CIRCUMFERENCE;
  totalSeconds = durationFor(MODE.WORK);
  remaining = totalSeconds;

  buildSeeds();
  renderAll();

  startPauseBtn.addEventListener('click', () => {
    if(running){ pauseTimer(); } else { startTimer(); }
  });

  stopBtn.addEventListener('click', stopToSessionStart);
  resetBtn.addEventListener('click', fullReset);

  modeTabs.querySelectorAll('.mode-tab').forEach(tab => {
    tab.addEventListener('click', () => switchMode(tab.dataset.mode));
  });

  [workInput, breakInput, longInput].forEach(input => {
    input.addEventListener('change', () => {
      if(running) return;
      if(mode === MODE.WORK && input === workInput){ totalSeconds = durationFor(mode); remaining = totalSeconds; }
      if(mode === MODE.BREAK && input === breakInput){ totalSeconds = durationFor(mode); remaining = totalSeconds; }
      if(mode === MODE.LONG && input === longInput){ totalSeconds = durationFor(mode); remaining = totalSeconds; }
      save();
      renderAll();
    });
  });

  setEditable(true);
}
