// Parent = ToolMaker shell (spike). Spawns the child app as its OWN Electron process,
// waits for the child's port handshake, then tells the renderer to embed that URL in a
// <webview> on the canvas. Owns the child's lifecycle (kills it on quit).
const { app, BrowserWindow, ipcMain } = require("electron");
const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const electronBin = require("electron"); // path to the electron executable
const CHILD_DIR = path.join(__dirname, "..", "child-app");

let mainWindow;
let child;

function spawnChild() {
  // Launch a genuinely separate Electron app (own main process + renderer).
  child = spawn(electronBin, [CHILD_DIR, `--user-data-dir=${path.join(os.tmpdir(), "tm-child-userdata")}`], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: undefined },
    stdio: ["ignore", "pipe", "inherit"],
  });

  child.stdout.on("data", (buf) => {
    const line = buf.toString();
    const m = line.match(/CHILD_READY_PORT=(\d+)/);
    if (m) {
      const port = Number(m[1]);
      console.log(`[parent] child ready on port ${port}`);
      if (mainWindow) mainWindow.webContents.send("child-url", `http://127.0.0.1:${port}/`);
    }
  });
  child.on("exit", (code) => console.log(`[parent] child exited (${code})`));
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 1000,
    backgroundColor: "#0a0f0d",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true, // required to embed the child via <webview>
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  mainWindow.loadFile(path.join(__dirname, "index.html"));
  mainWindow.webContents.once("did-finish-load", spawnChild);
}

// Renderer hands us PNG bytes from webview.capturePage(); we write them to disk.
ipcMain.handle("save-screenshot", async (_e, bytes) => {
  const out = path.join(os.homedir(), "Desktop", `toolmaker-canvas-${Date.now()}.png`);
  fs.writeFileSync(out, Buffer.from(bytes));
  console.log(`[parent] screenshot saved -> ${out}`);
  return out;
});

app.whenReady().then(createWindow);
app.on("window-all-closed", () => app.quit());
app.on("before-quit", () => { if (child && !child.killed) child.kill(); });
