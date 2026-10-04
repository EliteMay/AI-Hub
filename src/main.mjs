import { app, BrowserWindow, ipcMain, shell } from "electron";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const registryPath = path.join(appRoot, "config", "modules.json");
const ssdManifestPath = "D:\\AI_SSD_MANIFEST.json";

function readSsdManifest() {
  if (!existsSync(ssdManifestPath)) return null;

  try {
    return JSON.parse(readFileSync(ssdManifestPath, "utf8"));
  } catch {
    return null;
  }
}

function configureStorage() {
  const manifest = readSsdManifest();
  const appsRoot = manifest?.zones?.apps;

  if (!appsRoot) return null;

  try {
    const dataRoot = path.join(appsRoot, "ai-hub");
    const userData = path.join(dataRoot, "user-data");
    const sessionData = path.join(dataRoot, "session-data");

    mkdirSync(userData, { recursive: true });
    mkdirSync(sessionData, { recursive: true });

    app.setPath("userData", userData);
    app.setPath("sessionData", sessionData);

    return dataRoot;
  } catch {
    return null;
  }
}

const configuredDataRoot = configureStorage();

function readRegistry() {
  const parsed = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!Array.isArray(parsed.modules)) {
    throw new Error("Module registry is invalid.");
  }
  return parsed.modules;
}

function publicModule(module) {
  return {
    id: module.id,
    name: module.name,
    description: module.description ?? "",
    repository: module.repository,
    mode: module.mode,
    installed: Boolean(module.executablePath && existsSync(module.executablePath))
  };
}

function readSsdStatus() {
  const manifest = readSsdManifest();
  if (!manifest) {
    return {
      available: false,
      manifestPath: ssdManifestPath,
      managedRoot: null,
      dataRoot: null
    };
  }

  return {
    available: true,
    manifestPath: ssdManifestPath,
    managedRoot: manifest.managedRoot ?? "D:\\AI",
    constitutionVersion: manifest.constitutionVersion ?? null,
    dataRoot: configuredDataRoot
  };
}

async function launchModule(moduleId) {
  const module = readRegistry().find((item) => item.id === moduleId);
  if (!module) {
    return { ok: false, error: "未登録のModuleです。" };
  }
  if (module.mode !== "external-exe") {
    return { ok: false, error: "このModule modeはまだ未対応です。" };
  }
  if (!module.executablePath || !existsSync(module.executablePath)) {
    return { ok: false, error: "アプリ本体が見つかりません。" };
  }

  const error = await shell.openPath(module.executablePath);
  if (error) {
    return { ok: false, error };
  }
  return { ok: true };
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180,
    height: 760,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: "#0b0f14",
    title: "AI Hub",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(__dirname, "renderer", "index.html"));
  return win;
}

let mainWindow = null;

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    ipcMain.handle("hub:list-modules", () => readRegistry().map(publicModule));
    ipcMain.handle("hub:launch-module", (_event, moduleId) => launchModule(moduleId));
    ipcMain.handle("hub:ssd-status", () => readSsdStatus());

    mainWindow = createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow();
      }
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
