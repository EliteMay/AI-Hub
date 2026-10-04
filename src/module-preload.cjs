const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("hubModule", {
  getContext: async () => {
    const result = await ipcRenderer.invoke("hub:module-context");
    if (!result?.ok) {
      throw new Error(result?.error ?? "Module Contextを取得できませんでした。");
    }
    return result;
  },
  openFullApp: () => ipcRenderer.invoke("hub:module-open-full-app"),
  showHome: () => ipcRenderer.invoke("hub:module-show-home")
});
