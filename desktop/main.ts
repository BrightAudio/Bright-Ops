/**
 * Electron Main Process
 * Handles window creation, IPC, and desktop lifecycle
 */

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import isDev from 'electron-is-dev';
import http from 'http';
import { initializeDatabase, closeDatabase } from './db/sqlite';
import { runMigrations } from './db/migrations';
import { registerInventoryHandlers } from './ipc/inventory';
import { registerPullSheetHandlers } from './ipc/pullsheets';
import { registerSyncHandlers } from './ipc/sync';

let mainWindow: BrowserWindow | null = null;
let localServerPort = 3000;

/**
 * Wait for server to be ready before loading URL
 */
async function waitForServer(url: string): Promise<void> {
  console.log(`⏳ Waiting for server: ${url}`);
  
  for (let i = 0; i < 120; i++) {
    try {
      await new Promise((resolve, reject) => {
        http.get(url, (res) => {
          if (res.statusCode === 200 || res.statusCode === 307) {
            resolve(true);
          } else {
            reject(new Error(`Status ${res.statusCode}`));
          }
        }).on('error', reject).setTimeout(2000);
      });
      console.log('✅ Server is ready!');
      return;
    } catch (e) {
      // Server not ready yet
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  throw new Error('Failed to connect to dev server');
}

/**
 * Create the browser window
 */
async function createWindow(): Promise<void> {
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
    // Development: load from localhost (server should already be running)
    const url = `http://localhost:${localServerPort}`;
    console.log(`🔗 Loading: ${url}`);
    mainWindow.loadURL(url);
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
app.whenReady().then(async () => {
  try {
    console.log('🚀 Bright Audio Desktop starting...');
    
    // Initialize database
    await initializeDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Setup IPC handlers
    setupIPC();
    
    // Create window
    await createWindow();
    
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
    // Main process is always "online" - check actual network later if needed
    return false;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:quit', () => {
    app.quit();
  });

  /**
   * Navigate to sync widget page
   */
  ipcMain.handle('app:openSyncWidget', () => {
    if (mainWindow) {
      mainWindow.webContents.send('navigate', '/desktop-sync');
    }
    return { success: true };
  });

  console.log('✅ IPC handlers registered');
}

export { mainWindow, localServerPort };
