import { readSettings, patchSettings } from './storage.js';

const bgLayer = document.getElementById('bgLayer');
const bgVideo = document.getElementById('bgVideo');
const settingsBody = document.getElementById('settingsBody');
const rotPrev = document.getElementById('rotPrev');
const rotNext = document.getElementById('rotNext');
const rotPause = document.getElementById('rotPause');
const rotInterval = document.getElementById('rotInterval');

const BASE = 'images';

// The Live videos are too big for the repo, so they stream from a GitHub
// Release instead. See project notes before adding more.
const CATEGORIES = [
  { id: 'scenery', name: 'Scenery', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg','6.jpg'] },
  { id: 'galaxy', name: 'Galaxy', images: ['1.jpg','2.jpg','3.jpg','4.jpg','5.jpg'] },
  { id: 'gradient', name: 'Gradient', images: ['1.jpg','2.jpg','3.jpg'] },
  { id: 'live', name: 'Live', images: ['1.mp4','2.mp4','3.mp4','4.mp4','5.mp4','6.mp4','7.mp4'], isVideo: true, baseUrl: 'https://github.com/novshita/FocusRing/releases/download/wallpapers-v1' }
];

let activeCatIdx = 0;
let activeImgIdx = 0;
let autoRotate = true;
let rotateTimerId = null;

function validCatIdx(i){
  return Number.isInteger(i) && i >= 0 && i < CATEGORIES.length ? i : 0;
}

function validImgIdx(catIdx, i){
  return Number.isInteger(i) && i >= 0 && i < CATEGORIES[catIdx].images.length ? i : 0;
}

function restoreRotateSecs(value){
  const match = Array.from(rotInterval.options).some(o => o.value === value);
  if(match) rotInterval.value = value;
}

function imageUrl(catIdx, imgIdx){
  const cat = CATEGORIES[catIdx];
  if(cat.baseUrl) return `${cat.baseUrl}/${cat.images[imgIdx]}`;
  return `${BASE}/${cat.id}/${cat.images[imgIdx]}`;
}

function save(){
  patchSettings({
    catIdx: activeCatIdx,
    imgIdx: activeImgIdx,
    rotateSecs: rotInterval.value,
    autoRotate: autoRotate
  });
}

function applyBackground(){
  const cat = CATEGORIES[activeCatIdx];
  const url = imageUrl(activeCatIdx, activeImgIdx);

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
  save();
}

function buildThemeGrid(){
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

export function initThemes(){
  const saved = readSettings();
  restoreRotateSecs(saved.rotateSecs);
  activeCatIdx = validCatIdx(saved.catIdx);
  activeImgIdx = validImgIdx(activeCatIdx, saved.imgIdx);
  autoRotate = saved.autoRotate !== false;

  buildThemeGrid();
  applyBackground();
  renderRotPause();
  startAutoRotate();

  rotPrev.addEventListener('click', prevImage);
  rotNext.addEventListener('click', nextImage);

  rotPause.addEventListener('click', () => {
    autoRotate = !autoRotate;
    renderRotPause();
    if(autoRotate){ startAutoRotate(); } else { stopAutoRotate(); }
    save();
  });

  rotInterval.addEventListener('change', () => {
    if(autoRotate) startAutoRotate();
    save();
  });
}
