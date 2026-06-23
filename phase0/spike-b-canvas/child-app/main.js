// Child "generated app" — a REAL, separate Electron app launched as its own process.
// To be embeddable on the parent's canvas, it serves its renderer over http and prints
// the port to stdout. It ALSO renders its own renderer in a hidden in-process window, so
// this is genuinely a running Electron app (real main process + real renderer), not a
// static file server pretending to be one.
const { app, BrowserWindow } = require("electron");
const http = require("http");
const fs = require("fs");
const path = require("path");

const RENDERER_DIR = path.join(__dirname, "renderer");

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let urlPath = req.url === "/" ? "/index.html" : req.url;
      const filePath = path.join(RENDERER_DIR, decodeURIComponent(urlPath.split("?")[0]));
      // keep it inside RENDERER_DIR
      if (!filePath.startsWith(RENDERER_DIR)) {
        res.writeHead(403).end("forbidden");
        return;
      }
      fs.readFile(filePath, (err, data) => {
        if (err) {
          res.writeHead(404).end("not found");
          return;
        }
        const ext = path.extname(filePath);
        const type = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" }[ext] || "application/octet-stream";
        res.writeHead(200, { "Content-Type": type }).end(data);
      });
    });
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

// Parent passes --tm-portfile=/path; we write our chosen port there once listening.
// This is the handshake (robust — no reliance on capturing Electron's stdout on macOS).
function portFileArg() {
  const a = process.argv.find((x) => x.startsWith("--tm-portfile="));
  return a ? a.split("=")[1] : null;
}

app.whenReady().then(async () => {
  const port = await startServer();
  console.log(`CHILD_READY_PORT=${port}`); // still log for debugging

  const pf = portFileArg();
  if (pf) fs.writeFileSync(pf, String(port));

  // Render the app in-process too (hidden) to prove the real main<->renderer pipeline is live.
  const win = new BrowserWindow({ show: false, width: 900, height: 600 });
  win.loadURL(`http://127.0.0.1:${port}/`);

  // Keep the process alive; the parent owns our lifecycle and will kill us on exit.
});

app.on("window-all-closed", () => {
  /* stay alive — parent controls shutdown */
});
