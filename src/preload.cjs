const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiHub", {
  listModules: () => ipcRenderer.invoke("hub:list-modules"),
  launchModule: (moduleId) => ipcRenderer.invoke("hub:launch-module", moduleId),
  getSsdStatus: () => ipcRenderer.invoke("hub:ssd-status")
});
