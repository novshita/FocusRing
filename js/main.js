import { initAlerts } from './alerts.js';
import { initThemes } from './themes.js';
import { initTimer, resync } from './timer.js';
import { initProfile } from './profile.js';
import { initPanel } from './panel.js';
import { renderDate } from './dateline.js';

document.addEventListener('visibilitychange', () => {
  if(document.hidden) return;
  renderDate();
  resync();
});

// Each feature loads its own saved data. They run side by side, and one failing
// is reported without stopping the others from starting.
Promise.allSettled([initAlerts(), initThemes(), initTimer(), initProfile(), initPanel()])
  .then(results => {
    results.forEach(result => {
      if(result.status === 'rejected') console.error('A feature failed to start', result.reason);
    });
  });
