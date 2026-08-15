import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  setAlwaysOnTop: (alwaysOnTop: boolean) => ipcRenderer.send('set-always-on-top', alwaysOnTop),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  toggleCompactMode: () => ipcRenderer.send('toggle-compact-mode')
});
