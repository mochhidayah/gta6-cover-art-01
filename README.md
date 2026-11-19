[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/mochhidayah/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/mochhidayah/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Leonida Cover Lab

Built for the [make.fun bounty](https://make.fun/bounty/gta6-cover-art-01): turn a photo and a caption into GTA 6 poster-style cover art and export it as a PNG.

A web app that turns a person's photo and a caption into cover art in the
multi-panel poster style — bold lettering, a Vice City sunset or neon colour
grade — and exports it as a PNG in the common post sizes. It runs offline in
a desktop browser from its own static files: the photos never leave the
machine.

## Run

```sh
node serve.ts
# open http://localhost:8080
```

## How it works

- **Photo** — pick one of the two bundled samples, or upload your own.
  Click a panel to select it, drag to move its photo, scroll to zoom.
- **Layout** — Solo (one full-bleed photo), Duo (two panels, diagonal split)
  or Triptych (three panels, big centre).
- **Grade** — Sunset, Neon, Noir or Palm: a canvas filter on the photo plus
  tint gradients and a vignette.
- **Caption** — title, kicker and tagline, with size, height and colour
  controls. The title is drawn in a heavy system font with an outline and a
  drop shadow; a small drawn sun sits above it.
- **Export** — Square 1080 × 1080, Portrait 1080 × 1350 or Wide 1920 × 1080,
  straight to a PNG download. "Surprise me" shuffles a finished cover in
  one click.

## Files

- `app/index.html` + `app/style.css` — the editor shell and its styling.
- `app/src/cover.js` — the renderer: panels, grades, lettering, export sizes.
- `app/src/main.js` — editor state, controls, upload, drag/zoom, export.
- `app/src/shots.js` — screenshot / deep-link mode (`?shot=cover|editor`,
  `?photo=pier|boulevard`, `?caption=…`).
- `app/samples/` — two bundled sample photos (made for make.fun, free to use).
- `main.ts` — hands the app + screenshots to the grader with a dossier.
- `serve.ts` — tiny static server for local testing.

Original art and lettering, system fonts only. Not affiliated with Rockstar Games.
