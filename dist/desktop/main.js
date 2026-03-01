"use strict";
/**
 * Electron Main Process
 * Handles window creation, IPC, and desktop lifecycle
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.localServerPort = exports.mainWindow = void 0;
const electron_1 = require("electron");
const path_1 = __importDefault(require("path"));
const electron_is_dev_1 = __importDefault(require("electron-is-dev"));
const http_1 = __importDefault(require("http"));
const sqlite_1 = require("./db/sqlite");
const migrations_1 = require("./db/migrations");
const inventory_1 = require("./ipc/inventory");
const pullsheets_1 = require("./ipc/pullsheets");
const sync_1 = require("./ipc/sync");
const license_1 = require("./ipc/license");
let mainWindow = null;
exports.mainWindow = mainWindow;
let localServerPort = 3000;
exports.localServerPort = localServerPort;
/**
 * Wait for server to be ready before loading URL
 */
async function waitForServer(url) {
    console.log(`⏳ Waiting for server: ${url}`);
    for (let i = 0; i < 120; i++) {
        try {
            await new Promise((resolve, reject) => {
                http_1.default.get(url, (res) => {
                    if (res.statusCode === 200 || res.statusCode === 307) {
                        resolve(true);
                    }
                    else {
                        reject(new Error(`Status ${res.statusCode}`));
                    }
                }).on('error', reject).setTimeout(2000);
            });
            console.log('✅ Server is ready!');
            return;
        }
        catch (e) {
            // Server not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    throw new Error('Failed to connect to dev server');
}
/**
 * Create the browser window
 */
async function createWindow() {
    exports.mainWindow = mainWindow = new electron_1.BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 600,
        webPreferences: {
            preload: path_1.default.join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
    });
    // Load app
    if (electron_is_dev_1.default) {
        // Development: load from localhost (server should already be running)
        const url = `http://localhost:${localServerPort}`;
        console.log(`🔗 Loading: ${url}`);
        mainWindow.loadURL(url);
        mainWindow.webContents.openDevTools();
    }
    else {
        // Production: load from file
        mainWindow.loadFile(path_1.default.join(__dirname, '../out/index.html'));
    }
    mainWindow.on('closed', () => {
        exports.mainWindow = mainWindow = null;
    });
}
/**
 * App lifecycle
 */
electron_1.app.whenReady().then(async () => {
    try {
        console.log('🚀 Bright Audio Desktop starting...');
        // Initialize database
        await (0, sqlite_1.initializeDatabase)();
        // Run migrations
        await (0, migrations_1.runMigrations)();
        // Initialize license schema
        (0, license_1.initializeLicenseSchema)();
        // Setup IPC handlers
        setupIPC();
        // Create window
        await createWindow();
        console.log('✅ App ready');
    }
    catch (error) {
        console.error('❌ Failed to start app:', error);
        electron_1.app.quit();
    }
});
electron_1.app.on('window-all-closed', () => {
    // On macOS, apps typically stay active until explicitly quit
    if (process.platform !== 'darwin') {
        electron_1.app.quit();
    }
});
electron_1.app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (mainWindow === null) {
        createWindow();
    }
});
electron_1.app.on('quit', () => {
    (0, sqlite_1.closeDatabase)();
});
/**
 * IPC Handlers Setup
 * Import and register all IPC modules
 */
async function setupIPC() {
    console.log('🔌 Setting up IPC handlers...');
    // Register module handlers
    (0, inventory_1.registerInventoryHandlers)();
    (0, pullsheets_1.registerPullSheetHandlers)();
    (0, sync_1.registerSyncHandlers)();
    (0, license_1.registerLicenseHandlers)();
    // Basic app handlers
    electron_1.ipcMain.handle('app:isOffline', () => {
        // Main process is always "online" - check actual network later if needed
        return false;
    });
    electron_1.ipcMain.handle('app:getVersion', () => {
        return electron_1.app.getVersion();
    });
    electron_1.ipcMain.handle('app:quit', () => {
        electron_1.app.quit();
    });
    /**
     * Navigate to sync widget page
     */
    electron_1.ipcMain.handle('app:openSyncWidget', () => {
        if (mainWindow) {
            mainWindow.webContents.send('navigate', '/desktop-sync');
        }
        return { success: true };
    });
    console.log('✅ IPC handlers registered');
}
//# sourceMappingURL=main.js.map