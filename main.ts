// main.ts — Leonida Cover Lab, handed in (Node 22, standard library only).
//
// What the bounty grades is the web app under app/: a static page plus ES
// modules, no libraries and no network calls. This file is only the courier
// that carries it to the grader: it mirrors app/ and screenshots/ into the
// output directory and asks the vendored make.fun helper to write the
// dossier.json summary the judge reads first.
//
// Local run:
//   node serve.ts            then open http://localhost:8080
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function mirror(name) {
  const from = join(root, name);
  const to = join(outDir, name);
  if (!existsSync(from)) return;
  mkdirSync(to, { recursive: true });
  cpSync(from, to, { recursive: true });
}

mkdirSync(outDir, { recursive: true });
mirror('app');
mirror('screenshots');

// Caps the scorer enforces (from the kit's reference/gate.json). Only the
// text cap shapes the dossier; the rest mirror refusals the scorer would
// make anyway: at most 4 screenshots and none over 256 KiB; app/ at most
// 993 files and 48 MiB in all; no app/ path over 1000 bytes.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);
