import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, limited API to the renderer process via window.electronAPI
contextBridge.exposeInMainWorld('electronAPI', {
  getVersion: (): Promise<string> => ipcRenderer.invoke('app:version'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('app:platform'),
  /**
   * Subscribe to native menu actions. Returns an unsubscribe function to
   * clean up only the listeners registered by this call (avoids accidental
   * removal of listeners registered by other callers).
   */
  onMenuAction: (callback: (action: string) => void): (() => void) => {
    const onNewWorkflow = () => callback('new-workflow');
    const onAbout = () => callback('about');
    ipcRenderer.on('menu:new-workflow', onNewWorkflow);
    ipcRenderer.on('menu:about', onAbout);
    return () => {
      ipcRenderer.removeListener('menu:new-workflow', onNewWorkflow);
      ipcRenderer.removeListener('menu:about', onAbout);
    };
  },
});
