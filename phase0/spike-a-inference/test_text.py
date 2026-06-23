#!/usr/bin/env python3
"""Spike A: text round-trip against the OpenAI-compatible mlx-vlm server.

Zero third-party deps (urllib only) so it runs in the .venv without extra installs.
Measures tokens/sec from the usage block when available, else from a local count.
"""
import json
import time
import urllib.request

PORT = 8000
MODEL = "mlx-community/Qwen3.6-35B-A3B-4bit"
URL = f"http://localhost:{PORT}/v1/chat/completions"

payload = {
    "model": MODEL,
    "messages": [
        {"role": "system", "content": "You are a concise coding assistant."},
        {"role": "user", "content": "Write a one-paragraph spec for a CSV validation Electron app."},
    ],
    "max_tokens": 256,
    "temperature": 0.7,
}

req = urllib.request.Request(
    URL, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
)

print(f"POST {URL}\n  model={MODEL}\n")
t0 = time.time()
with urllib.request.urlopen(req, timeout=600) as resp:
    body = json.loads(resp.read())
dt = time.time() - t0

text = body["choices"][0]["message"]["content"]
usage = body.get("usage", {})
completion_tokens = usage.get("completion_tokens")

print("--- response ---")
print(text)
print("\n--- stats ---")
print(f"latency: {dt:.2f}s")
if completion_tokens:
    print(f"completion_tokens: {completion_tokens}")
    print(f"tokens/sec: {completion_tokens / dt:.1f}")
else:
    approx = max(1, len(text.split()))
    print(f"(no usage block) ~{approx} words -> ~{approx / dt:.1f} words/sec")
