const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  load: () => ipcRenderer.invoke("load-text"),
  save: (text) => ipcRenderer.invoke("save-text", text),
  hideWindow: () => ipcRenderer.invoke("hide-window")
});
