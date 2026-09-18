import { readText, writeText } from './storage.js';
import { renderJourney } from './journey.js';

const userBtn = document.getElementById('userBtn');
const settingsPanel = document.getElementById('settingsPanel');
const settingsClose = document.getElementById('settingsClose');
const panelTabs = document.getElementById('panelTabs');
const appearanceGrid = document.getElementById('appearanceGrid');

const SECTIONS = {
  themes: document.getElementById('themesSection'),
  journey: document.getElementById('journeySection'),
  settings: document.getElementById('settingsSection')
};

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

export function initPanel(){
  applyAppearance(readText(APPEARANCE_KEY) || 'dark');

  userBtn.addEventListener('click', () => {
    settingsPanel.classList.toggle('open');
  });

  settingsClose.addEventListener('click', () => {
    settingsPanel.classList.remove('open');
  });

  panelTabs.addEventListener('click', (e) => {
    const btn = e.target.closest('.panel-tab');
    if(!btn) return;
    const target = btn.dataset.panel;
    panelTabs.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t === btn));
    Object.keys(SECTIONS).forEach(key => {
      SECTIONS[key].hidden = key !== target;
    });
    // Re-read on open so the stats reflect sessions finished since last time.
    if(target === 'journey') renderJourney();
  });

  appearanceGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.appearance-swatch');
    if(!btn) return;
    const mode = btn.dataset.appearance;
    writeText(APPEARANCE_KEY, mode);
    applyAppearance(mode);
  });
}
