# Spike B — Canvas embed (the make-or-break)

**Goal:** prove ToolMaker's core UX is buildable — embed a **real, separate child Electron
app** on a pannable / zoomable design canvas, draw **redline** annotations that stay pinned
to the app, and **screenshot** the running app (the image we'll later feed the VLM).

## What we're de-risking (Risk #1 in PLAN.md)
A separate Electron app is its own native OS window — you can't natively pan/zoom it or draw
over it. This spike tests the reconciliation: the child runs as a real Electron process and
**serves its renderer over http**, which the parent embeds in a `<webview>`. Because the
`<webview>` is a real DOM element, we can CSS-transform it (zoom/pan) and stack an SVG
overlay above it (redlines) — things a native `BrowserView`/`WebContentsView` can't do.

## Prereqs
**Node is not installed.** Install it (Homebrew is already on your machine):
```bash
brew install node        # gives you node + npm
```

## Run
```bash
cd toolmaker/phase0/spike-b-canvas
npm install              # pulls Electron (~one-time, ~150 MB)
npm start
```

A window opens with a dot-grid canvas. After ~1s the child app ("CSV_VALIDATOR_V1.0")
appears inside macOS window chrome.

## Try these (and tell me what works / breaks)
1. **Pan** — drag the empty canvas (Select tool).
2. **Zoom** — scroll wheel (zooms to cursor) or the −/+ buttons.
3. **Liveness** — the child shows a ticking "live • HH:MM:SS" clock → confirms it's a real
   running app, not a static image. Click **Begin Validation** inside it → button reacts.
4. **Redline** — click the **✎ Redline** button, drag a rectangle over the app. Then pan/zoom
   → the mark should stay pinned to the app.
5. **Screenshot** — click **⤓ Screenshot**. A PNG saves to your **Desktop**
   (`toolmaker-canvas-*.png`) and the path shows in the top HUD.

## What to report back
- Does the child app render inside the canvas? (the big unknown)
- Do pan/zoom feel right, and do redlines stay pinned through transforms?
- Does the screenshot save and look correct?
- Any console errors (View → Toggle Developer Tools), especially around `<webview>` or
  `capturePage`.

## If it doesn't work
The fallback is **offscreen rendering**: the child renders offscreen and streams frames into
a `<canvas>` we draw on directly (full control over transform/overlay/capture, at some
complexity cost). We only go there if `<webview>` embedding + overlay proves unreliable —
this spike tells us which path Phase 3 takes.

## Known gap this spike intentionally surfaces
The embedded renderer is loaded in the **parent's** process via http, so it is *not* wired to
the **child's** main-process IPC. Real generated apps that use `ipcRenderer` will need a
bridge (parent proxies IPC to the child main) — a Phase 3 design item, not part of this spike.
