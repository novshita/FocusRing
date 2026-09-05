(function(){
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
  const bgLayer = document.getElementById('bgLayer');
  const themePills = document.getElementById('themePills');
  const timeDisplay = document.getElementById('timeDisplay');

  const RADIUS = 148;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  progressRing.style.strokeDasharray = CIRCUMFERENCE;

  const MODE = { WORK: 'work', BREAK: 'break', LONG: 'long' };

  const GREETINGS = {
    [MODE.WORK]: "let's get to work!",
    [MODE.BREAK]: 'take a short break',
    [MODE.LONG]: 'time for a long rest'
  };

  const THEMES = [
    {
      id: 'sage-green',
      name: 'sage green',
      type: 'gradient',
      bg: 'linear-gradient(135deg, #4a7c59 0%, #6b9e7a 40%, #8fbc8f 100%)',
      overlay: 'rgba(0,0,0,0.15)'
    },
    {
      id: 'cottage',
      name: 'cottage',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.3)'
    },
    {
      id: 'lofi-cafe',
      name: 'lofi cafe',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.35)'
    },
    {
      id: 'anime-landscape',
      name: 'anime sky',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.25)'
    },
    {
      id: 'ocean-sunset',
      name: 'ocean sunset',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.3)'
    },
    {
      id: 'mountain-dawn',
      name: 'mountain dawn',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.3)'
    },
    {
      id: 'rainy-window',
      name: 'rainy window',
      type: 'photo',
      bg: 'url("https://images.unsplash.com/photo-1515694346937-94d85e41e6f0?w=1920&q=80") center/cover',
      overlay: 'rgba(0,0,0,0.35)'
    },
    {
      id: 'lavender-dream',
      name: 'lavender dream',
      type: 'gradient',
      bg: 'linear-gradient(135deg, #c3aed6 0%, #e8d5e0 40%, #f5e6cc 100%)',
      overlay: 'rgba(0,0,0,0.08)',
      darkText: true
    }
  ];

  let mode = MODE.WORK;
  let totalSeconds = getMinutes('work') * 60;
  let remaining = totalSeconds;
  let running = false;
  let timerId = null;
  let completedWork = 0;
  let cycleIndex = 0;
  let currentTheme = 0;
  let prevTimeStr = '30:00';

  buildSeeds();
  buildThemePills();
  applyTheme(0);
  renderAll();

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

  function applyTheme(idx){
    currentTheme = idx;
    const t = THEMES[idx];
    bgLayer.style.background = t.bg;
    document.querySelector('.bg-overlay').style.background = t.overlay;

    const root = document.documentElement.style;
    if(t.darkText){
      root.setProperty('--text', '#3b312a');
      root.setProperty('--text-soft', 'rgba(59,49,42,0.6)');
      root.setProperty('--accent', '#3b312a');
      root.setProperty('--accent-hover', 'rgba(59,49,42,0.8)');
      root.setProperty('--glass', 'rgba(255,255,255,0.35)');
      root.setProperty('--glass-border', 'rgba(255,255,255,0.5)');
      root.setProperty('--glass-strong', 'rgba(255,255,255,0.5)');
      root.setProperty('--digit-bg', 'rgba(255,255,255,0.4)');
      root.setProperty('--digit-border', 'rgba(255,255,255,0.6)');
      root.setProperty('--ring-track', 'rgba(59,49,42,0.2)');
      root.setProperty('--ring-progress', 'rgba(59,49,42,0.75)');
      root.setProperty('--seed-fill', 'rgba(59,49,42,0.7)');
      root.setProperty('--seed-border', 'rgba(59,49,42,0.3)');
      root.setProperty('--focus-ring', '#3b312a');
      document.querySelector('.btn-primary').style.color = '#faf7f2';
    } else {
      root.setProperty('--text', '#ffffff');
      root.setProperty('--text-soft', 'rgba(255,255,255,0.7)');
      root.setProperty('--accent', '#ffffff');
      root.setProperty('--accent-hover', 'rgba(255,255,255,0.85)');
      root.setProperty('--glass', 'rgba(255,255,255,0.15)');
      root.setProperty('--glass-border', 'rgba(255,255,255,0.25)');
      root.setProperty('--glass-strong', 'rgba(255,255,255,0.22)');
      root.setProperty('--digit-bg', 'rgba(255,255,255,0.18)');
      root.setProperty('--digit-border', 'rgba(255,255,255,0.3)');
      root.setProperty('--ring-track', 'rgba(255,255,255,0.25)');
      root.setProperty('--ring-progress', 'rgba(255,255,255,0.9)');
      root.setProperty('--seed-fill', 'rgba(255,255,255,0.8)');
      root.setProperty('--seed-border', 'rgba(255,255,255,0.4)');
      root.setProperty('--focus-ring', '#ffffff');
      document.querySelector('.btn-primary').style.color = '#2c2a24';
    }

    themePills.querySelectorAll('.theme-pill').forEach((p, i) => {
      p.classList.toggle('active', i === idx);
    });
  }

  function buildThemePills(){
    themePills.innerHTML = '';
    THEMES.forEach((t, i) => {
      const btn = document.createElement('button');
      btn.className = 'theme-pill' + (i === 0 ? ' active' : '');
      btn.textContent = t.name;
      btn.addEventListener('click', () => applyTheme(i));
      themePills.appendChild(btn);
    });
  }

  function formatTime(s){
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function renderAll(){
    greeting.textContent = GREETINGS[mode];

    modeTabs.querySelectorAll('.mode-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.mode === mode);
    });

    timeDisplay.textContent = formatTime(remaining);

    const frac = remaining / (totalSeconds || 1);
    const offset = CIRCUMFERENCE * (1 - frac);
    progressRing.style.strokeDashoffset = offset;

    startPauseBtn.textContent = running ? 'Pause' : (remaining === totalSeconds ? 'Start' : 'Resume');
    renderSeeds();
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
    const seeds = seedsWrap.querySelectorAll('.seed');
    seeds.forEach((s, i) => {
      s.classList.toggle('filled', i < cycleIndex);
    });
  }

  function setEditable(canEdit){
    editRow.classList.toggle('visible', canEdit);
    [workInput, breakInput, longInput].forEach(i => i.disabled = !canEdit);
  }

  function tick(){
    remaining -= 1;
    if(remaining <= 0){
      remaining = 0;
      renderAll();
      playChime();
      advanceMode();
      return;
    }
    renderAll();
  }

  function advanceMode(){
    stopTimer();
    if(mode === MODE.WORK){
      completedWork += 1;
      cycleIndex += 1;
      const isLong = cycleIndex >= 4;
      mode = isLong ? MODE.LONG : MODE.BREAK;
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

  function playChime(){
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
      renderAll();
    });
  });

  setEditable(true);
})();
