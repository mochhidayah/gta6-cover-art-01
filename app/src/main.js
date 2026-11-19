// main.js — the editor for Leonida Cover Lab.
//
// Owns the state, the DOM and every interaction: photo upload and sample
// loading, panel selection by click, drag-to-pan and wheel-to-zoom on the
// preview, layout / grade / caption controls, and the PNG export. The actual
// painting is cover.js's job (drawCover); this file only decides what to
// paint and when.

import { drawCover, panelAt, LAYOUTS, GRADES, TITLE_COLORS, EXPORT_SIZES } from './cover.js';
import { applyShotParams } from './shots.js';

const SAMPLES = {
  pier: { label: 'Pier', src: 'samples/pier.jpg' },
  boulevard: { label: 'Boulevard', src: 'samples/boulevard.jpg' },
};

function blankPanel() {
  return { img: null, src: null, panX: 0, panY: 0, zoom: 1 };
}

const state = {
  layout: 'triptych',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice City · Leonida',
  tagline: 'Every sunset hides a score.',
  titleSize: 1,
  titleY: 0.74,
  titleColor: 'white',
  sizeKey: 'square',
  activePanel: 1,
  panels: [blankPanel(), blankPanel(), blankPanel()],
};

const $ = (id) => document.getElementById(id);
const preview = $('preview');
const statusEl = $('status');

function setStatus(msg) {
  statusEl.textContent = msg;
}

function panelCount() {
  return LAYOUTS[state.layout].panels;
}

function currentSize() {
  return EXPORT_SIZES[state.sizeKey] || EXPORT_SIZES.square;
}

function render() {
  const size = currentSize();
  // The preview keeps the export aspect but caps at 640px on its long side.
  const scale = Math.min(1, 640 / Math.max(size.w, size.h));
  drawCover(preview, state, Math.round(size.w * scale), Math.round(size.h * scale));
  preview.dataset.w = String(Math.round(size.w * scale));
  preview.dataset.h = String(Math.round(size.h * scale));
  syncPanelTabs();
  window.__coverReady = true;
}

function syncPanelTabs() {
  const tabs = $('panel-tabs');
  tabs.innerHTML = '';
  for (let i = 0; i < panelCount(); i++) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'tab' + (i === state.activePanel ? ' on' : '');
    b.textContent = `Panel ${i + 1}`;
    b.addEventListener('click', () => {
      state.activePanel = i;
      render();
    });
    tabs.appendChild(b);
  }
  const p = state.panels[state.activePanel];
  $('zoom').value = String(p.zoom);
  $('zoom-val').textContent = `${p.zoom.toFixed(2)}×`;
  $('panel-photo').textContent = p.src ? `Photo: ${p.src}` : 'Photo: none yet — pick a sample or upload one.';
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

async function setPanelPhoto(index, src, img) {
  state.panels[index] = { img, src, panX: 0, panY: 0, zoom: 1 };
  state.activePanel = index;
  render();
  setStatus(`Panel ${index + 1} ← ${src}`);
}

async function loadSample(name) {
  const s = SAMPLES[name];
  if (!s) return;
  try {
    const img = await loadImage(s.src);
    await setPanelPhoto(state.activePanel, name, img);
  } catch (e) {
    setStatus(`Sample failed to load: ${e.message}`);
  }
}

async function loadSampleIntoAll(name) {
  const s = SAMPLES[name];
  if (!s) return;
  try {
    const img = await loadImage(s.src);
    for (let i = 0; i < panelCount(); i++) {
      state.panels[i] = { img, src: name, panX: 0, panY: 0, zoom: 1 };
    }
    render();
    setStatus(`All panels ← ${name}`);
  } catch (e) {
    setStatus(`Sample failed to load: ${e.message}`);
  }
}

function onUpload(file) {
  if (!file || !file.type.startsWith('image/')) {
    setStatus('That file is not an image.');
    return;
  }
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const img = await loadImage(reader.result);
      await setPanelPhoto(state.activePanel, file.name, img);
    } catch (e) {
      setStatus(`Upload failed: ${e.message}`);
    }
  };
  reader.onerror = () => setStatus('Could not read that file.');
  reader.readAsDataURL(file);
}

