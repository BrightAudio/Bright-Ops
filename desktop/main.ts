/**
 * Electron Main Process
 * Handles window creation, IPC, and desktop lifecycle
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import { initializeDatabase, closeDatabase } from './db/sqlite';
import { runMigrations } from './db/migrations';
import { registerInventoryHandlers } from './ipc/inventory';
import { registerPullSheetHandlers } from './ipc/pullsheets';
import { registerSyncHandlers } from './ipc/sync';

let mainWindow: BrowserWindow | null = null;
let localServerPort = 3000;

/**
 * Create the browser window
 */
function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Load app
  if (isDev) {
    // Development: load from localhost
    mainWindow.loadURL(`http://localhost:${localServerPort}`);
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from file
    mainWindow.loadFile(path.join(__dirname, '../out/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle
 */
app.on('ready', async () => {
  try {
    console.log('🚀 Bright Audio Desktop starting...');
    
    // Initialize database
    await initializeDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Setup IPC handlers
    setupIPC();
    
    // Create window
    createWindow();
    
    console.log('✅ App ready');
  } catch (error) {
    console.error('❌ Failed to start app:', error);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  // On macOS, apps typically stay active until explicitly quit
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On macOS, re-create window when dock icon is clicked
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('quit', () => {
  closeDatabase();
});

/**
 * IPC Handlers Setup
 * Import and register all IPC modules
 */
async function setupIPC(): Promise<void> {
  console.log('🔌 Setting up IPC handlers...');

  // Register module handlers
  registerInventoryHandlers();
  registerPullSheetHandlers();
  registerSyncHandlers();

  // Basic app handlers
  ipcMain.handle('app:isOffline', () => {
    return !navigator.onLine;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  console.log('✅ IPC handlers registered');
}

// Setup IPC after app is ready
app.once('ready', setupIPC);

export { mainWindow, localServerPort };
