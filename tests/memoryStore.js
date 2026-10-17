// A stand-in for localStorage, so the data layer can be tested without a browser.
export function memoryStore(initial = {}){
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem(key){ return data.has(key) ? data.get(key) : null; },
    setItem(key, value){ data.set(key, String(value)); },
    removeItem(key){ data.delete(key); }
  };
}

// Behaves like a browser whose storage quota is full or whose site data is blocked.
export function brokenStore(){
  const fail = () => { throw new Error('QuotaExceededError'); };
  return { getItem: fail, setItem: fail, removeItem: fail };
}
