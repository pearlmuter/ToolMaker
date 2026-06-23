#!/usr/bin/env bash
# Spike A: start the OpenAI-compatible mlx-vlm server.
# First run downloads ~20.4 GB from Hugging Face into ~/.cache/huggingface.
set -euo pipefail
cd "$(dirname "$0")"

MODEL="${MODEL:-mlx-community/Qwen3.6-35B-A3B-4bit}"
PORT="${PORT:-8000}"

echo "Serving $MODEL on http://localhost:$PORT  (Ctrl-C to stop)"
echo "First run will download the model — this can take a while."
echo

# Preferred: module form. Falls back to the console script if the module path differs.
if .venv/bin/python -c "import mlx_vlm.server" 2>/dev/null; then
  exec .venv/bin/python -m mlx_vlm.server --model "$MODEL" --port "$PORT"
else
  exec .venv/bin/mlx_vlm.server --model "$MODEL" --port "$PORT"
fi
