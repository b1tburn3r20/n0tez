const { app, globalShortcut, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs").promises;

const isDev = !app.isPackaged;
app.commandLine.appendSwitch("enable-features", "WaylandWindowDecorations");
app.commandLine.appendSwitch("ozone-platform", "wayland");
app.commandLine.appendSwitch("disable-gpu");
app.commandLine.appendSwitch("high-dpi-support", "true");
app.commandLine.appendSwitch("force-device-scale-factor", "1");

let win;
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

function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 400,
    frame: false,
    resizable: true,
    transparent: false,
    show: false,
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
}
app.whenReady().then(() => {
  createWindow();
  globalShortcut.register("Control+Space", () => {
    if (!win) return;
    if (win.isVisible()) {
      win.hide();
    } else {
      win.show();
      win.focus();
    }
  });
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
