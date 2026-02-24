/**
 * Electron Main Process
 * Handles window creation, IPC, and desktop lifecycle
 */
import { BrowserWindow } from 'electron';
declare let mainWindow: BrowserWindow | null;
declare let localServerPort: number;
export { mainWindow, localServerPort };
//# sourceMappingURL=main.d.ts.map