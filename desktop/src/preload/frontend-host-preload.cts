import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("omnificDesktopHost", {
  publishAppearance: (payload: unknown): void => {
    ipcRenderer.sendToHost("omnific:appearance", payload);
  },
});

function sendDiagnostic(kind: string, detail: string): void {
  ipcRenderer.sendToHost("omnific:diagnostic", { kind, detail: detail.slice(0, 2_000) });
}

window.addEventListener("error", (event) => {
  sendDiagnostic("window-error", event.error?.stack ?? event.message);
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = event.reason instanceof Error ? event.reason.stack ?? event.reason.message : String(event.reason);
  sendDiagnostic("unhandled-rejection", reason);
});