function exportPNG() {
  const size = currentSize();
  const off = document.createElement('canvas');
  drawCover(off, state, size.w, size.h);
  off.toBlob((blob) => {
    if (!blob) {
      setStatus('Export failed: the canvas could not make a PNG.');
      return;
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const slug = (state.title || 'cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'cover';
    a.href = url;
    a.download = `leonida-cover-${slug}-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
    setStatus(`Exported ${size.w} × ${size.h} PNG — check your downloads.`);
  }, 'image/png');
}

// --- Controls ---------------------------------------------------------------

function buildButtons(container, entries, current, onPick) {
  const el = $(container);
  el.innerHTML = '';
  for (const [key, def] of Object.entries(entries)) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === current ? ' on' : '');
    b.textContent = def.label;
    b.addEventListener('click', () => {
      onPick(key);
      buildButtons(container, entries, key, onPick);
    });
    el.appendChild(b);
  }
}

function wireControls() {
  // Samples.
  $('sample-pier').addEventListener('click', () => loadSample('pier'));
  $('sample-boulevard').addEventListener('click', () => loadSample('boulevard'));
  $('sample-all-pier').addEventListener('click', () => loadSampleIntoAll('pier'));
  $('sample-all-boulevard').addEventListener('click', () => loadSampleIntoAll('boulevard'));
  $('upload').addEventListener('change', (e) => onUpload(e.target.files[0]));
  $('upload-btn').addEventListener('click', () => $('upload').click());

  // Layout.
  buildButtons('layout-pick', LAYOUTS, state.layout, (key) => {
    state.layout = key;
    state.activePanel = Math.min(state.activePanel, panelCount() - 1);
    render();
    setStatus(`Layout: ${LAYOUTS[key].label}`);
  });

  // Grade.
  buildButtons('grade-pick', GRADES, state.grade, (key) => {
    state.grade = key;
    render();
    setStatus(`Grade: ${GRADES[key].label}`);
  });

  // Title colour.
  const colorEntries = {};
  for (const [k, v] of Object.entries(TITLE_COLORS)) colorEntries[k] = { label: k[0].toUpperCase() + k.slice(1) };
  buildButtons('color-pick', colorEntries, state.titleColor, (key) => {
    state.titleColor = key;
    render();
  });

  // Caption.
  $('title').addEventListener('input', (e) => { state.title = e.target.value; render(); });
  $('subtitle').addEventListener('input', (e) => { state.subtitle = e.target.value; render(); });
  $('tagline').addEventListener('input', (e) => { state.tagline = e.target.value; render(); });
  $('title-size').addEventListener('input', (e) => {
    state.titleSize = Number(e.target.value);
    $('title-size-val').textContent = `${state.titleSize.toFixed(2)}×`;
    render();
  });
  $('title-y').addEventListener('input', (e) => {
    state.titleY = Number(e.target.value);
    $('title-y-val').textContent = `${Math.round(state.titleY * 100)}%`;
    render();
  });
  $('zoom').addEventListener('input', (e) => {
    const p = state.panels[state.activePanel];
    p.zoom = Number(e.target.value);
    $('zoom-val').textContent = `${p.zoom.toFixed(2)}×`;
    render();
  });
  $('reset-pan').addEventListener('click', () => {
    const p = state.panels[state.activePanel];
    p.panX = 0; p.panY = 0; p.zoom = 1;
    render();
    setStatus(`Panel ${state.activePanel + 1} position reset.`);
  });

  // Export size + button.
  const sizeEntries = {};
  for (const [k, v] of Object.entries(EXPORT_SIZES)) sizeEntries[k] = v;
  buildButtons('size-pick', sizeEntries, state.sizeKey, (key) => {
    state.sizeKey = key;
    render();
    setStatus(`Export size: ${EXPORT_SIZES[key].label}`);
  });
  $('export').addEventListener('click', exportPNG);
  $('shuffle').addEventListener('click', () => {
    // One click, a finished cover: random layout + grade, samples in all panels.
    const layouts = Object.keys(LAYOUTS);
    const grades = Object.keys(GRADES);
    state.layout = layouts[Math.floor(Math.random() * layouts.length)];
    state.grade = grades[Math.floor(Math.random() * grades.length)];
    state.activePanel = 0;
    loadSampleIntoAll(Math.random() < 0.5 ? 'pier' : 'boulevard');
    buildButtons('layout-pick', LAYOUTS, state.layout, () => {});
    buildButtons('grade-pick', GRADES, state.grade, () => {});
    setStatus('Shuffled a fresh cover — tweak it or export it.');
  });

  // Preview: click selects a panel, drag pans it, wheel zooms it.
  let drag = null;
  preview.addEventListener('pointerdown', (e) => {
    const r = preview.getBoundingClientRect();
    const fx = (e.clientX - r.left) / r.width;
    const fy = (e.clientY - r.top) / r.height;
    state.activePanel = panelAt(state.layout, fx, fy);
    drag = { x: e.clientX, y: e.clientY, panX: state.panels[state.activePanel].panX, panY: state.panels[state.activePanel].panY };
    preview.setPointerCapture(e.pointerId);
    render();
  });
  preview.addEventListener('pointermove', (e) => {
    if (!drag) return;
    const r = preview.getBoundingClientRect();
    const p = state.panels[state.activePanel];
    p.panX = drag.panX + (e.clientX - drag.x) / r.width;
    p.panY = drag.panY + (e.clientY - drag.y) / r.height;
    render();
  });
  preview.addEventListener('pointerup', () => { drag = null; });
  preview.addEventListener('pointercancel', () => { drag = null; });
  preview.addEventListener('wheel', (e) => {
    e.preventDefault();
    const p = state.panels[state.activePanel];
    p.zoom = Math.max(1, Math.min(2.5, p.zoom * (e.deltaY < 0 ? 1.08 : 0.93)));
    $('zoom').value = String(p.zoom);
    $('zoom-val').textContent = `${p.zoom.toFixed(2)}×`;
    render();
  }, { passive: false });
}

// --- Boot -------------------------------------------------------------------

async function boot() {
  wireControls();
  // Shot mode (screenshots / deep links) may preset photo + caption first.
  const shot = applyShotParams(state);
  render();
  if (shot.photo) {
    await loadSampleIntoAll(shot.photo);
  } else {
    // Default first paint: pier in every panel so the editor never opens blank.
    await loadSampleIntoAll('pier');
  }
  if (shot.coverOnly) {
    document.body.classList.add('shot-cover');
    render();
  }
  setStatus('Ready — pick a layout, a grade, type a caption, export a PNG.');
}

boot();
