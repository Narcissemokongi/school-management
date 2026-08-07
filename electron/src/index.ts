import type { CapacitorElectronConfig } from '@capacitor-community/electron';
import { CapElectronEventEmitter, CapacitorSplashScreen, setupCapacitorElectronPlugins } from '@capacitor-community/electron';
import chokidar from 'chokidar';
import type { MenuItemConstructorOptions } from 'electron';
import { app, BrowserWindow, Menu, MenuItem, nativeImage, session, Tray } from 'electron';
import electronIsDev from 'electron-is-dev';
import electronServe from 'electron-serve';
import windowStateKeeper from 'electron-window-state';
import { join } from 'path';

// Define components for a watcher to detect when the webapp is changed so we can reload in Dev mode.
const reloadWatcher = {
  debouncer: null,
  ready: false,
  watcher: null,
};

export function setupReloadWatcher(electronCapacitorApp: ElectronCapacitorApp): void {
  reloadWatcher.watcher = chokidar
    .watch(join(app.getAppPath(), 'app'), {
      ignored: /[/\\]\./,
      persistent: true,
    })
    .on('ready', () => {
      reloadWatcher.ready = true;
    })
    .on('all', (_event, _path) => {
      if (reloadWatcher.ready) {
        clearTimeout(reloadWatcher.debouncer);
        reloadWatcher.debouncer = setTimeout(async () => {
          electronCapacitorApp.getMainWindow().webContents.reload();
          reloadWatcher.ready = false;
          clearTimeout(reloadWatcher.debouncer);
          reloadWatcher.debouncer = null;
          reloadWatcher.watcher = null;
          setupReloadWatcher(electronCapacitorApp);
        }, 1500);
      }
    });
}

// Define our class to manage our app.
export class ElectronCapacitorApp {
  private tray: Tray | null = null;
  private mainWindow: BrowserWindow | null = null;
  private config: CapacitorElectronConfig;
  private trayMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] = [new MenuItem({ label: 'Quit App', role: 'quit' })];
  private appMenuBarMenuTemplate: (MenuItem | MenuItemConstructorOptions)[] = [
    { role: process.platform === 'darwin' ? 'appMenu' : 'fileMenu' },
    { role: 'viewMenu' },
  ];
  private isCustomUrlScheme: boolean = false;
  private serve: any;

  constructor(
    config: CapacitorElectronConfig,
    trayMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[],
    appMenuBarMenuTemplate?: (MenuItemConstructorOptions | MenuItem)[]
  ) {
    this.config = config;
    if (trayMenuTemplate) {
      this.trayMenuTemplate = trayMenuTemplate;
    }
    if (appMenuBarMenuTemplate) {
      this.appMenuBarMenuTemplate = appMenuBarMenuTemplate;
    }
    // Setup our web app loader, this lets us load apps like react, vue, and angular without changing their build chains.
    this.serve = electronServe({
      directory: join(app.getAppPath(), 'app'),
      scheme: 'capacitor-electron',
      hostname: 'localhost',
      file: 'index.html',
      verbose: true,
    });
  }

  // Helper function to load in the app.
  private async loadMainWindow(thisRef: any) {
    await thisRef.serve(thisRef.mainWindow);
  }

  // Expose the mainWindow ref for use outside of the class.
  getMainWindow(): BrowserWindow {
    return this.mainWindow;
  }

  getCustomURLScheme(): string {
    return this.isCustomUrlScheme ? 'capacitor-electron' : 'file';
  }

  async init(): Promise<void> {
    const icon = nativeImage.createFromDataURL(this.config.electron?.trayIconAndMenuIcon ?? '');
    this.mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        allowRunningInsecureContent: false,
      },
      show: false,
      icon: icon,
    });

    if (this.config.electron?.trayIconAndMenuIcon) {
      this.tray = new Tray(icon);
      this.tray.on('double-click', () => {
        this.mainWindow.show();
      });
      this.tray.setToolTip(this.config.appName);
      this.tray.setContextMenu(Menu.buildFromTemplate(this.trayMenuTemplate));
    }

    this.mainWindow.on('close', (event) => {
      event.preventDefault();
      this.mainWindow.hide();
    });

    // Setup the main window menu bar if one is provided.
    if (this.appMenuBarMenuTemplate.length > 0) {
      const menu = Menu.buildFromTemplate(this.appMenuBarMenuTemplate);
      Menu.setApplicationMenu(menu);
    }

    // If the platform is Mac, we will setup the dock icon.
    if (process.platform === 'darwin') {
      app.dock.setIcon(icon);
    }

    // Actually load the app.
    await this.loadMainWindow(this);

    // Show the window when it is ready.
    this.mainWindow.on('ready-to-show', () => {
      if (!this.mainWindow) {
        return;
      }
      this.mainWindow.show();
      setTimeout(() => {
        if (this.mainWindow) {
          this.mainWindow.show();
        }
      }, 300);

      // Setup splashscreen on the first show.
      if (this.config.electron?.splashScreenEnabled) {
        CapacitorSplashScreen.init(this.mainWindow, this.config.electron?.splashScreenImageName ?? 'splash.png');
      }
    });

    // Set the main window's title.
    this.mainWindow.setTitle(this.config.appName);
  }
}

// Set a Content Security Policy for the application.
export function setupContentSecurityPolicy(customScheme: string): void {
  const cspRules = [
    `default-src 'self' ${customScheme}://* 'unsafe-inline' 'unsafe-eval' data:`,
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `script-src 'self' 'unsafe-eval' 'unsafe-inline'`,
    `connect-src 'self' https://*.convex.cloud https://*.convex.site https://*.agora.io https://*.sd-rtn.com https://*.vercel.app`,
    `img-src 'self' data: https:`,
    `media-src 'self' blob:`,
  ];

  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        'Content-Security-Policy': [cspRules.join('; ')],
      },
    });
  });
}