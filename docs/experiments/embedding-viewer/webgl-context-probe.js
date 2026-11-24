(() => {
  // Canvases in this frame and in same-origin child iframes (inline: false renders stories in iframes)
  const frames = [window, ...Array.from(document.querySelectorAll('iframe')).map((f) => f.contentWindow)];
  const rows = [];
  for (const w of frames) {
    let canvases = [];
    try {
      canvases = Array.from(w.document.querySelectorAll('canvas'));
    } catch {
      continue;
    }
    for (const c of canvases) {
      const g = c.getContext('webgl2') || c.getContext('webgl');
      rows.push({ frame: w === window ? 'top' : 'iframe', lost: g ? g.isContextLost() : 'no-ctx' });
    }
  }
  const evs = frames.map((w) => {
    try {
      return w.__ev && w.__ev.snapshot();
    } catch {
      return null;
    }
  });
  return JSON.stringify({
    iframes: frames.length - 1,
    canvases: rows.length,
    lostCanvases: rows.filter((r) => r.lost === true).length,
    liveCanvases: rows.filter((r) => r.lost === false).length,
    contextsCreatedAllFrames: evs.reduce((s, e) => s + (e ? e.created : 0), 0),
    lostEventsAllFrames: evs.reduce((s, e) => s + (e ? e.lost : 0), 0),
    topSnapshot: window.__ev && window.__ev.snapshot(),
  });
})()
