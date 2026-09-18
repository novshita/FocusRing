export const MODE = { WORK: 'work', BREAK: 'break', LONG: 'long' };

// Local-date key, deliberately not toISOString(), which would shift the day for
// anyone east or west of UTC.
export function dayKey(d){
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

export function formatDuration(minutes){
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if(h && m) return h + 'h ' + m + 'm';
  if(h) return h + 'h';
  return m + 'm';
}

export function formatTime(seconds){
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = Math.floor(seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}
