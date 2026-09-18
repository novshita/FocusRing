import { dayKey } from './util.js';

const dateLine = document.getElementById('dateLine');

let renderedDay = '';

// Only touches the DOM when the day actually changes, so calling it from the
// render loop every tick is cheap and the date stays right past midnight.
export function renderDate(){
  const now = new Date();
  const key = dayKey(now);
  if(key === renderedDay) return;
  renderedDay = key;
  const weekday = now.toLocaleDateString(undefined, { weekday: 'long' });
  const month = now.toLocaleDateString(undefined, { month: 'long' });
  dateLine.textContent = weekday + ' · ' + now.getDate() + ' ' + month;
}
