const SETTINGS_KEY = 'focusring_settings';

// Every accessor swallows failures. localStorage throws when the quota is full
// or when the browser blocks site data, and a throw at startup would abort the
// rest of module init -- which previously wiped the profile off the screen.

export function readJSON(key, fallback){
  try { return JSON.parse(localStorage.getItem(key)) || fallback; }
  catch(e) { return fallback; }
}

export function writeJSON(key, value){
  try { localStorage.setItem(key, JSON.stringify(value)); return true; }
  catch(e) { return false; }
}

export function readText(key){
  try { return localStorage.getItem(key) || ''; }
  catch(e) { return ''; }
}

export function writeText(key, value){
  try { localStorage.setItem(key, value); return true; }
  catch(e) { return false; }
}

export function removeKey(key){
  try { localStorage.removeItem(key); }
  catch(e) {}
}

export function readSettings(){
  return readJSON(SETTINGS_KEY, {});
}

// Each feature persists only its own keys, merged into the single stored object.
// That way no module has to reach into another's state just to save.
export function patchSettings(partial){
  writeJSON(SETTINGS_KEY, Object.assign(readSettings(), partial));
}
