const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("aiHub", {
  listModules: () => ipcRenderer.invoke("hub:list-modules"),
  launchModule: (moduleId) => ipcRenderer.invoke("hub:launch-module", moduleId),
  openModuleView: (moduleId) => ipcRenderer.invoke("hub:open-module-view", moduleId),
  showHome: () => ipcRenderer.invoke("hub:show-home"),
  getSsdStatus: () => ipcRenderer.invoke("hub:ssd-status")
});
