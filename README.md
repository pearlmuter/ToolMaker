# ToolMaker

An Electron app that agentically builds small-to-medium Electron apps, driven by a local
Qwen (MLX) model. Chat on the left, a live design-canvas preview of the generated app on the
right; export finished apps while keeping them as projects.

- **[PLAN.md](PLAN.md)** — architecture, decisions, risks, and the phased build plan.
- **[phase0/](phase0/)** — de-risk spikes (local inference + canvas embedding).

## Status
Phase 0 — de-risk spikes. See [phase0/README.md](phase0/README.md).

## Dev notes
- macOS / Apple Silicon only (the model is MLX).
- **Node v26 + Electron:** Electron's `extract-zip` postinstall can fail silently on Node 26.
  If `electron --version` errors after `npm install`, extract the cached zip manually:
  `unzip -q ~/Library/Caches/electron/*/electron-*-darwin-arm64.zip -d node_modules/electron/dist`
  then `printf 'Electron.app/Contents/MacOS/Electron' > node_modules/electron/path.txt`.
