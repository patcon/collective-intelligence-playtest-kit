// Wraps window.Worker so every message to and from the embedding worker is
// kept in window.__rec with a timestamp relative to page start.
(() => {
  const Native = window.Worker;
  const t0 = performance.now();
  window.__rec = [];
  const keep = (dir, data) => {
    if (!data || typeof data !== 'object' || !String(data.type).startsWith('live')) return;
    window.__rec.push({ dir, atMs: Math.round(performance.now() - t0), data: structuredClone(data) });
  };
  window.Worker = class extends Native {
    constructor(...args) {
      super(...args);
      this.addEventListener('message', (e) => keep('in', e.data));
    }
    postMessage(data, ...rest) {
      keep('out', data);
      return super.postMessage(data, ...rest);
    }
  };
})();
