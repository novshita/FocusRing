import { createLocalRepo } from './localRepo.js';

// The one place that decides where data lives. Everything in the UI imports
// `repo` from here, so moving to a hosted backend means swapping this line
// for an implementation of the same async methods.

// Touching window.localStorage can itself throw when site data is blocked, so
// fall back to a store that always fails, which the repo already tolerates.
function browserStore(){
  try { return window.localStorage; }
  catch(e) {
    return {
      getItem(){ throw e; },
      setItem(){ throw e; },
      removeItem(){ throw e; }
    };
  }
}

export const repo = createLocalRepo(browserStore());
