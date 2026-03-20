/**
 * Electron Main Process
 * Handles window creation, IPC, and desktop lifecycle
 */

import { app, BrowserWindow, ipcMain, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import isDev from 'electron-is-dev';
import http from 'http';
import { initializeDatabase, closeDatabase } from './db/sqlite';
import { runMigrations } from './db/migrations';
import { registerInventoryHandlers } from './ipc/inventory';
import { registerPullSheetHandlers } from './ipc/pullsheets';
import { registerSyncHandlers } from './ipc/sync';
import { initializeLicenseSchema, registerLicenseHandlers } from './ipc/license';
import { initAutoUpdateAndVersionEnforcement } from './updater';
import { setUpdateGate, getUpdateGate } from './gates';
import { setLicenseGate, getLicenseGate, getPolicySnapshot } from './policy';

let mainWindow: BrowserWindow | null = null;
let localServerPort = 3000;
const PRODUCTION_URL = 'https://bright-ops.vercel.app';

/**
 * Start embedded Next.js server for production
 */
async function startEmbeddedServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const nextDir = path.join(__dirname, '..', '.next');
    const publicDir = path.join(__dirname, '..', 'public');
    
    const server = http.createServer((req, res) => {
      // Simple static file server for production
      const filePath = path.join(publicDir, req.url === '/' ? 'index.html' : req.url);
      
      try {
        const fs = require('fs');
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath);
          res.writeHead(200, { 'Content-Type': getMimeType(filePath) });
          res.end(content);
        } else {
          // For Next.js pages, serve index fallback
          const indexPath = path.join(publicDir, 'index.html');
          if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath);
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(content);
          } else {
            res.writeHead(404);
            res.end('Not found');
          }
        }
      } catch (error) {
        res.writeHead(500);
        res.end('Server error');
      }
    });

    const port = 3000;
    server.listen(port, 'localhost', () => {
      console.log(`Embedded server listening on port ${port}`);
      resolve(port);
    });

    server.on('error', reject);
  });
}

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  const types: Record<string, string> = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
  };
  return types[ext] || 'application/octet-stream';
}

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
 * Start standalone Next.js server from bundled build
 */
async function startStandaloneServer(): Promise<void> {
  // In development: standalone is at dist/.next/standalone (relative to project root)
  // In packaged app: it's an extraResource at process.resourcesPath/standalone
  let standaloneDir: string;
  
  if (isDev) {
    standaloneDir = path.join(__dirname, '../.next/standalone');
  } else {
    // extraResources copies to: <app>/resources/standalone/
    standaloneDir = path.join(process.resourcesPath, 'standalone');
  }
  
  const serverJs = path.join(standaloneDir, 'server.js');
  
  if (!fs.existsSync(standaloneDir)) {
    console.error('❌ Standalone build not found at:', standaloneDir);
    throw new Error(`Standalone build directory not found: ${standaloneDir}`);
  }

  if (!fs.existsSync(serverJs)) {
    console.error('❌ server.js not found at:', serverJs);
    throw new Error(`server.js not found: ${serverJs}`);
  }

  console.log('🚀 Starting standalone Next.js server from:', standaloneDir);
  console.log('   - server.js:', serverJs);
  
  try {
    // Change to standalone directory so relative paths work
    const originalCwd = process.cwd();
    console.log('   - Original CWD:', originalCwd);
    process.chdir(standaloneDir);
    console.log('   - New CWD:', process.cwd());
    
    // Set environment for standalone server
    process.env.NODE_ENV = 'production';
    process.env.PORT = localServerPort.toString();
    
    console.log('   - Setting NODE_ENV=production');
    console.log(`   - Setting PORT=${localServerPort}`);
    
    // Load the standalone server module which auto-starts via require()
    // The server.js file calls startServer() which starts listening
    console.log('   - Loading server.js...');
    require(serverJs);
    
    // Change back to original directory
    process.chdir(originalCwd);
    
    console.log('✅ Standalone server module loaded');
    
    // Increased wait time for server to fully start
    await new Promise((resolve) => {
      setTimeout(() => {
        console.log(`✅ Standalone server startup complete (http://localhost:${localServerPort})`);
        resolve(undefined);
      }, 3000);
    });
  } catch (error) {
    console.error('❌ Error starting standalone server:', error);
    throw error;
  }
}

