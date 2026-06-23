# Phase 0 — De-risk spikes

Two throwaway proofs-of-concept that validate the riskiest assumptions before we build the
real stack (see ../PLAN.md). Run them in either order; Spike B is the make-or-break.

| Spike | Question | Needs |
|-------|----------|-------|
| [spike-a-inference](spike-a-inference/) | Does the MLX VLM serve fast enough, with vision? | Python (have it), ~21 GB disk |
| [spike-b-canvas](spike-b-canvas/) | Can we embed a real child Electron app on an annotatable, zoomable canvas + screenshot it? | Node (`brew install node`) |

Each folder has its own README with run steps and a "what to report back" checklist.
