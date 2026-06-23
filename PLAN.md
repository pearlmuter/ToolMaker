# ToolMaker — Plan

> An Electron app that agentically builds small-to-medium Electron apps, driven by a
> local Qwen model. Chat on the left, a live design-canvas preview of the generated app
> on the right. When an app is "done", the user can **Export program** while the project
> stays inside ToolMaker.

## Locked decisions

| Decision | Choice | Notes |
|---|---|---|
| Local LLM runtime | **Bundled `mlx-lm` / `mlx-vlm`** (Python venv we manage) | Dev-first: get it working for us, defer one-click installer. Bundle as much as is pragmatic later. |
| opencode adoption | **Hard fork & strip aggressively** | Inherit the best (agent loop, tools, provider abstraction), drop the rest (TUI/web/vscode/desktop/share). |
| Canvas preview | **Real Electron child process** | Real main process runs; renderer embedded on our canvas (see Risk #1). |
| Platform (v1) | **macOS Apple Silicon only** | Matches the MLX model; cross-platform deferred. |

## The model

- `mlx-community/Qwen3.6-35B-A3B-4bit` — MoE (`qwen3_5_moe`), 35B total / ~3B active, **20.4 GB** 4-bit MLX build.
- **MLX → Apple Silicon only.** This is why v1 is Mac-only.
- **It is a vision model** (`image-text-to-text`, converted with `mlx-vlm`). Two consequences:
  1. Serve it via **mlx-vlm** (not plain mlx-lm) to use image input.
  2. The redline/annotation loop (Phase 5) can feed the agent a *screenshot of the running app* — the model can literally see its own output. Run text-only first, enable vision at Phase 5.

## The sketch (UI we're building toward)

Three-pane dark IDE-meets-design-canvas:
- **Far-left rail** — Projects (grid), active project (box + green active dot), Database, Help, Settings.
- **Chat panel** — "Assistant • ACTIVE" header, model badge, message bubbles w/ timestamps, input with paperclip / command / ⚡ / send. This is the Qwen agent loop.
- **Canvas** — dot-grid board showing the generated app live inside macOS window chrome (e.g. `CSV_VALIDATOR_V1.0`), a `1920×1080 60 FPS` readout, and a floating toolbar: select / pencil / comment / **pin** / **redline** / zoom / undo-redo.

The distinctive idea: the generated app runs *on a design canvas* you can annotate, pin, and redline — and that markup feeds back to the agent.

## Repo shape (greenfield monorepo)

```
toolmaker/
  apps/shell/            # the ToolMaker Electron app (3-pane UI)
  packages/engine/       # forked + stripped opencode agent engine (TS)
  packages/agent-config/ # ported oh-my-opencode agents/prompts/tools, tuned for small Electron apps
  packages/inference/    # local model proxy -> mlx-vlm/mlx-lm server (manages Python venv)
  packages/preview/      # child-Electron launch + canvas embedding + screenshot
  workspaces/            # each generated app lives here as its own project dir
```

## Two seams that keep us sane

1. **Inference proxy** (`packages/inference`): the engine always talks to one clean
   OpenAI-compatible endpoint at `localhost:PORT`. Behind it: mlx-vlm/mlx-lm now;
   swappable for LM Studio or a packaged binary later without touching the engine.
2. **Workspace abstraction**: each project is a self-contained dir. The shell never edits
   files directly — it asks the engine; the engine edits the workspace.

## Risks

- **Risk #1 — Embedding a real child Electron app on an annotatable canvas.** A separate
  Electron app is its own native OS window; you can't natively pan/zoom it or draw redlines
  over it. **Approach:** run the generated app's real Electron *main* process as a child
  (Node/Electron APIs genuinely work — it *is* a real app), but load its *renderer* into a
  `WebContentsView`/`<webview>` on our canvas. Real-process fidelity + a surface we can
  transform, annotate, and screenshot. **Must be proven before building on it (Phase 0).**
- **Risk #2 — mlx-vlm OpenAI compatibility for image input** may be partial; the proxy
  absorbs any translation needed.
- **Risk #3 — Model speed / memory** for a 20.4 GB model alongside two Electron apps.
  Validate tok/s and RAM headroom in Phase 0.

## Phases

### Phase 0 — De-risk spikes (throwaway code OK)
- **Spike A — Inference:** `mlx-vlm` serving the model; hit it through the proxy with a text
  completion; confirm usable tok/s and RAM on the target machine.
- **Spike B — Canvas embed:** launch a trivial child Electron app, embed its renderer in a
  parent `WebContentsView`, pan/zoom it, draw one redline rect over it, capture a screenshot.
  If this works, the concept works. **Start here.**

### Phase 1 — Shell skeleton
Electron + React/Vite; 3-pane layout (rail, chat, canvas); project list + create/open;
workspace dirs on disk. No agent yet — just structure.

### Phase 2 — Fork & strip opencode
Pull opencode; gut TUI/web/vscode/desktop/share; keep agent loop + tool execution + provider
abstraction + session state. Wire provider → proxy. Prove: chat message → file edits in a
project workspace.

### Phase 3 — Live preview
Apply Spike B for real: launch the project's child Electron app, embed on canvas, hot-reload
on file change.

### Phase 4 — Agentic build loop + agent-config
Port oh-my-opencode agents/prompts; give the agent the app-building tool belt (scaffold,
read/write, run, install deps, drive preview). This is where it actually *makes* apps.

### Phase 5 — Redline loop (signature feature)
Pin/comment/redline on the canvas → serialized with a screenshot → fed to the **VLM** so the
agent sees the running app + markup and iterates.

### Phase 6 — Export program
`electron-builder` packages the workspace into a distributable `.app`; the project stays in
ToolMaker. Generated apps needing AI point at the same local proxy.

### Phase 7 — Distribution & one-click (deferred)
Bundle the Python/MLX runtime + first-run 20 GB model download UX so a layperson installs
once. Scope it from what Phases 0–6 actually depend on.

## Phase 0 — results

**Spike A — inference: VALIDATED ✅** (2026-06-23)
- `mlx_vlm.server` serves the model over an OpenAI-compatible endpoint; server ready ~32s
  after model is cached.
- Text: coherent generation at **~17.9 tok/s**, ~6s latency. Fits easily in 64 GB RAM.
  → Risk #3 (speed/mem) acceptable; **~18 tok/s is the main caveat** for heavy agent loops
    (optimize later: draft/speculative decoding, or accept for a local-first tool).
- **Vision works** with the standard OpenAI `image_url` base64 payload — no proxy massaging
  needed. It accurately described the ToolMaker mockup. → **Risk #2 resolved; Phase 5 viable.**

**Spike B — canvas embed: process chain VALIDATED ✅** (visual confirmation pending)
- Parent Electron spawns a **real separate child Electron process**; child serves its
  renderer; parent gets the port (file-based handshake) and loads it into a `<webview>` on
  the canvas. Child confirmed serving `CSV_VALIDATOR_V1.0`.
- Bugs found + fixed: (1) `require("electron")` returns the API object in a main process —
  use `process.execPath`; (2) `electron <dir>` needs a `package.json` entry; (3) Electron
  stdout is flaky on macOS → use a portfile handshake.
- Remaining: on-screen confirmation of pan / zoom / pinned redlines / screenshot.
- Gotcha logged: **Node v26 breaks Electron's `extract-zip` postinstall** (see README.md).

## Suggested starting point

Phase 0, **Spike B** (canvas embedding) — make-or-break for the concept — with Spike A
(inference) in parallel. *(Both now run; see results above.)*
