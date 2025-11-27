const { app, globalShortcut, BrowserWindow, ipcMain, Tray, Menu } = require("electron");
const path = require("path");
const fs = require("fs").promises;

const gotTheLock = app.requestSingleInstanceLock()

if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', (event, commandLine, workingDirectory) => {
    if (win) {
      if (win.isMinimized()) win.restore();
      if (!win.isVisible()) win.show();
      win.focus();
    }
  });

  const isDev = !app.isPackaged;
  app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
  app.commandLine.appendSwitch("ozone-platform", "wayland");
  app.commandLine.appendSwitch("disable-gpu");
  app.commandLine.appendSwitch("high-dpi-support", "true");
  app.commandLine.appendSwitch("force-device-scale-factor", "1");

  let win;
  let tray;
  const notesPath = path.join(app.getPath("userData"), "notes.txt");
  ipcMain.handle("load-text", async () => {
    try {
      const text = await fs.readFile(notesPath, "utf-8");
      return text;
    } catch (err) {
      if (err.code === "ENOENT") {
        return "";
      }
      console.error("Error loading notes:", err);
      return "";
    }
  });

  ipcMain.handle("save-text", async (event, text) => {
    try {
      await fs.writeFile(notesPath, text, "utf-8");
      return true;
    } catch (err) {
      console.error("Error saving notes:", err);
      return false;
    }
  });

  ipcMain.handle("hide-window", () => {
    if (win) {
      win.hide();
    }
  });

  ipcMain.handle("minimize-window", () => {
    if (win) {
      win.minimize();
    }
  });

  function createWindow() {
    win = new BrowserWindow({
      width: 1000,
      height: 800,
      frame: false,
      resizable: true,
      roundedCorners: true,
      transparent: true,
      show: false,
      skipTaskbar: false,
      vibrancy: "ultra-dark",
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, "preload.js"),
      },
    });

    win.webContents.setZoomFactor(1.0);
    win.loadFile(path.join(__dirname, "index.html"));

    win.once("ready-to-show", () => {
      win.show();
    });

    win.on("close", (event) => {
      if (!app.isQuitting) {
        event.preventDefault();
        win.hide();
      }
    });
  }

  function createTray() {
    let iconPath;
    if (process.platform === 'win32') {
      iconPath = path.join(__dirname, 'icon.ico');
    } else {
      iconPath = path.join(__dirname, 'icon.png');
    }

    try {
      tray = new Tray(iconPath);
    } catch (err) {
      console.error('Failed to create tray icon:', err);
      return;
    }

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Show n0tez',
        click: () => {
          win.show();
          win.focus();
        }
      },
      {
        label: 'Quit',
        click: () => {
          app.isQuitting = true;
          app.quit();
        }
      }
    ]);

    tray.setToolTip('n0tez');
    tray.setContextMenu(contextMenu);

    tray.on('click', () => {
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    });
  }

  app.whenReady().then(() => {
    createWindow();
    createTray();

    const registered = globalShortcut.register("CommandOrControl+Space", () => {
      console.log("Shortcut triggered");
      if (!win) {
        createWindow();
        return;
      }
      if (win.isVisible()) {
        win.hide();
      } else {
        win.show();
        win.focus();
      }
    });

    if (!registered) {
      console.error("Global shortcut registration failed - may be already in use");
    }

    console.log("Shortcut registered:", registered);

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      } else {
        win.show();
        win.focus();
      }
    });
  });

  app.on("window-all-closed", (e) => {
    e.preventDefault();
  });

  app.on("before-quit", () => {
    app.isQuitting = true;
  });

  app.on("will-quit", () => {
    globalShortcut.unregisterAll();
  });


}
