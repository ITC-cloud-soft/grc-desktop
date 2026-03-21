const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("grcDesktop", {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke("get-version"),
  openExternal: (url) => ipcRenderer.send("open-external", url),
  showMenu: (x, y) => ipcRenderer.send("show-context-menu", x, y),
  onServerRestart: (callback) => {
    ipcRenderer.on("server-restarting", (event, ...args) => callback(...args));
  },
  getConfig: () => ipcRenderer.invoke("get-config"),
  setDbDialect: (dialect) => ipcRenderer.invoke("set-db-dialect", dialect),
});
