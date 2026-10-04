import { app, BrowserWindow, WebContentsView, ipcMain, shell } from "electron";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const registryPath = path.join(appRoot, "config", "modules.json");
const ssdManifestPath = "D:\\AI_SSD_MANIFEST.json";
const sidebarWidth = 230;

let mainWindow = null;
const moduleViews = new Map();
const moduleIdByWebContentsId = new Map();

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

function getModule(moduleId) {
  return readRegistry().find((item) => item.id === moduleId) ?? null;
}

function resolveEmbeddedModule(module) {
  if (module?.mode !== "hub-renderer") {
    return { ok: false, error: "このModuleはHub内表示に対応していません。" };
  }

  if (!module.repoPath || !module.manifestPath) {
    return { ok: false, error: "ModuleのRepository Path設定が不足しています。" };
  }

  const repoRoot = path.resolve(module.repoPath);
  const manifestFile = path.resolve(repoRoot, module.manifestPath);
  const relativeManifest = path.relative(repoRoot, manifestFile);

  if (relativeManifest.startsWith("..") || path.isAbsolute(relativeManifest)) {
    return { ok: false, error: "Module Manifest PathがRepository外を参照しています。" };
  }

  if (!existsSync(manifestFile)) {
    return { ok: false, error: "Module Manifestが見つかりません。" };
  }

  try {
    const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
    if (manifest.id !== module.id || manifest.schemaVersion !== "0.1" || manifest.hubApiVersion !== "0.1") {
      return { ok: false, error: "Module Manifestの互換性を確認できません。" };
    }

    const entryFile = path.resolve(path.dirname(manifestFile), manifest.entry);
    const relativeEntry = path.relative(repoRoot, entryFile);

    if (relativeEntry.startsWith("..") || path.isAbsolute(relativeEntry)) {
      return { ok: false, error: "Module EntryがRepository外を参照しています。" };
    }

    if (!existsSync(entryFile)) {
      return { ok: false, error: "Module Rendererが見つかりません。" };
    }

    return { ok: true, manifest, manifestFile, entryFile, repoRoot };
  } catch {
    return { ok: false, error: "Module Manifestを読み込めませんでした。" };
  }
}

function publicModule(module) {
  const embedded = resolveEmbeddedModule(module);
  return {
    id: module.id,
    name: module.name,
    description: module.description ?? "",
    repository: module.repository,
    mode: module.mode,
    installed: Boolean(module.executablePath && existsSync(module.executablePath)),
    embeddedAvailable: embedded.ok
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

async function openExecutable(module) {
  if (!module?.executablePath || !existsSync(module.executablePath)) {
    return { ok: false, error: "アプリ本体が見つかりません。" };
  }

  const error = await shell.openPath(module.executablePath);
  if (error) {
    return { ok: false, error };
  }
  return { ok: true };
}

async function launchModule(moduleId) {
  const module = getModule(moduleId);
  if (!module) {
    return { ok: false, error: "未登録のModuleです。" };
  }
  if (module.mode !== "external-exe") {
    return { ok: false, error: "このModuleはHub内表示を優先します。" };
  }
  return openExecutable(module);
}

function syncModuleViewBounds() {
  if (!mainWindow) return;
  const [width, height] = mainWindow.getContentSize();
  const bounds = {
    x: sidebarWidth,
    y: 0,
    width: Math.max(0, width - sidebarWidth),
    height
  };

  for (const view of moduleViews.values()) {
    view.setBounds(bounds);
  }
}

function hideAllModuleViews() {
  for (const view of moduleViews.values()) {
    view.setVisible(false);
  }
}

function getOrCreateModuleView(module) {
  const existing = moduleViews.get(module.id);
  if (existing && !existing.webContents.isDestroyed()) {
    return { ok: true, view: existing };
  }

  const resolved = resolveEmbeddedModule(module);
  if (!resolved.ok) return resolved;

  const view = new WebContentsView({
    webPreferences: {
      preload: path.join(__dirname, "module-preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      additionalArguments: [`--hub-module-id=${module.id}`]
    }
  });

  moduleViews.set(module.id, view);
  moduleIdByWebContentsId.set(view.webContents.id, module.id);
  mainWindow.contentView.addChildView(view);
  syncModuleViewBounds();

  view.webContents.on("destroyed", () => {
    moduleIdByWebContentsId.delete(view.webContents.id);
    moduleViews.delete(module.id);
  });

  view.webContents.loadFile(resolved.entryFile);
  return { ok: true, view };
}

function openModuleView(moduleId) {
  const module = getModule(moduleId);
  if (!module) {
    return { ok: false, error: "未登録のModuleです。" };
  }

  const result = getOrCreateModuleView(module);
  if (!result.ok) return result;

  hideAllModuleViews();
  result.view.setVisible(true);
  syncModuleViewBounds();
  return { ok: true };
}

function showHome() {
  hideAllModuleViews();
  return { ok: true };
}

function moduleFromSender(sender) {
  const moduleId = moduleIdByWebContentsId.get(sender.id);
  return moduleId ? getModule(moduleId) : null;
}

function getModuleContext(sender) {
  const module = moduleFromSender(sender);
  if (!module) {
    return { ok: false, error: "Module Contextを特定できません。" };
  }

  let version = null;
  if (module.repoPath) {
    const packagePath = path.join(module.repoPath, "package.json");
    if (existsSync(packagePath)) {
      try {
        version = JSON.parse(readFileSync(packagePath, "utf8")).version ?? null;
      } catch {
        version = null;
      }
    }
  }

  return {
    ok: true,
    id: module.id,
    name: module.name,
    repository: module.repository,
    version,
    fullAppAvailable: Boolean(module.executablePath && existsSync(module.executablePath))
  };
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
  win.on("resize", syncModuleViewBounds);
  return win;
}

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
    ipcMain.handle("hub:open-module-view", (_event, moduleId) => openModuleView(moduleId));
    ipcMain.handle("hub:show-home", () => showHome());
    ipcMain.handle("hub:ssd-status", () => readSsdStatus());

    ipcMain.handle("hub:module-context", (event) => getModuleContext(event.sender));
    ipcMain.handle("hub:module-open-full-app", (event) => {
      const module = moduleFromSender(event.sender);
      return module ? openExecutable(module) : { ok: false, error: "Module Contextを特定できません。" };
    });
    ipcMain.handle("hub:module-show-home", () => showHome());

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
