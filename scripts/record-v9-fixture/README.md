# Record a v9 fixture

Records the layouts egregorigami-exploration's `#v9` view feeds its 3D renderer, for the `EmbeddingViewer` stories in `packages/ui`.

`record-worker.js` wraps `window.Worker` before the page loads and keeps every `live-*` message to and from the embedding worker in `window.__rec`.

```sh
# In ~/repos/egregorigami-exploration
pnpm dev --port 5199 --strictPort

# Here (agent-browser runs under mise's node 24.16.0)
ab() { mise exec node@24.16.0 -- agent-browser --session fixture "$@"; }
ab --init-script scripts/record-v9-fixture/record-worker.js \
  open 'http://localhost:5199/egregorigami-exploration/?a=HMycIvbhmCU&b=V1SKd6zmpsw&window=100&overlap=80#v9'
```

Then drive the page:

1. Open the Windowed tab and click about 20% along the timeline. The worker catches up in batches of 20 segments.
2. Let it play so later layouts grow one segment at a time.
3. Push a mark with `ab eval '__rec.push({dir:"mark",atMs:0,data:{type:"live-mark",note:"hide B"}})'`, then click "Hide session B in the 3D view" (use its ref from `ab snapshot -i`). Wait for a few layouts, mark "show B" and click it again.

Export the recording and compact it into the fixture. `export.js` pairs each `live-done` with its `live-update` and keeps the longest text list. `compact.mjs` trims labels to their first 12 words, so the repo doesn't hold the full transcript.

```sh
ab eval "$(cat scripts/record-v9-fixture/export.js)" > raw-eval.txt
node -e 'const fs=require("fs");fs.writeFileSync("raw.json",JSON.parse(fs.readFileSync("raw-eval.txt","utf8")))'
node scripts/record-v9-fixture/compact.mjs raw.json packages/ui/src/EmbeddingViewer/stories/fixtures/living-room.json
```
