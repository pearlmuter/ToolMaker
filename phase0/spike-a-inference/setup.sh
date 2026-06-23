#!/usr/bin/env bash
# Spike A setup: isolated venv + mlx-vlm. Safe to re-run.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d .venv ]; then
  echo "Creating venv (.venv) with python3..."
  python3 -m venv .venv
fi

echo "Installing/upgrading mlx-vlm into .venv ..."
.venv/bin/python -m pip install -U pip >/dev/null
.venv/bin/python -m pip install -U mlx-vlm

echo
echo "Done. mlx-vlm version:"
.venv/bin/python -c "import mlx_vlm, importlib.metadata as m; print(m.version('mlx-vlm'))" || true
echo "Next: bash serve.sh"