/**
 * Create the browser window
 */
async function createWindow(): Promise<void> {
  // Resolve icon path (works in dev and packaged)
  const iconPath = isDev
    ? path.join(__dirname, '../public/icon.png')
    : path.join(process.resourcesPath, 'app.asar', 'public', 'icon.png');

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'Bright Ops',
    icon: iconPath,
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true,
    },
  });

  // Remove the default Electron menu bar
  Menu.setApplicationMenu(null);

  // Launch maximized and show once ready
  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Add error logging
  mainWindow.webContents.on('render-process-gone', (event) => {
    console.error('❌ Renderer process crashed!', event);
  });

  mainWindow.webContents.on('unresponsive', () => {
    console.warn('⚠️  Window unresponsive');
  });

  mainWindow.webContents.on('responsive', () => {
    console.log('✅ Window responsive again');
  });

  // Log console messages from renderer
  mainWindow.webContents.on('console-message', (level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message}`);
  });

  // Load app
  if (isDev) {
    // Development: load from localhost dev server
    const url = `http://localhost:${localServerPort}`;
    console.log(`🔗 Dev mode - Loading: ${url}`);
    try {
      await waitForServer(url);
      mainWindow.loadURL(url);
      mainWindow.webContents.openDevTools();
    } catch (error) {
      console.error('Dev server error:', error);
      mainWindow.loadURL('data:text/html,<h1>Error: Dev server not running. Start with: npm run electron:dev</h1>');
    }
  } else {
    // Production: load from localhost standalone server
    const url = `http://localhost:${localServerPort}`;
    console.log(`🔗 Offline mode - Loading from standalone server: ${url}`);
    
    // Verify preload exists
    const preloadPath = path.join(__dirname, 'preload.js');
    if (!fs.existsSync(preloadPath)) {
      console.error(`❌ Preload script not found at: ${preloadPath}`);
    } else {
      console.log(`✅ Preload script found at: ${preloadPath}`);
    }
    
    mainWindow.loadURL(url);
  }

  // Maximize window on startup and show
  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/**
 * App lifecycle
 */
app.whenReady().then(async () => {
  try {
    console.log('🚀 Bright Ops Desktop starting...');
    
    // Start standalone server in production FIRST
    if (!isDev) {
      console.log('📦 Production mode: Starting standalone server...');
      await startStandaloneServer();
      
      // Wait for server to be ready before continuing
      const url = `http://localhost:${localServerPort}`;
      console.log('⏳ Waiting for server to respond...');
      await waitForServer(url);
    }
    
    // Initialize database BEFORE IPC (handlers need it)
    await initializeDatabase();
    
    // Run migrations
    await runMigrations();
    
    // Initialize license schema (needs DB)
    initializeLicenseSchema();

    // Setup IPC handlers (needs DB to be ready)
    setupIPC();

    // Initialize license gate (load from cache or default to active)
    // TODO: Load from SQLite license_state table when available
    setLicenseGate({ status: "active", plan: "starter" });

    // Initialize auto-update and version enforcement
    await initAutoUpdateAndVersionEnforcement({
      onUpdateGateChanged: (gate) => {
        setUpdateGate(gate);
      },
    });
    
    // Create window (after server is confirmed ready)
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
  registerLicenseHandlers();

  // Basic app handlers
  ipcMain.handle('app:isOffline', () => {
    // Main process is always "online" - check actual network later if needed
    return false;
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });

  ipcMain.handle('app:getUpdateGate', () => {
    return getUpdateGate();
  });

  ipcMain.handle('app:getLicenseGate', () => {
    return getLicenseGate();
  });

  ipcMain.handle('app:getPolicySnapshot', () => {
    return getPolicySnapshot();
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
