import { addSession, timeOfDayFlags } from './stats.js';

// The data layer. Every method is async and resolves to plain data, so the UI
// doesn't care where it lives: this version keeps it in the browser, and a
// hosted backend can replace it by implementing the same methods (see repo.js).
//
//   getProfile()            -> { name, bio, avatar }       ('' when unset)
//   saveProfile(partial)    -> boolean   an empty string removes that field
//   getSettings()           -> object
//   patchSettings(partial)  -> boolean   merged into the stored settings
//   getAppearance()         -> 'dark' | 'light' | 'transparent' | ''
//   saveAppearance(mode)    -> boolean
//   getJourney()            -> { history, flags }
//   recordSession(minutes, when?) -> boolean   false if the write didn't stick
//
// The storage keys predate this layer and are kept as-is so nobody's saved
// profile, history or settings is lost.
const KEYS = {
  settings: 'focusring_settings',
  history: 'focusring_history',
  badgeFlags: 'focusring_badge_flags',
  appearance: 'focusring_panel_appearance',
  profile: {
    name: 'focusring_profile_name',
    bio: 'focusring_profile_bio',
    avatar: 'focusring_profile_avatar'
  }
};

// `store` is anything shaped like localStorage (getItem/setItem/removeItem).
// Tests pass an in-memory one. Every access swallows failures: localStorage
// throws when the quota is full or when the browser blocks site data, and a
// throw at startup would abort the rest of module init -- which previously
// wiped the profile off the screen.
export function createLocalRepo(store){
  function readText(key){
    try { return store.getItem(key) || ''; }
    catch(e) { return ''; }
  }

  function writeText(key, value){
    try { store.setItem(key, value); return true; }
    catch(e) { return false; }
  }

  function removeKey(key){
    try { store.removeItem(key); return true; }
    catch(e) { return false; }
  }

  function readJSON(key, fallback){
    try { return JSON.parse(store.getItem(key)) || fallback; }
    catch(e) { return fallback; }
  }

  function writeJSON(key, value){
    return writeText(key, JSON.stringify(value));
  }

  return {
    async getProfile(){
      return {
        name: readText(KEYS.profile.name),
        bio: readText(KEYS.profile.bio),
        avatar: readText(KEYS.profile.avatar)
      };
    },

    async saveProfile(partial){
      let ok = true;
      Object.keys(KEYS.profile).forEach(field => {
        if(!(field in partial)) return;
        const value = partial[field];
        const saved = value ? writeText(KEYS.profile[field], value) : removeKey(KEYS.profile[field]);
        if(!saved) ok = false;
      });
      return ok;
    },

    async getSettings(){
      return readJSON(KEYS.settings, {});
    },

    // Each feature persists only its own keys, merged into the single stored
    // object, so no module has to reach into another's state just to save.
    async patchSettings(partial){
      return writeJSON(KEYS.settings, Object.assign(readJSON(KEYS.settings, {}), partial));
    },

    async getAppearance(){
      return readText(KEYS.appearance);
    },

    async saveAppearance(mode){
      return writeText(KEYS.appearance, mode);
    },

    async getJourney(){
      return {
        history: readJSON(KEYS.history, {}),
        flags: readJSON(KEYS.badgeFlags, {})
      };
    },

    async recordSession(minutes, when = new Date()){
      writeJSON(KEYS.badgeFlags, timeOfDayFlags(readJSON(KEYS.badgeFlags, {}), when.getHours()));
      return writeJSON(KEYS.history, addSession(readJSON(KEYS.history, {}), minutes, when));
    }
  };
}
