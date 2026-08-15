import { app, BrowserWindow, ipcMain, Tray, Menu } from 'electron';
import path from 'path';

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let isCompact = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 400,
    minHeight: 500,
    title: 'Smart Trading System — Windows Companion Console',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const appUrl = process.env.APP_URL || 'https://ais-dev-ddcrbo4v27f3taylopdsfp-177761109571.europe-west2.run.app';
  mainWindow.loadURL(appUrl);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

ipcMain.on('set-always-on-top', (event, alwaysOnTop: boolean) => {
  if (mainWindow) {
    mainWindow.setAlwaysOnTop(alwaysOnTop, 'floating');
  }
});

ipcMain.on('toggle-compact-mode', () => {
  if (!mainWindow) return;
  if (!isCompact) {
    mainWindow.setSize(420, 600);
    isCompact = true;
  } else {
    mainWindow.setSize(1280, 800);
    isCompact = false;
  }
});

ipcMain.handle('get-app-version', () => {
  return app.getVersion();
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
