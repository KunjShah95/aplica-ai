import {
  app,
  BrowserWindow,
  Tray,
  Menu,
  nativeImage,
  ipcMain,
  dialog,
  Notification,
  globalShortcut,
  shell,
  screen,
} from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import https from 'node:https';
import http from 'node:http';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isDev = !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:3001';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let quickLauncherWindow: BrowserWindow | null = null;

// ── Window helpers ────────────────────────────────────────────────────────────

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0a0a0f',
      symbolColor: '#00d4ff',
      height: 40,
    },
    backgroundColor: '#0a0a0f',
    vibrancy: 'under-window',
    show: false,
    icon: path.join(__dirname, '../public/icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Minimise to tray instead of quitting
  mainWindow.on('close', (e) => {
    if (tray) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });

  if (isDev) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/dashboard',
    });
  }
}

function createQuickLauncherWindow(): void {
  if (quickLauncherWindow) {
    quickLauncherWindow.focus();
    return;
  }

  const primaryDisplay = screen.getPrimaryDisplay();
  const { width } = primaryDisplay.workAreaSize;

  quickLauncherWindow = new BrowserWindow({
    width: 680,
    height: 480,
    x: Math.floor((width - 680) / 2),
    y: 120,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    resizable: false,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  quickLauncherWindow.once('ready-to-show', () => {
    quickLauncherWindow?.show();
    quickLauncherWindow?.focus();
  });

  quickLauncherWindow.on('blur', () => {
    quickLauncherWindow?.hide();
  });

  quickLauncherWindow.on('closed', () => {
    quickLauncherWindow = null;
  });

  if (isDev) {
    quickLauncherWindow.loadURL(`${VITE_DEV_SERVER_URL}#/launcher`);
  } else {
    quickLauncherWindow.loadFile(path.join(__dirname, '../dist/index.html'), {
      hash: '/launcher',
    });
  }
}

// ── System Tray ───────────────────────────────────────────────────────────────

function createTray(): void {
  const iconPath = path.join(__dirname, '../public/tray-icon.png');
  const icon = fs.existsSync(iconPath)
    ? nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
    : nativeImage.createEmpty();

  tray = new Tray(icon);
  tray.setToolTip('Aplica AI – Desktop Agent');

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Aplica AI',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        } else {
          createMainWindow();
        }
      },
    },
    {
      label: 'Quick Launcher',
      accelerator: 'CommandOrControl+Shift+Space',
      click: () => createQuickLauncherWindow(),
    },
    { type: 'separator' },
    {
      label: 'Research Assistant',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-tab', 'research');
      },
    },
    {
      label: 'Agent Chat',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-tab', 'chat');
      },
    },
    { type: 'separator' },
    {
      label: 'Settings',
      click: () => {
        mainWindow?.show();
        mainWindow?.webContents.send('navigate-tab', 'settings');
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      accelerator: 'CommandOrControl+Q',
      click: () => {
        app.exit(0);
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      createMainWindow();
    }
  });
}

// ── Native Application Menu ───────────────────────────────────────────────────

function buildAppMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'Aplica AI',
      submenu: [
        { label: 'About Aplica AI', role: 'about' },
        { type: 'separator' },
        {
          label: 'Check for Updates…',
          click: () =>
            shell.openExternal('https://github.com/KunjShah95/aplica-ai/releases'),
        },
        { type: 'separator' },
        { label: 'Hide Aplica AI', role: 'hide' },
        { label: 'Hide Others', role: 'hideOthers' },
        { label: 'Show All', role: 'unhide' },
        { type: 'separator' },
        { label: 'Quit Aplica AI', role: 'quit' },
      ],
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'New Research Session',
          accelerator: 'CommandOrControl+N',
          click: () => mainWindow?.webContents.send('new-research-session'),
        },
        {
          label: 'Open Report…',
          accelerator: 'CommandOrControl+O',
          click: async () => {
            const { filePaths } = await dialog.showOpenDialog({
              filters: [
                { name: 'Reports', extensions: ['json', 'md', 'txt'] },
                { name: 'All Files', extensions: ['*'] },
              ],
            });
            if (filePaths.length > 0) {
              const content = fs.readFileSync(filePaths[0], 'utf8');
              mainWindow?.webContents.send('open-report', {
                path: filePaths[0],
                content,
              });
            }
          },
        },
        {
          label: 'Save Report…',
          accelerator: 'CommandOrControl+S',
          click: () => mainWindow?.webContents.send('save-report'),
        },
        { type: 'separator' },
        {
          label: 'Export as Markdown',
          click: () => mainWindow?.webContents.send('export-report', 'md'),
        },
        {
          label: 'Export as JSON',
          click: () => mainWindow?.webContents.send('export-report', 'json'),
        },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { role: 'toggleDevTools' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Agent',
      submenu: [
        {
          label: 'Open Quick Launcher',
          accelerator: 'CommandOrControl+Shift+Space',
          click: () => createQuickLauncherWindow(),
        },
        {
          label: 'New Agent Chat',
          accelerator: 'CommandOrControl+Shift+N',
          click: () => mainWindow?.webContents.send('navigate-tab', 'chat'),
        },
        {
          label: 'Research Assistant',
          accelerator: 'CommandOrControl+Shift+R',
          click: () => mainWindow?.webContents.send('navigate-tab', 'research'),
        },
        { type: 'separator' },
        {
          label: 'Knowledge Base',
          click: () => mainWindow?.webContents.send('navigate-tab', 'knowledge'),
        },
        {
          label: 'Workflow Builder',
          click: () => mainWindow?.webContents.send('navigate-tab', 'workflow'),
        },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'front' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Documentation',
          click: () =>
            shell.openExternal('https://github.com/KunjShah95/aplica-ai#readme'),
        },
        {
          label: 'Report an Issue',
          click: () =>
            shell.openExternal('https://github.com/KunjShah95/aplica-ai/issues'),
        },
        { type: 'separator' },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── IPC Handlers ──────────────────────────────────────────────────────────────

function registerIpcHandlers(): void {
  // Window controls
  ipcMain.on('window-minimize', () => mainWindow?.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow?.hide());

  // File system
  ipcMain.handle('read-file', async (_e, filePath: string) => {
    try {
      return { ok: true, content: fs.readFileSync(filePath, 'utf8') };
    } catch (err: unknown) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('write-file', async (_e, filePath: string, content: string) => {
    try {
      fs.writeFileSync(filePath, content, 'utf8');
      return { ok: true };
    } catch (err: unknown) {
      return { ok: false, error: String(err) };
    }
  });

  ipcMain.handle('save-file-dialog', async (_e, opts: { defaultPath?: string; filters?: Electron.FileFilter[] }) => {
    const result = await dialog.showSaveDialog(mainWindow!, {
      defaultPath: opts.defaultPath,
      filters: opts.filters ?? [{ name: 'All Files', extensions: ['*'] }],
    });
    return result;
  });

  ipcMain.handle('open-file-dialog', async (_e, opts: { filters?: Electron.FileFilter[] }) => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      filters: opts.filters ?? [{ name: 'All Files', extensions: ['*'] }],
      properties: ['openFile'],
    });
    return result;
  });

  // Desktop notifications
  ipcMain.on('show-notification', (_e, title: string, body: string) => {
    if (Notification.isSupported()) {
      new Notification({ title, body }).show();
    }
  });

  // HTTP fetch proxy (allows renderer to reach arbitrary URLs without CORS)
  ipcMain.handle('fetch-url', async (_e, url: string, options: { method?: string; headers?: Record<string, string>; body?: string } = {}) => {
    return new Promise((resolve) => {
      const lib = url.startsWith('https') ? https : http;
      const reqOptions = {
        method: options.method ?? 'GET',
        headers: options.headers ?? {},
      };
      const req = lib.request(url, reqOptions, (res) => {
        let data = '';
        res.on('data', (chunk: Buffer) => { data += chunk.toString(); });
        res.on('end', () => resolve({ ok: true, status: res.statusCode, body: data }));
      });
      req.on('error', (err: Error) => resolve({ ok: false, error: err.message }));
      if (options.body) req.write(options.body);
      req.end();
    });
  });

  // App info
  ipcMain.handle('get-app-version', () => app.getVersion());
  ipcMain.handle('get-platform', () => process.platform);

  // Open external URLs
  ipcMain.on('open-external', (_e, url: string) => shell.openExternal(url));

  // Close quick launcher
  ipcMain.on('close-quick-launcher', () => quickLauncherWindow?.hide());
}

// ── Global Shortcuts ──────────────────────────────────────────────────────────

function registerGlobalShortcuts(): void {
  globalShortcut.register('CommandOrControl+Shift+Space', () => {
    createQuickLauncherWindow();
  });

  globalShortcut.register('CommandOrControl+Shift+A', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide();
      } else {
        mainWindow.show();
        mainWindow.focus();
      }
    } else {
      createMainWindow();
    }
  });
}

// ── App Lifecycle ─────────────────────────────────────────────────────────────

app.whenReady().then(() => {
  createMainWindow();
  createTray();
  buildAppMenu();
  registerIpcHandlers();
  registerGlobalShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    } else {
      mainWindow?.show();
    }
  });
});

app.on('window-all-closed', () => {
  // Keep running in tray on all platforms
  if (process.platform !== 'darwin' && !tray) {
    app.quit();
  }
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});
