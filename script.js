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
  const bgVideo = document.getElementById('bgVideo');
  const timeDisplay = document.getElementById('timeDisplay');
  const userBtn = document.getElementById('userBtn');
  const userBtnIcon = document.getElementById('userBtnIcon');
  const userBtnImg = document.getElementById('userBtnImg');
  const userBtnName = document.getElementById('userBtnName');
  const settingsPanel = document.getElementById('settingsPanel');
  const settingsClose = document.getElementById('settingsClose');
  const settingsBody = document.getElementById('settingsBody');
  const avatarBtn = document.getElementById('avatarBtn');
  const avatarMenu = document.getElementById('avatarMenu');
  const avatarViewOption = document.getElementById('avatarViewOption');
  const avatarUploadOption = document.getElementById('avatarUploadOption');
  const avatarRemoveOption = document.getElementById('avatarRemoveOption');
  const avatarInput = document.getElementById('avatarInput');
  const photoViewer = document.getElementById('photoViewer');
  const photoViewerImg = document.getElementById('photoViewerImg');
  const photoViewerClose = document.getElementById('photoViewerClose');
  const profileIcon = document.getElementById('profileIcon');
  const profileImg = document.getElementById('profileImg');
  const profileNameInput = document.getElementById('profileNameInput');
  const profileBioInput = document.getElementById('profileBioInput');
  const bioSaveBtn = document.getElementById('bioSaveBtn');
  const panelTabs = document.getElementById('panelTabs');
  const themesSection = document.getElementById('themesSection');
  const settingsSection = document.getElementById('settingsSection');
  const appearanceGrid = document.getElementById('appearanceGrid');
  const rotPrev = document.getElementById('rotPrev');
  const rotNext = document.getElementById('rotNext');
  const rotPause = document.getElementById('rotPause');
  const rotInterval = document.getElementById('rotInterval');
  const soundToggle = document.getElementById('soundToggle');
  const notifyToggle = document.getElementById('notifyToggle');
  const notifyNote = document.getElementById('notifyNote');

  const RADIUS = 148;
  const CIRCUMFERENCE = 2 * Math.PI * RADIUS;
  progressRing.style.strokeDasharray = CIRCUMFERENCE;

  const MODE = { WORK: 'work', BREAK: 'break', LONG: 'long' };

  const GREETINGS = {
    [MODE.WORK]: "let's get to work!",
    [MODE.BREAK]: 'take a short break',
    [MODE.LONG]: 'time for a long rest'
  };

  const BASE = 'images';
  const SETTINGS_KEY = 'focusring_settings';

  const CATEGORIES = [
    { id: 'scenery', name: 'Scenery', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'] },
    { id: 'galaxy', name: 'Galaxy', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg'] },
    { id: 'gradient', name: 'Gradient', images: ['1.jpg','2.jpg','3.jpg'] },
    { id: 'live', name: 'Live', images: ['1.mp4','2.mp4','3.mp4','4.mp4','5.mp4','6.mp4','7.mp4'], isVideo: true, baseUrl: 'https://github.com/novshita/FocusRing/releases/download/wallpapers-v1' }
  ];

  const saved = loadSettings();
  restoreMinutes(workInput, saved.workMins);
  restoreMinutes(breakInput, saved.breakMins);
  restoreMinutes(longInput, saved.longMins);
  restoreRotateSecs(saved.rotateSecs);

  let mode = MODE.WORK;
  let totalSeconds = getMinutes('work') * 60;
  let remaining = totalSeconds;
  let running = false;
  let timerId = null;
  let endsAt = 0;
  let completedWork = 0;
  let cycleIndex = 0;

  let activeCatIdx = validCatIdx(saved.catIdx);
  let activeImgIdx = validImgIdx(activeCatIdx, saved.imgIdx);
  let autoRotate = saved.autoRotate !== false;
  let rotateTimerId = null;

  let soundEnabled = saved.soundEnabled !== false;
  let notifyEnabled = saved.notifyEnabled === true && canNotify() && Notification.permission === 'granted';

  buildSeeds();
  buildSettingsPanel();
  applyBackground();
  renderRotPause();
  renderAlertToggles();
  renderAll();
  startAutoRotate();

  function loadSettings(){
    try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
    catch(e) { return {}; }
  }

  function saveSettings(){
    try{
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        workMins: workInput.value,
        breakMins: breakInput.value,
        longMins: longInput.value,
        catIdx: activeCatIdx,
        imgIdx: activeImgIdx,
        rotateSecs: rotInterval.value,
        autoRotate: autoRotate,
        soundEnabled: soundEnabled,
        notifyEnabled: notifyEnabled
      }));
    }catch(e){
      // Storage full or blocked: settings just won't stick this session. Never
      // let this abort startup -- applyBackground() calls it during init.
    }
  }

  function restoreMinutes(el, value){
    const n = parseInt(value, 10);
    if(isNaN(n)) return;
    el.value = Math.min(Math.max(n, parseInt(el.min, 10)), parseInt(el.max, 10));
  }

  function restoreRotateSecs(value){
    const match = Array.from(rotInterval.options).some(o => o.value === value);
    if(match) rotInterval.value = value;
  }

  function validCatIdx(i){
    return Number.isInteger(i) && i >= 0 && i < CATEGORIES.length ? i : 0;
  }

  function validImgIdx(catIdx, i){
    return Number.isInteger(i) && i >= 0 && i < CATEGORIES[catIdx].images.length ? i : 0;
  }

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

  function getImageUrl(catIdx, imgIdx){
    const cat = CATEGORIES[catIdx];
    if(cat.baseUrl) return `${cat.baseUrl}/${cat.images[imgIdx]}`;
    return `${BASE}/${cat.id}/${cat.images[imgIdx]}`;
  }

  function isGradientTheme(catIdx){
    return CATEGORIES[catIdx].id === 'gradient';
  }

  function applyBackground(){
    const cat = CATEGORIES[activeCatIdx];
    const url = getImageUrl(activeCatIdx, activeImgIdx);

    if(cat.isVideo){
      bgLayer.style.backgroundImage = 'none';
      bgLayer.style.display = 'none';
      bgVideo.style.display = 'block';
      bgVideo.src = url;
      bgVideo.load();
      bgVideo.play().catch(() => {});
    } else {
      bgVideo.pause();
      bgVideo.removeAttribute('src');
      bgVideo.load();
      bgVideo.style.display = 'none';
      bgLayer.style.display = 'block';
      bgLayer.style.backgroundImage = `url("${url}")`;
    }

    bgLayer.style.backgroundColor = '#1a1a2e';

    const root = document.documentElement.style;
    root.setProperty('--text', '#ffffff');
    root.setProperty('--text-soft', 'rgba(255,255,255,0.7)');
    root.setProperty('--accent', '#ffffff');
    root.setProperty('--accent-hover', 'rgba(255,255,255,0.85)');
    root.setProperty('--glass', 'rgba(255,255,255,0.15)');
    root.setProperty('--glass-border', 'rgba(255,255,255,0.25)');
    root.setProperty('--glass-strong', 'rgba(255,255,255,0.22)');
    root.setProperty('--ring-track', 'rgba(255,255,255,0.25)');
    root.setProperty('--ring-progress', 'rgba(255,255,255,0.9)');
    root.setProperty('--seed-fill', 'rgba(255,255,255,0.8)');
    root.setProperty('--seed-border', 'rgba(255,255,255,0.4)');
    root.setProperty('--focus-ring', '#ffffff');
    document.querySelector('.btn-primary').style.color = '#2c2a24';

    updateThumbHighlights();
    saveSettings();
  }

  function buildSettingsPanel(){
    settingsBody.innerHTML = '';
    CATEGORIES.forEach((cat, ci) => {
      const section = document.createElement('div');
      section.className = 'category-section';

      const title = document.createElement('div');
      title.className = 'category-title';
      title.textContent = cat.name;
      section.appendChild(title);

      const grid = document.createElement('div');
      grid.className = 'category-grid';

      cat.images.forEach((img, ii) => {
        const btn = document.createElement('button');
        btn.className = 'thumb-btn';
        btn.dataset.cat = ci;
        btn.dataset.img = ii;
        if(cat.isVideo){
          btn.classList.add('thumb-video');
          const vid = document.createElement('video');
          vid.src = cat.baseUrl ? `${cat.baseUrl}/${img}` : `${BASE}/${cat.id}/${img}`;
          vid.muted = true;
          vid.preload = 'metadata';
          vid.addEventListener('loadeddata', () => { vid.currentTime = 1; });
          btn.appendChild(vid);
        } else {
          btn.style.backgroundImage = `url("${BASE}/${cat.id}/${img}")`;
        }
        btn.addEventListener('click', () => {
          activeCatIdx = ci;
          activeImgIdx = ii;
          applyBackground();
        });
        grid.appendChild(btn);
      });

      section.appendChild(grid);
      settingsBody.appendChild(section);
    });
  }

  function updateThumbHighlights(){
    settingsBody.querySelectorAll('.thumb-btn').forEach(btn => {
      const ci = parseInt(btn.dataset.cat);
      const ii = parseInt(btn.dataset.img);
      btn.classList.toggle('active', ci === activeCatIdx && ii === activeImgIdx);
    });
  }

  function nextImage(){
    const cat = CATEGORIES[activeCatIdx];
    activeImgIdx = (activeImgIdx + 1) % cat.images.length;
    applyBackground();
  }

  function prevImage(){
    const cat = CATEGORIES[activeCatIdx];
    activeImgIdx = (activeImgIdx - 1 + cat.images.length) % cat.images.length;
    applyBackground();
  }

  function renderRotPause(){
    rotPause.classList.toggle('paused', !autoRotate);
    rotPause.innerHTML = autoRotate ? '&#10074;&#10074;' : '&#9654;';
  }

  function startAutoRotate(){
    stopAutoRotate();
    if(!autoRotate) return;
    const secs = parseInt(rotInterval.value, 10) || 300;
    rotateTimerId = setInterval(nextImage, secs * 1000);
  }

  function stopAutoRotate(){
    if(rotateTimerId){ clearInterval(rotateTimerId); rotateTimerId = null; }
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
    remaining = Math.max(0, Math.round((endsAt - Date.now()) / 1000));
    if(remaining <= 0){
      const finished = mode;
      renderAll();
      playChime();
      advanceMode();
      notifySessionEnd(finished, mode);
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
    endsAt = Date.now() + remaining * 1000;
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

  // The avatar renders at 72px, so storing the original file would waste the
  // localStorage quota (base64 is UTF-16 in storage, roughly 2.7x the file size).
  function shrinkAvatar(dataUrl, done){
    const img = new Image();
    img.onload = () => {
      const crop = Math.min(img.width, img.height);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = Math.min(crop, AVATAR_MAX_PX);
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, (img.width - crop) / 2, (img.height - crop) / 2, crop, crop,
        0, 0, canvas.width, canvas.height);
      done(canvas.toDataURL('image/png'));
    };
    img.onerror = () => done(null);
    img.src = dataUrl;
  }

  function canNotify(){
    return 'Notification' in window;
  }

  function notifySessionEnd(finished, next){
    if(!notifyEnabled || !canNotify() || Notification.permission !== 'granted') return;
    if(!document.hidden) return;
    const title = finished === MODE.WORK ? 'Focus session complete' : 'Break over';
    const body = next === MODE.WORK ? 'Ready when you are — start your next focus session.'
      : next === MODE.LONG ? 'Time for a long break.'
      : 'Time for a short break.';
    try{
      new Notification(title, { body: body, tag: 'focusring-session' });
    }catch(e){}
  }

  function renderAlertToggles(){
    soundToggle.checked = soundEnabled;
    notifyToggle.checked = notifyEnabled;
    notifyNote.hidden = canNotify();
    if(!canNotify()) notifyNote.textContent = "This browser doesn't support notifications.";
  }

  function playChime(){
    if(!soundEnabled) return;
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
      saveSettings();
      renderAll();
    });
  });

  userBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

  const PROFILE_NAME_KEY = 'focusring_profile_name';
  const PROFILE_AVATAR_KEY = 'focusring_profile_avatar';
  const PROFILE_BIO_KEY = 'focusring_profile_bio';
  const MAX_AVATAR_BYTES = 10 * 1024 * 1024;
  const AVATAR_MAX_PX = 256;

  function setAvatarImage(dataUrl){
    const hasAvatar = !!dataUrl;
    userBtnImg.src = dataUrl || '';
    userBtnImg.hidden = !hasAvatar;
    userBtnIcon.hidden = hasAvatar;
    profileImg.src = dataUrl || '';
    profileImg.hidden = !hasAvatar;
    profileIcon.hidden = hasAvatar;
    avatarViewOption.hidden = !hasAvatar;
    avatarRemoveOption.hidden = !hasAvatar;
  }

  function openAvatarMenu(){
    avatarMenu.hidden = false;
    avatarBtn.setAttribute('aria-expanded', 'true');
  }

  function closeAvatarMenu(){
    avatarMenu.hidden = true;
    avatarBtn.setAttribute('aria-expanded', 'false');
  }

  function openPhotoViewer(){
    const dataUrl = localStorage.getItem(PROFILE_AVATAR_KEY);
    if(!dataUrl) return;
    photoViewerImg.src = dataUrl;
    photoViewer.hidden = false;
  }

  function closePhotoViewer(){
    photoViewer.hidden = true;
    photoViewerImg.src = '';
  }

  function loadProfile(){
    const name = localStorage.getItem(PROFILE_NAME_KEY) || '';
    profileNameInput.value = name;
    userBtnName.textContent = name || 'Guest';
    profileBioInput.value = localStorage.getItem(PROFILE_BIO_KEY) || '';
    setAvatarImage(localStorage.getItem(PROFILE_AVATAR_KEY) || '');
  }

  avatarBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    if(avatarMenu.hidden){ openAvatarMenu(); } else { closeAvatarMenu(); }
  });

  document.addEventListener('click', (e) => {
    if(!avatarMenu.hidden && !avatarMenu.contains(e.target) && e.target !== avatarBtn){
      closeAvatarMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if(e.key !== 'Escape') return;
    if(!photoViewer.hidden){ closePhotoViewer(); }
    else if(!avatarMenu.hidden){ closeAvatarMenu(); }
  });

  avatarViewOption.addEventListener('click', () => {
    closeAvatarMenu();
    openPhotoViewer();
  });

  photoViewerClose.addEventListener('click', closePhotoViewer);

  photoViewer.addEventListener('click', (e) => {
    if(e.target === photoViewer) closePhotoViewer();
  });

  avatarUploadOption.addEventListener('click', () => {
    closeAvatarMenu();
    avatarInput.click();
  });

  avatarInput.addEventListener('change', () => {
    const file = avatarInput.files[0];
    avatarInput.value = '';
    if(!file) return;
    if(!file.type.startsWith('image/')){
      alert('Please choose an image file.');
      return;
    }
    if(file.size > MAX_AVATAR_BYTES){
      alert('Please choose an image smaller than 10MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      shrinkAvatar(reader.result, small => {
        if(!small){
          alert("That image couldn't be read. Try a different file.");
          return;
        }
        try{
          localStorage.setItem(PROFILE_AVATAR_KEY, small);
        }catch(err){
          alert("Couldn't save your photo — browser storage is full. Remove the photo and try again.");
          return;
        }
        setAvatarImage(small);
      });
    };
    reader.readAsDataURL(file);
  });

  avatarRemoveOption.addEventListener('click', () => {
    closeAvatarMenu();
    localStorage.removeItem(PROFILE_AVATAR_KEY);
    setAvatarImage('');
  });

  profileNameInput.addEventListener('input', () => {
    userBtnName.textContent = profileNameInput.value.trim() || 'Guest';
  });

  profileNameInput.addEventListener('change', () => {
    const name = profileNameInput.value.trim();
    if(name){ localStorage.setItem(PROFILE_NAME_KEY, name); }
    else { localStorage.removeItem(PROFILE_NAME_KEY); }
  });

  function saveBio(){
    const bio = profileBioInput.value.trim();
    if(bio){ localStorage.setItem(PROFILE_BIO_KEY, bio); }
    else { localStorage.removeItem(PROFILE_BIO_KEY); }
  }

  profileBioInput.addEventListener('change', saveBio);

  bioSaveBtn.addEventListener('click', () => {
    saveBio();
    profileBioInput.blur();
    settingsPanel.classList.remove('open');
  });

  loadProfile();

  panelTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.panel-tab');
    if(!btn) return;
    const target = btn.dataset.panel;
    panelTabs.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t === btn));
    themesSection.hidden = target !== 'themes';
    settingsSection.hidden = target !== 'settings';
  });

  const APPEARANCE_KEY = 'focusring_panel_appearance';
  const APPEARANCE_CLASSES = ['appearance-light', 'appearance-transparent'];

  function applyAppearance(mode){
    settingsPanel.classList.remove(...APPEARANCE_CLASSES);
    if(mode === 'light' || mode === 'transparent'){
      settingsPanel.classList.add(`appearance-${mode}`);
    }
    appearanceGrid.querySelectorAll('.appearance-swatch').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.appearance === mode);
    });
  }

  appearanceGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.appearance-swatch');
    if(!btn) return;
    const mode = btn.dataset.appearance;
    localStorage.setItem(APPEARANCE_KEY, mode);
    applyAppearance(mode);
  });

  applyAppearance(localStorage.getItem(APPEARANCE_KEY) || 'dark');

  rotPrev.addEventListener('click', prevImage);
  rotNext.addEventListener('click', nextImage);

  rotPause.addEventListener('click', () => {
    autoRotate = !autoRotate;
    renderRotPause();
    if(autoRotate){ startAutoRotate(); } else { stopAutoRotate(); }
    saveSettings();
  });

  rotInterval.addEventListener('change', () => {
    if(autoRotate) startAutoRotate();
    saveSettings();
  });

  soundToggle.addEventListener('change', () => {
    soundEnabled = soundToggle.checked;
    if(soundEnabled) playChime();
    saveSettings();
  });

  notifyToggle.addEventListener('change', () => {
    if(!notifyToggle.checked){
      notifyEnabled = false;
      notifyNote.hidden = true;
      saveSettings();
      return;
    }

    if(!canNotify()){
      notifyToggle.checked = false;
      notifyEnabled = false;
      notifyNote.textContent = "This browser doesn't support notifications.";
      notifyNote.hidden = false;
      return;
    }

    Promise.resolve(
      Notification.permission === 'default' ? Notification.requestPermission() : Notification.permission
    ).then(permission => {
      if(permission === 'granted'){
        notifyEnabled = true;
        notifyNote.hidden = true;
      } else {
        notifyToggle.checked = false;
        notifyEnabled = false;
        notifyNote.textContent = 'Notifications are blocked. Allow them for this site in your browser settings, then try again.';
        notifyNote.hidden = false;
      }
      saveSettings();
    });
  });

  document.addEventListener('visibilitychange', () => {
    if(!document.hidden && running) tick();
  });

  setEditable(true);
})();
