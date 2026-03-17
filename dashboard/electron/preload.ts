import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, limited API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('app:platform'),
  onMenuAction: (callback: (action: string) => void) => {
    ipcRenderer.on('menu:new-workflow', () => callback('new-workflow'));
    ipcRenderer.on('menu:about', () => callback('about'));
  },
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu:new-workflow');
    ipcRenderer.removeAllListeners('menu:about');
  },
});
