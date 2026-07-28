import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("omnificDesktopHost", {
  publishAppearance: (payload: unknown): void => {
    ipcRenderer.sendToHost("omnific:appearance", payload);
  },
});
