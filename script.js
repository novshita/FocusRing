(function(){
  const timeDisplay = document.getElementById('timeDisplay');
  const modeLabel = document.getElementById('modeLabel');
  const sessionWord = document.getElementById('sessionWord');
  const startPauseBtn = document.getElementById('startPauseBtn');
  const stopBtn = document.getElementById('stopBtn');
  const resetBtn = document.getElementById('resetBtn');
  const editRow = document.getElementById('editRow');
  const workInput = document.getElementById('workInput');
  const breakInput = document.getElementById('breakInput');
  const longInput = document.getElementById('longInput');
  const progressRing = document.getElementById('progressRing');
  const seedsWrap = document.getElementById('seeds');

  const RADIUS = 112;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  progressRing.style.strokeDasharray = CIRCUMFERENCE;

  const MODE = { WORK: 'work', BREAK: 'break', LONG: 'long' };
  const THEME = {
    [MODE.WORK]: { accent: '--tomato', dark: '--tomato-dark', label: 'Working' },
    [MODE.BREAK]: { accent: '--sage', dark: '--sage-dark', label: 'Short Break' },
    [MODE.LONG]: { accent: '--amber', dark: '--amber-dark', label: 'Long Break' }
  };

  let mode = MODE.WORK;
  let totalSeconds = getMinutes('work') * 60;
  let remaining = totalSeconds;
  let running = false;
  let timerId = null;
  let completedWork = 0; // completed work sessions in current cycle of 4
  let cycleIndex = 0;    // 0..3 to know when the 4th break becomes long

  buildSeeds();
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

  function applyTheme(m){
    const t = THEME[m];
    const root = document.documentElement.style;
    root.setProperty('--accent', `var(${t.accent})`);
    root.setProperty('--accent-dark', `var(${t.dark})`);
    modeLabel.textContent = t.label;
  }

  function formatTime(s){
    const mm = Math.floor(s / 60).toString().padStart(2, '0');
    const ss = Math.floor(s % 60).toString().padStart(2, '0');
    return `${mm}:${ss}`;
  }

  function renderAll(){
    applyTheme(mode);
    timeDisplay.textContent = formatTime(remaining);
    sessionWord.textContent = mode === MODE.WORK
      ? `Session ${completedWork + 1}`
      : (mode === MODE.LONG ? 'Take a long break' : 'Take a short break');
    const frac = remaining / (totalSeconds || 1);
    const offset = CIRCUMFERENCE * (1 - frac);
    progressRing.style.strokeDashoffset = offset;
    startPauseBtn.textContent = running ? 'Pause' : (remaining === totalSeconds ? 'Start' : 'Resume');
    renderSeeds();
  }

  function buildSeeds(){
    seedsWrap.innerHTML = '';
    for(let i=0;i<4;i++){
      const s = document.createElement('span');
      s.className = 'seed';
      seedsWrap.appendChild(s);
    }
  }

  function renderSeeds(){
    const seeds = seedsWrap.querySelectorAll('.seed');
    seeds.forEach((s, i) => {
      s.classList.remove('filled', 'longbreak');
      if(i < cycleIndex) s.classList.add('filled');
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
    }catch(e){ /* audio not available, fail silently */ }
  }

  startPauseBtn.addEventListener('click', () => {
    if(running){ pauseTimer(); } else { startTimer(); }
  });

  stopBtn.addEventListener('click', stopToSessionStart);
  resetBtn.addEventListener('click', fullReset);

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
