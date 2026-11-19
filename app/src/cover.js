// cover.js — the cover renderer for Leonida Cover Lab.
//
// Everything the art needs lives here, and nothing else: given a state
// (layout, grade, photos, caption) it paints one poster onto any canvas at
// any size. The editor (main.js) owns the state and the DOM; this module
// never touches the DOM, so the same draw path serves the live preview, the
// PNG export and the screenshot mode.
//
// A cover is built in layers, bottom to top:
//   1. the photo panels (cover-fit, with per-panel pan + zoom)
//   2. the colour grade (a canvas filter on the photo + tint gradients)
//   3. the panel gutters and the outer frame
//   4. the sun emblem, kicker, title and tagline
//
// All coordinates inside are fractions of the canvas (0..1), so one layout
// serves the 1080x1080 square, the 1080x1350 portrait and the 1920x1080
// landscape export without a second code path.

export const LAYOUTS = {
  solo: { label: 'Solo', panels: 1 },
  duo: { label: 'Duo', panels: 2 },
  triptych: { label: 'Triptych', panels: 3 },
};

export const GRADES = {
  sunset: {
    label: 'Sunset',
    filter: 'saturate(1.45) contrast(1.12) brightness(1.06) sepia(0.28)',
    tint: [
      { x0: 0, y0: 0, x1: 0, y1: 1, stops: [[0, 'rgba(255,180,90,0.10)'], [0.55, 'rgba(255,120,60,0.06)'], [1, 'rgba(255,70,30,0.30)']] },
    ],
  },
  neon: {
    label: 'Neon',
    filter: 'saturate(1.7) contrast(1.18) brightness(0.98) hue-rotate(-12deg)',
    tint: [
      { x0: 0, y0: 0, x1: 1, y1: 0, stops: [[0, 'rgba(255,0,128,0.20)'], [1, 'rgba(255,0,128,0.02)']] },
      { x0: 1, y0: 0, x1: 0, y1: 1, stops: [[0, 'rgba(0,220,255,0.20)'], [1, 'rgba(0,220,255,0.02)']] },
    ],
  },
  noir: {
    label: 'Noir',
    filter: 'grayscale(1) contrast(1.28) brightness(1.03)',
    tint: [
      { x0: 0, y0: 0, x1: 0, y1: 1, stops: [[0, 'rgba(255,205,140,0.07)'], [1, 'rgba(10,10,20,0.22)']] },
    ],
  },
  palm: {
    label: 'Palm',
    filter: 'saturate(1.35) contrast(1.05) brightness(1.02) hue-rotate(16deg)',
    tint: [
      { x0: 0, y0: 0, x1: 0, y1: 1, stops: [[0, 'rgba(0,190,160,0.16)'], [0.6, 'rgba(0,190,160,0.02)'], [1, 'rgba(255,210,130,0.16)']] },
    ],
  },
};

export const TITLE_COLORS = {
  white: { fill: '#ffffff', outline: 'rgba(24,8,24,0.92)', accent: '#ffd166' },
  gold: { fill: '#ffd166', outline: 'rgba(40,16,4,0.92)', accent: '#ffffff' },
  pink: { fill: '#ff5da2', outline: 'rgba(30,4,24,0.92)', accent: '#7df9ff' },
};

/** Panel polygons per layout, in fractions of the canvas. */
export function panelPolys(layout, w, h) {
  if (layout === 'duo') {
    return [
      [[0, 0], [0.58, 0], [0.5, 1], [0, 1]],
      [[0.58, 0], [1, 0], [1, 1], [0.5, 1]],
    ];
  }
  if (layout === 'triptych') {
    return [
      [[0, 0], [0.3, 0], [0.3, 1], [0, 1]],
      [[0.3, 0], [0.7, 0], [0.7, 1], [0.3, 1]],
      [[0.7, 0], [1, 0], [1, 1], [0.7, 1]],
    ];
  }
  return [[[0, 0], [1, 0], [1, 1], [0, 1]]];
}

/** Which panel (index) contains the fractional point (fx, fy), or the last one. */
export function panelAt(layout, fx, fy) {
  const polys = panelPolys(layout, 1, 1);
  for (let i = 0; i < polys.length; i++) {
    const p = polys[i];
    let inside = false;
    for (let a = 0, b = p.length - 1; a < p.length; b = a++) {
      const [ax, ay] = p[a];
      const [bx, by] = p[b];
      if (ay > fy !== by > fy && fx < ((bx - ax) * (fy - ay)) / (by - ay) + ax) inside = !inside;
    }
    if (inside) return i;
  }
  return polys.length - 1;
}

