# gta6-cover-art-01 — Leonida Cover Lab

- Competition: https://make.fun/bounty/gta6-cover-art-01 — $250, free, deadline 2026-11-21 10:30 UTC (17:30 WIB)
- Repo: https://github.com/mochhidayah/gta6-cover-art-01
- Recording: `01a1f3b1-c2a2-7251-9cf4-c84a6d531a85` (started by parent before this session)

## What was built

Leonida Cover Lab — an offline web app that turns a photo + caption into
GTA 6 poster-style cover art and exports a PNG.

- Canvas renderer (`app/src/cover.js`): Solo / Duo / Triptych panel layouts,
  4 grades (Sunset, Neon, Noir, Palm) as canvas filters + tint gradients,
  per-panel cover-fit with pan/zoom, gutters + frame, drawn sun emblem,
  bold outlined title lettering with kicker + tagline (system fonts only).
- Editor (`app/src/main.js`): sample photos (pier, boulevard) + upload,
  click-to-select panel, drag-to-pan, wheel-to-zoom, layout/grade/colour
  pickers, caption size/height controls, export at 1080×1080, 1080×1350,
  1920×1080, one-click "Surprise me".
- Shot mode (`app/src/shots.js`): `?shot=cover|editor&photo=&caption=`.
- 3 screenshots per shots.json (cover 1080×1080, editor 1280×720, cover).

## Verification

- Playwright smoke test: TODO (fill in after the test run)
- `makefun check`: TODO
- Export sizes verified: TODO

## Submission

- Round 1: TODO (parent seals + submits)
