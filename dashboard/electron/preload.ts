import { contextBridge, ipcRenderer } from 'electron';

// Expose a safe, strongly-typed API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', {
  // ── Window controls ────────────────────────────────────────────────────
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  closeQuickLauncher: () => ipcRenderer.send('close-quick-launcher'),

  // ── App info ───────────────────────────────────────────────────────────
  getVersion: (): Promise<string> => ipcRenderer.invoke('get-app-version'),
  getPlatform: (): Promise<string> => ipcRenderer.invoke('get-platform'),

  // ── Menu actions (native menu → renderer) ──────────────────────────────
  /**
   * Subscribe to native app-menu actions. Returns an unsubscribe function
   * so callers can clean up their own listeners without affecting others.
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

  // ── File system ────────────────────────────────────────────────────────
  readFile: (filePath: string): Promise<{ ok: boolean; content?: string; error?: string }> =>
    ipcRenderer.invoke('read-file', filePath),

  writeFile: (filePath: string, content: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('write-file', filePath, content),

  saveFileDialog: (opts: {
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<Electron.SaveDialogReturnValue> =>
    ipcRenderer.invoke('save-file-dialog', opts),

  openFileDialog: (opts: {
    filters?: Array<{ name: string; extensions: string[] }>;
  }): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('open-file-dialog', opts),

  // ── Network ────────────────────────────────────────────────────────────
  fetchUrl: (
    url: string,
    options?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<{ ok: boolean; status?: number; body?: string; error?: string }> =>
    ipcRenderer.invoke('fetch-url', url, options ?? {}),

  // ── Notifications ──────────────────────────────────────────────────────
  showNotification: (title: string, body: string) =>
    ipcRenderer.send('show-notification', title, body),

  // ── Navigation ─────────────────────────────────────────────────────────
  onNavigateTab: (callback: (tab: string) => void) => {
    const handler = (_: unknown, tab: string) => callback(tab);
    ipcRenderer.on('navigate-tab', handler);
    return () => ipcRenderer.removeListener('navigate-tab', handler);
  },

  onNewResearchSession: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('new-research-session', handler);
    return () => ipcRenderer.removeListener('new-research-session', handler);
  },

  onSaveReport: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('save-report', handler);
    return () => ipcRenderer.removeListener('save-report', handler);
  },

  onOpenReport: (callback: (data: { path: string; content: string }) => void) => {
    const handler = (_: unknown, data: { path: string; content: string }) => callback(data);
    ipcRenderer.on('open-report', handler);
    return () => ipcRenderer.removeListener('open-report', handler);
  },

  onExportReport: (callback: (format: string) => void) => {
    const handler = (_: unknown, format: string) => callback(format);
    ipcRenderer.on('export-report', handler);
    return () => ipcRenderer.removeListener('export-report', handler);
  },

  // ── External URLs ──────────────────────────────────────────────────────
  openExternal: (url: string) => ipcRenderer.send('open-external', url),

  // ── Environment detection ──────────────────────────────────────────────
  isElectron: true as const,
});