function drawImageCover(ctx, img, poly, panX, panY, zoom, w, h) {
  // Bounding box of the polygon, in pixels.
  let x0 = 1, y0 = 1, x1 = 0, y1 = 0;
  for (const [fx, fy] of poly) {
    x0 = Math.min(x0, fx); y0 = Math.min(y0, fy);
    x1 = Math.max(x1, fx); y1 = Math.max(y1, fy);
  }
  const bw = (x1 - x0) * w;
  const bh = (y1 - y0) * h;
  const bx = x0 * w;
  const by = y0 * h;
  // Cover-fit: scale so the image covers the box, then zoom around the centre.
  const s = Math.max(bw / img.naturalWidth, bh / img.naturalHeight) * zoom;
  const dw = img.naturalWidth * s;
  const dh = img.naturalHeight * s;
  // Pan is a fraction of the box; clamp so the photo never leaves a gap.
  const maxX = Math.max(0, (dw - bw) / 2);
  const maxY = Math.max(0, (dh - bh) / 2);
  const dx = bx + (bw - dw) / 2 + Math.max(-maxX, Math.min(maxX, panX * bw));
  const dy = by + (bh - dh) / 2 + Math.max(-maxY, Math.min(maxY, panY * bh));
  ctx.drawImage(img, dx, dy, dw, dh);
}

function paintTint(ctx, grade, w, h) {
  for (const t of grade.tint) {
    const g = ctx.createLinearGradient(t.x0 * w, t.y0 * h, t.x1 * w, t.y1 * h);
    for (const [at, color] of t.stops) g.addColorStop(at, color);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }
}

function paintGutters(ctx, layout, w, h) {
  const lw = Math.max(3, Math.round(Math.min(w, h) * 0.006));
  ctx.strokeStyle = 'rgba(255,255,255,0.92)';
  ctx.lineWidth = lw;
  ctx.beginPath();
  if (layout === 'duo') {
    ctx.moveTo(0.58 * w, 0);
    ctx.lineTo(0.5 * w, h);
  } else if (layout === 'triptych') {
    ctx.moveTo(0.3 * w, 0);
    ctx.lineTo(0.3 * w, h);
    ctx.moveTo(0.7 * w, 0);
    ctx.lineTo(0.7 * w, h);
  }
  ctx.stroke();
  // A thin dark hairline beside each gutter so panels read apart on bright photos.
  ctx.strokeStyle = 'rgba(12,8,16,0.55)';
  ctx.lineWidth = Math.max(1, lw / 3);
  ctx.beginPath();
  if (layout === 'duo') {
    ctx.moveTo(0.58 * w + lw, 0);
    ctx.lineTo(0.5 * w + lw, h);
  } else if (layout === 'triptych') {
    ctx.moveTo(0.3 * w + lw, 0);
    ctx.lineTo(0.3 * w + lw, h);
    ctx.moveTo(0.7 * w + lw, 0);
    ctx.lineTo(0.7 * w + lw, h);
  }
  ctx.stroke();
}

function paintSun(ctx, cx, cy, r, color) {
  // A setting sun: disc, horizon slats and short rays. Drawn, not an image.
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.95;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 0.75;
  const slats = 3;
  for (let i = 0; i < slats; i++) {
    const y = cy + r * (0.15 + i * 0.28);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, r * 0.07);
  }
  ctx.globalAlpha = 0.9;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const r0 = r * 1.25;
    const r1 = r * 1.5;
    ctx.beginPath();
    ctx.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0);
    ctx.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

