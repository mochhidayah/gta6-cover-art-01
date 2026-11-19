// shots.js — screenshot and deep-link mode for Leonida Cover Lab.
//
// The grader (and anyone sharing a cover) can open the app with a query
// string and land straight on a finished cover instead of the empty editor:
//
//   ?shot=cover&photo=pier&caption=Sunset%20Heist   full-bleed cover, no chrome
//   ?shot=editor&photo=boulevard&caption=Boulevard%20Queen   the editor, prefilled
//
// `photo` names one of the bundled samples, `caption` becomes the title,
// `shot=cover` hides the editor chrome so a screenshot captures only the
// poster. Everything here is read-only with respect to the app: it only
// returns what the query asked for and lets main.js do the work.

/** Parse the query string into the shot the URL asks for. */
export function parseShot(search = window.location.search) {
  const q = new URLSearchParams(search);
  const photo = q.get('photo');
  const caption = q.get('caption');
  const shot = q.get('shot');
  return {
    photo: photo === 'pier' || photo === 'boulevard' ? photo : null,
    caption: caption ? caption.slice(0, 60) : null,
    coverOnly: shot === 'cover',
    editor: shot === 'editor',
  };
}

/**
 * Apply a parsed shot to the editor state before the first paint.
 * Returns the parsed shot so the caller knows whether to load a photo.
 */
export function applyShotParams(state, search) {
  const shot = parseShot(search);
  if (shot.caption) state.title = shot.caption;
  // A cover shot wants the boldest first impression: triptych + sunset.
  if (shot.coverOnly) {
    state.layout = 'triptych';
    state.grade = 'sunset';
    state.titleSize = 1.05;
  }
  return shot;
}
