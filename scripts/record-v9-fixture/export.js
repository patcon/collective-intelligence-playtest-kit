// Evaluated in the recorded page: pairs each live-done with its live-update
// and returns the recording as a JSON string for compact.mjs.
(() => {
  const updates = new Map();
  const layouts = [];
  const marks = [];
  let texts = [];
  let tracks = [];
  for (const r of window.__rec) {
    const d = r.data;
    if (d.type === 'live-mark') {
      marks.push({ beforeLayout: layouts.length, note: d.note });
    } else if (d.type === 'live-update') {
      updates.set(d.requestId, d);
      if (d.texts.length > texts.length) {
        texts = d.texts;
        tracks = d.tracks ?? tracks;
      }
    } else if (d.type === 'live-done') {
      const u = updates.get(d.requestId);
      layouts.push({
        atMs: r.atMs,
        embedded: u?.texts.length ?? null,
        visible: u?.visible ?? null,
        keys: d.indices,
        points: d.points.map((p) => p.map((v) => Math.round(v * 1e4) / 1e4)),
      });
    }
  }
  return JSON.stringify({ texts, tracks, layouts, marks });
})()
