# Spike A — Local inference (mlx-vlm)

**Goal:** prove `mlx-community/Qwen3.6-35B-A3B-4bit` serves over an OpenAI-compatible
endpoint on this Mac, that a non-Python client can call it, and that it's fast enough.
Also confirm **vision** input works (the model is a VLM) — that unlocks Phase 5.

**What we're de-risking**
1. Does the MLX VLM build serve via `mlx_vlm.server`? (Risk #2)
2. Tokens/sec + RAM for a 20.4 GB model on this machine? (Risk #3)
3. Does OpenAI-style vision input (image in the messages array) work?

## Prereqs
- Python 3.11 (you have it), Apple Silicon (you're arm64), `mlx` already importable.
- ~21 GB free disk for the model (downloads on first serve from Hugging Face).

## Run

```bash
cd toolmaker/phase0/spike-a-inference

# 1. one-time setup: venv + mlx-vlm
bash setup.sh

# 2. start the server (first run downloads ~20.4 GB; leave it running)
bash serve.sh

# 3. in a SECOND terminal, run the tests
.venv/bin/python test_text.py      # text round-trip + tokens/sec
.venv/bin/python test_vision.py    # sends sketch.png + a question (vision check)
```

## What to report back
- Did the server start and load the model? (any error text)
- `test_text.py`: the printed **tokens/sec** and the response.
- `test_vision.py`: did it correctly describe the screenshot? (proves vision works)
- Rough **RAM** used by the python process while serving (Activity Monitor is fine).

## Notes
- Default server port is `8000`. If `mlx_vlm.server` isn't found as a module, `serve.sh`
  falls back to the `mlx_vlm.server` console script.
- If vision input is rejected by `mlx_vlm.server`, that's a finding — it tells us the proxy
  (Phase 1) must massage image payloads. Text working is enough to proceed to Phase 2.
