import { MODE } from './util.js';
import { readSettings, patchSettings } from './storage.js';

const soundToggle = document.getElementById('soundToggle');
const notifyToggle = document.getElementById('notifyToggle');
const notifyNote = document.getElementById('notifyNote');

let soundEnabled = true;
let notifyEnabled = false;

function canNotify(){
  return 'Notification' in window;
}

export function playChime(){
  if(!soundEnabled) return;
  try{
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const now = ctx.currentTime;
    [523.25, 659.25].forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + idx * 0.22);
      gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.22 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.22 + 0.5);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + idx * 0.22);
      osc.stop(now + idx * 0.22 + 0.55);
    });
  }catch(e){}
}

// Deliberately silent while the tab is visible -- you can already see the timer.
export function notifySessionEnd(finished, next){
  if(!notifyEnabled || !canNotify() || Notification.permission !== 'granted') return;
  if(!document.hidden) return;
  const title = finished === MODE.WORK ? 'Focus session complete' : 'Break over';
  const body = next === MODE.WORK ? 'Ready when you are — start your next focus session.'
    : next === MODE.LONG ? 'Time for a long break.'
    : 'Time for a short break.';
  try{
    new Notification(title, { body: body, tag: 'focusring-session' });
  }catch(e){}
}

function renderToggles(){
  soundToggle.checked = soundEnabled;
  notifyToggle.checked = notifyEnabled;
  notifyNote.hidden = canNotify();
  if(!canNotify()) notifyNote.textContent = "This browser doesn't support notifications.";
}

function save(){
  patchSettings({ soundEnabled: soundEnabled, notifyEnabled: notifyEnabled });
}

export function initAlerts(){
  const saved = readSettings();
  soundEnabled = saved.soundEnabled !== false;
  notifyEnabled = saved.notifyEnabled === true && canNotify() && Notification.permission === 'granted';
  renderToggles();

  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    if(soundEnabled) playChime();
    save();
  });

  notifyToggle.addEventListener('change', () => {
    if(!notifyToggle.checked){
      notifyEnabled = false;
      notifyNote.hidden = true;
      save();
      return;
    }

    if(!canNotify()){
      notifyToggle.checked = false;
      notifyEnabled = false;
      notifyNote.textContent = "This browser doesn't support notifications.";
      notifyNote.hidden = false;
      return;
    }

    // Must be requested from the click itself -- browsers reject a permission
    // prompt that isn't tied to a user gesture.
    Promise.resolve(
      Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
    ).then(permission => {
      if(permission === 'granted'){
        notifyEnabled = true;
        notifyNote.hidden = true;
      } else {
        notifyToggle.checked = false;
        notifyEnabled = false;
        notifyNote.textContent = 'Notifications are blocked. Allow them for this site in your browser settings, then try again.';
        notifyNote.hidden = false;
      }
      save();
    });
  });
}
