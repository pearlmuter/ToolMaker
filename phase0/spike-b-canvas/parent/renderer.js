// Spike B renderer: pan/zoom the design canvas, draw redline rectangles that stay
// pinned to the embedded app, and screenshot the running child app for the VLM loop.
const canvas = document.getElementById("canvas");
const scene = document.getElementById("scene");
const overlay = document.getElementById("overlay");
const webview = document.getElementById("app");
const zoomLabel = document.getElementById("zoom-label");
const zoomHud = document.getElementById("zoom");
const waiting = document.getElementById("waiting");

// ---- view transform (scene = translate(tx,ty) scale(s)) -------------------
let tx = 220, ty = 120, s = 1;
function applyTransform() {
  scene.style.transform = `translate(${tx}px, ${ty}px) scale(${s})`;
  const pct = Math.round(s * 100) + "%";
  zoomLabel.textContent = pct;
  zoomHud.textContent = pct;
}
// canvas/screen point -> scene-space point (overlay lives in scene space)
function toScene(cx, cy) { return { x: (cx - tx) / s, y: (cy - ty) / s }; }
applyTransform();

// ---- tools ----------------------------------------------------------------
let tool = "select";
function setTool(t) {
  tool = t;
  document.getElementById("tool-select").classList.toggle("active", t === "select");
  document.getElementById("tool-redline").classList.toggle("active", t === "redline");
  canvas.classList.toggle("redline", t === "redline");
  // overlay only intercepts pointer events while drawing redlines
  overlay.style.pointerEvents = t === "redline" ? "auto" : "none";
}
document.getElementById("tool-select").onclick = () => setTool("select");
document.getElementById("tool-redline").onclick = () => setTool("redline");

// ---- pan (select tool) -----------------------------------------------------
let panning = false, lastX = 0, lastY = 0;
canvas.addEventListener("pointerdown", (e) => {
  if (tool !== "select") return;
  panning = true; lastX = e.clientX; lastY = e.clientY;
  canvas.classList.add("panning"); canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener("pointermove", (e) => {
  if (!panning) return;
  tx += e.clientX - lastX; ty += e.clientY - lastY;
  lastX = e.clientX; lastY = e.clientY; applyTransform();
});
canvas.addEventListener("pointerup", (e) => {
  panning = false; canvas.classList.remove("panning");
  try { canvas.releasePointerCapture(e.pointerId); } catch {}
});

// ---- zoom to cursor --------------------------------------------------------
canvas.addEventListener("wheel", (e) => {
  e.preventDefault();
  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
  const ns = Math.min(4, Math.max(0.2, s * factor));
  const k = ns / s;
  tx = e.clientX - (e.clientX - tx) * k;
  ty = e.clientY - (e.clientY - ty) * k;
  s = ns; applyTransform();
}, { passive: false });

function zoomBy(factor) {
  const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
  const ns = Math.min(4, Math.max(0.2, s * factor)), k = ns / s;
  tx = cx - (cx - tx) * k; ty = cy - (cy - ty) * k; s = ns; applyTransform();
}
document.getElementById("zoom-in").onclick = () => zoomBy(1.2);
document.getElementById("zoom-out").onclick = () => zoomBy(1 / 1.2);
document.getElementById("reset").onclick = () => { tx = 220; ty = 120; s = 1; applyTransform(); };

// ---- redline drawing (in scene space, so marks stick to the app) ----------
const SVGNS = "http://www.w3.org/2000/svg";
let drawing = null, startPt = null;
overlay.addEventListener("pointerdown", (e) => {
  if (tool !== "redline") return;
  e.stopPropagation();
  startPt = toScene(e.clientX, e.clientY);
  drawing = document.createElementNS(SVGNS, "rect");
  drawing.setAttribute("fill", "rgba(255,80,80,0.12)");
  drawing.setAttribute("stroke", "#ff5050");
  drawing.setAttribute("stroke-width", "2");
  overlay.appendChild(drawing);
  overlay.setPointerCapture(e.pointerId);
});
overlay.addEventListener("pointermove", (e) => {
  if (!drawing) return;
  const p = toScene(e.clientX, e.clientY);
  drawing.setAttribute("x", Math.min(startPt.x, p.x));
  drawing.setAttribute("y", Math.min(startPt.y, p.y));
  drawing.setAttribute("width", Math.abs(p.x - startPt.x));
  drawing.setAttribute("height", Math.abs(p.y - startPt.y));
});
overlay.addEventListener("pointerup", (e) => {
  drawing = null; try { overlay.releasePointerCapture(e.pointerId); } catch {}
});
document.getElementById("clear").onclick = () => { overlay.innerHTML = ""; };

// ---- screenshot the RUNNING child app (this is what feeds the VLM) ---------
document.getElementById("shot").onclick = async () => {
  try {
    const img = await webview.capturePage();         // NativeImage of the live child app
    const path = await window.tm.saveScreenshot(img.toPNG());
    document.getElementById("hud").textContent = "saved → " + path;
  } catch (err) {
    document.getElementById("hud").textContent = "screenshot failed: " + err.message;
  }
};

// ---- wire up the child app once its server is ready ------------------------
window.tm.onChildUrl((url) => {
  waiting.style.display = "none";
  webview.src = url;
});