function fitFont(ctx, text, maxWidth, startSize, weight, family) {
  let size = startSize;
  ctx.font = `${weight} ${size}px ${family}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size *= 0.92;
    ctx.font = `${weight} ${size}px ${family}`;
  }
  return size;
}

/**
 * Paint one cover.
 * @param {HTMLCanvasElement} canvas
 * @param {object} state { layout, grade, title, subtitle, tagline,
 *   titleSize (0.6..1.6), titleY (0.05..0.95, fraction), titleColor,
 *   panels: [{ img: HTMLImageElement|null, panX, panY, zoom }] }
 */
export function drawCover(canvas, state, w, h) {
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  const grade = GRADES[state.grade] || GRADES.sunset;
  const colors = TITLE_COLORS[state.titleColor] || TITLE_COLORS.white;
  const polys = panelPolys(state.layout, w, h);
  const base = Math.min(w, h);

  // 1. Backdrop: deep dusk, so an empty panel is never white.
  ctx.fillStyle = '#160a1e';
  ctx.fillRect(0, 0, w, h);

  // 2. Photo panels, each clipped to its polygon, graded as drawn.
  for (let i = 0; i < polys.length; i++) {
    const panel = state.panels[i] || {};
    ctx.save();
    ctx.beginPath();
    polys[i].forEach(([fx, fy], j) => (j === 0 ? ctx.moveTo(fx * w, fy * h) : ctx.lineTo(fx * w, fy * h)));
    ctx.closePath();
    ctx.clip();
    if (panel.img) {
      ctx.filter = grade.filter;
      drawImageCover(ctx, panel.img, polys[i], panel.panX || 0, panel.panY || 0, panel.zoom || 1, w, h);
      ctx.filter = 'none';
    } else {
      // Empty panel: a dusk gradient with a faint sun so the layout reads.
      const g = ctx.createLinearGradient(0, 0, 0, h);
      g.addColorStop(0, '#3a1440');
      g.addColorStop(1, '#12081a');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  // 3. Grade tint across the whole cover, then a gentle vignette.
  paintTint(ctx, grade, w, h);
  const vg = ctx.createRadialGradient(w / 2, h / 2, base * 0.42, w / 2, h / 2, base * 0.95);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(8,4,14,0.34)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);

  // 4. Gutters + frame.
  paintGutters(ctx, state.layout, w, h);
  ctx.strokeStyle = colors.accent;
  ctx.lineWidth = Math.max(4, base * 0.008);
  ctx.strokeRect(base * 0.012, base * 0.012, w - base * 0.024, h - base * 0.024);
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, base * 0.002);
  ctx.strokeRect(base * 0.028, base * 0.028, w - base * 0.056, h - base * 0.056);

  // 5. Sun emblem above the title block.
  const titleY = (state.titleY ?? 0.74) * h;
  const sunR = base * 0.045;
  paintSun(ctx, w / 2, titleY - base * 0.16, sunR, colors.accent);

  // 6. Kicker, title, tagline — all centred, stacked above the title line.
  const family = "'Arial Black', 'Archivo Black', Impact, 'Helvetica Neue', Arial, sans-serif";
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';

  const kicker = (state.subtitle || '').toUpperCase();
  if (kicker) {
    const ks = fitFont(ctx, kicker, w * 0.8, base * 0.038, 800, "'Helvetica Neue', Arial, sans-serif");
    ctx.font = `800 ${ks}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = colors.accent;
    ctx.fillText(kicker.split('').join('  '), w / 2, titleY - base * 0.085);
  }

  const title = (state.title || 'UNTITLED').toUpperCase();
  const ts = fitFont(ctx, title, w * 0.86, base * 0.115 * (state.titleSize ?? 1), 900, family) * (state.titleSize ?? 1);
  ctx.font = `900 ${ts}px ${family}`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = colors.outline;
  ctx.lineWidth = Math.max(3, ts * 0.14);
  ctx.strokeText(title, w / 2, titleY + ts * 0.28);
  ctx.fillStyle = colors.fill;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = base * 0.02;
  ctx.shadowOffsetY = base * 0.008;
  ctx.fillText(title, w / 2, titleY + ts * 0.28);
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  const tag = state.tagline || '';
  if (tag) {
    const gs = fitFont(ctx, tag, w * 0.7, base * 0.032, 700, "'Helvetica Neue', Arial, sans-serif");
    ctx.font = `700 ${gs}px 'Helvetica Neue', Arial, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.fillText(tag, w / 2, titleY + ts * 0.28 + base * 0.055);
  }
}

/** The export sizes the bounty asks for, in pixels. */
export const EXPORT_SIZES = {
  square: { label: 'Square · 1080 × 1080', w: 1080, h: 1080 },
  portrait: { label: 'Portrait · 1080 × 1350', w: 1080, h: 1350 },
  wide: { label: 'Wide · 1920 × 1080', w: 1920, h: 1080 },
};
