import { initAlerts } from './alerts.js';
import { initThemes } from './themes.js';
import { initTimer, resync } from './timer.js';
import { initProfile } from './profile.js';
import { initPanel } from './panel.js';
import { renderDate } from './dateline.js';

initAlerts();
initThemes();
initTimer();
initProfile();
initPanel();

document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  renderDate();
  resync();
});
