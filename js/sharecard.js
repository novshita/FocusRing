import { dayKey, formatDuration } from './util.js';
import { repo } from './repo.js';

const CARD_W = 1080;
const CARD_H = 1350;
const PAD = 80;

// Canvas can't read CSS variables directly, so the card pulls the live values
// and follows whichever palette the page is using.
function cssVar(name){
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function loadImage(src){
  return new Promise(resolve => {
    if(!src) return resolve(null);
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

// The wallpaper is only used when it's a still image from this site. Live
// wallpapers are cross-origin videos, and drawing one would taint the canvas
// and make exporting it fail, so those fall back to the plain background colour.
function currentWallpaperUrl(){
  const layer = document.getElementById('bgLayer');
  if(!layer || layer.style.display === 'none') return '';
  const match = /url\(["']?(.*?)["']?\)/.exec(layer.style.backgroundImage || '');
  return match ? match[1] : '';
}

function drawCover(ctx, img, w, h){
  const scale = Math.max(w / img.width, h / img.height);
  const dw = img.width * scale;
  const dh = img.height * scale;
  ctx.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
}

function drawStat(ctx, value, label, cx, y){
  ctx.textAlign = 'center';
  ctx.fillStyle = cssVar('--text');
  ctx.font = '84px "DM Serif Display", serif';
  ctx.fillText(value, cx, y);
  ctx.fillStyle = cssVar('--text-soft');
  ctx.font = '500 26px Inter, sans-serif';
  ctx.fillText(label, cx, y + 44);
}

async function drawCard({ rings, size, stats }){
  try {
    await Promise.all([
      document.fonts.load('84px "DM Serif Display"'),
      document.fonts.load('500 26px Inter')
    ]);
  } catch(e) {}

  const canvas = document.createElement('canvas');
  canvas.width = CARD_W;
  canvas.height = CARD_H;
  const ctx = canvas.getContext('2d');

  const layer = document.getElementById('bgLayer');
  ctx.fillStyle = (layer && layer.style.backgroundColor) || '#1a1a2e';
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const wallpaper = await loadImage(currentWallpaperUrl());
  if(wallpaper) drawCover(ctx, wallpaper, CARD_W, CARD_H);
  // Filled twice on purpose: one pass of the page overlay is too light for the
  // white text to stay readable over a busy photo.
  ctx.fillStyle = cssVar('--overlay');
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  ctx.fillRect(0, 0, CARD_W, CARD_H);

  const profile = await repo.getProfile();
  const name = profile.name || 'Guest';
  const avatar = await loadImage(profile.avatar);
  const avatarSize = 96;
  const avatarCx = PAD + avatarSize / 2;
  const avatarCy = PAD + avatarSize / 2;

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2);
  ctx.closePath();
  if(avatar){
    ctx.clip();
    ctx.drawImage(avatar, PAD, PAD, avatarSize, avatarSize);
  } else {
    ctx.fillStyle = cssVar('--glass-strong');
    ctx.fill();
  }
  ctx.restore();
  ctx.beginPath();
  ctx.arc(avatarCx, avatarCy, avatarSize / 2, 0, Math.PI * 2);
  ctx.strokeStyle = cssVar('--glass-border');
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.textAlign = 'left';
  ctx.fillStyle = cssVar('--text');
  ctx.font = '600 40px Inter, sans-serif';
  ctx.fillText(name, PAD + avatarSize + 28, PAD + 44);
  ctx.fillStyle = cssVar('--text-soft');
  ctx.font = '500 26px Inter, sans-serif';
  ctx.fillText('focus journey', PAD + avatarSize + 28, PAD + 82);

  ctx.textAlign = 'right';
  ctx.fillStyle = cssVar('--text');
  ctx.font = '36px "DM Serif Display", serif';
  ctx.fillText('FocusRing', CARD_W - PAD, PAD + 56);

  // Rings are laid out in a 220-unit square; scale that onto a 660px square.
  const ringPx = 660;
  const k = ringPx / size;
  ctx.save();
  ctx.translate((CARD_W - ringPx) / 2, 250);
  ctx.scale(k, k);
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, 4, 0, Math.PI * 2);
  ctx.fillStyle = cssVar('--ring-progress');
  ctx.fill();
  rings.forEach(ring => {
    ctx.beginPath();
    ctx.arc(ring.cx, ring.cy, ring.r, 0, Math.PI * 2);
    ctx.lineWidth = ring.width;
    ctx.globalAlpha = ring.opacity;
    ctx.strokeStyle = cssVar(ring.grown ? '--ring-progress' : '--ring-track');
    ctx.stroke();
  });
  ctx.restore();

  const statY = 1070;
  drawStat(ctx, String(stats.streak), 'day streak', CARD_W * 0.2, statY);
  drawStat(ctx, String(stats.totalSessions), stats.totalSessions === 1 ? 'session' : 'sessions', CARD_W * 0.5, statY);
  drawStat(ctx, formatDuration(stats.totalMinutes), 'focused', CARD_W * 0.8, statY);

  const grown = rings.filter(r => r.grown).length;
  ctx.textAlign = 'center';
  ctx.fillStyle = cssVar('--text-soft');
  ctx.font = '500 24px Inter, sans-serif';
  ctx.fillText(grown + ' of the last ' + rings.length + ' days · ' +
    new Date().toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }),
    CARD_W / 2, CARD_H - 70);

  return canvas;
}

// Resolves to true once the download has been triggered, false if the image
// couldn't be built (for example a browser that blocks canvas export).
export async function downloadShareCard(data){
  try {
    const canvas = await drawCard(data);
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    if(!blob) return false;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'focusring-' + dayKey(new Date()) + '.png';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return true;
  } catch(e) {
    return false;
  }
}
