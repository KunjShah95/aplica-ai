import { app, BrowserWindow, shell, ipcMain, Menu } from 'electron';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = process.env.NODE_ENV === 'development';

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    show: false,
    autoHideMenuBar: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
    title: 'Aplica AI',
    backgroundColor: '#0a0a0a',
  });

  // Show window only when fully loaded to avoid white flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:3001');
    mainWindow.webContents.openDevTools();
  } else {
    // Load the app with a hash so the renderer router lands on the main view
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'), { hash: '#dashboard' });
  }

  // Open external links in the default browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function buildMenu(): void {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Workflow',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow?.webContents.send('menu:new-workflow'),
        },
        { type: 'separator' },
        { role: 'quit' },
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
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools(),
        },
        {
          label: 'About Aplica AI',
          click: () => mainWindow?.webContents.send('menu:about'),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// IPC handlers
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:platform', () => process.platform);

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  // On Windows and Linux, quit when all windows are closed
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Security: prevent navigation to unknown origins
app.on('web-contents-created', (_event, contents) => {
  contents.on('will-navigate', (event, url) => {
    // In dev, allow Vite dev server; in production, allow only the packaged dist
    const allowedPrefixes = isDev
      ? ['http://localhost:3001']
      : [pathToFileURL(path.join(app.getAppPath(), 'dist')).href];
    if (!allowedPrefixes.some((prefix) => url.startsWith(prefix))) {
      event.preventDefault();
    }
  });
});
