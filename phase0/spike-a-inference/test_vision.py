#!/usr/bin/env python3
"""Spike A: vision round-trip. Sends sketch.png (the ToolMaker mockup) and asks the
model to describe it, using the OpenAI image_url + base64 data-URL convention.

If the server rejects image input, that's a useful finding (the Phase-1 proxy will
need to adapt payloads). Text-only success is still enough to proceed to Phase 2.
"""
import base64
import json
import os
import time
import urllib.request

PORT = 8000
MODEL = "mlx-community/Qwen3.6-35B-A3B-4bit"
URL = f"http://localhost:{PORT}/v1/chat/completions"
IMG = os.path.join(os.path.dirname(__file__), "sketch.png")

with open(IMG, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
data_url = f"data:image/png;base64,{b64}"

payload = {
    "model": MODEL,
    "messages": [
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "Describe this app UI in 3 bullet points. What are the main panels?"},
                {"type": "image_url", "image_url": {"url": data_url}},
            ],
        }
    ],
    "max_tokens": 256,
}

req = urllib.request.Request(
    URL, data=json.dumps(payload).encode(), headers={"Content-Type": "application/json"}
)

print(f"POST {URL}  (with image, {len(b64)//1024} KB base64)\n")
t0 = time.time()
try:
    with urllib.request.urlopen(req, timeout=600) as resp:
        body = json.loads(resp.read())
    dt = time.time() - t0
    print("--- response ---")
    print(body["choices"][0]["message"]["content"])
    print(f"\nlatency: {dt:.2f}s  -> VISION INPUT WORKS")
except urllib.error.HTTPError as e:
    print(f"HTTPError {e.code}: {e.read().decode()[:500]}")
    print("\n-> Vision payload rejected. Finding logged; proxy must adapt (Phase 1).")
