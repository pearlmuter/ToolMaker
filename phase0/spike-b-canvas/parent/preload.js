const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("tm", {
  // main -> renderer: the child app's URL once its server is up
  onChildUrl: (cb) => ipcRenderer.on("child-url", (_e, url) => cb(url)),
  // renderer -> main: persist a screenshot (PNG bytes) to disk
  saveScreenshot: (bytes) => ipcRenderer.invoke("save-screenshot", bytes),
});
