import { app, BrowserWindow, WebContentsView, dialog, ipcMain, shell } from "electron";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createSharedSettingsStore } from "./shared-settings.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "..");
const registryPath = path.join(appRoot, "config", "modules.json");
const ssdManifestPath = "D:\\AI_SSD_MANIFEST.json";
const sidebarWidth = 230;

let mainWindow = null;
let allowWindowClose = false;
const moduleViews = new Map();
const moduleRuntimeControllers = new Map();

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

function createSharedSettingsInfrastructure() {
  const manifest = readSsdManifest();
  const configRoot = manifest?.zones?.config ?? path.join(app.getPath("userData"), "config");
  const backupRoot = manifest?.zones?.backups ?? path.join(app.getPath("userData"), "backups");
  const defaultRepositoryRoot = manifest?.zones?.projects
    ? path.join(manifest.zones.projects, "repos")
    : path.join(app.getPath("userData"), "repositories");

  return createSharedSettingsStore({
    configPath: path.join(configRoot, "ai-hub-shared-settings.json"),
    backupPath: path.join(backupRoot, "ai-hub-shared-settings.backup.json"),
    defaultRepositoryRoot
  });
}

const sharedSettingsStore = createSharedSettingsInfrastructure();
let sharedSettingsSnapshot = null;
let pendingRepositoryRoot = null;

async function getSharedSettings() {
  if (!sharedSettingsSnapshot) {
    sharedSettingsSnapshot = await sharedSettingsStore.read();
  }
  return { ...sharedSettingsSnapshot };
}

function publicSharedSettings(settings) {
  const manifest = readSsdManifest();
  return {
    ...settings,
    configPath: sharedSettingsStore.paths.configPath,
    managedRoot: manifest?.managedRoot ?? null
  };
}

function normalizeStartupModuleId(value) {
  const id = String(value || "").trim();
  if (!id) return "";
  const module = getModule(id);
  return module?.mode === "hub-renderer" ? id : "";
}

async function saveSharedSettings(input) {
  const current = await getSharedSettings();
  const requestedRoot = String(input?.repositoryRoot || "").trim();
  let repositoryRoot = current.repositoryRoot;

  if (requestedRoot && path.resolve(requestedRoot) !== path.resolve(current.repositoryRoot)) {
    if (!pendingRepositoryRoot || path.resolve(requestedRoot) !== path.resolve(pendingRepositoryRoot)) {
      throw new Error("Repository保存先は「変更」ボタンから選択してください。");
    }
    repositoryRoot = pendingRepositoryRoot;
  }

  const next = await sharedSettingsStore.save({
    ...input,
    repositoryRoot,
    startupModuleId: normalizeStartupModuleId(input?.startupModuleId)
  });
  pendingRepositoryRoot = null;
  sharedSettingsSnapshot = next;

  for (const controller of moduleRuntimeControllers.values()) {
    await controller?.applySharedSettings?.(next);
  }

  return publicSharedSettings(next);
}

async function selectSharedRepositoryRoot() {
  const current = await getSharedSettings();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "AI Repositoryの共通保存先を選択",
    defaultPath: current.repositoryRoot,
    properties: ["openDirectory"]
  });
  if (result.canceled) {
    pendingRepositoryRoot = null;
    return null;
  }
  pendingRepositoryRoot = result.filePaths[0];
  return pendingRepositoryRoot;
}

function readRegistry() {
  const parsed = JSON.parse(readFileSync(registryPath, "utf8"));
  if (!Array.isArray(parsed.modules)) throw new Error("Module registry is invalid.");
  return parsed.modules;
}

function getModule(moduleId) {
  return readRegistry().find((item) => item.id === moduleId) ?? null;
}

function resolveInside(root, relativePath) {
  const rootPath = path.resolve(root);
  const target = path.resolve(rootPath, relativePath);
  const relative = path.relative(rootPath, target);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error("Repository外のPathは使用できません。");
  }
  return target;
}

function resolveEmbeddedModule(module) {
  if (module?.mode !== "hub-renderer") {
    return { ok: false, error: "このModuleはHub内表示に対応していません。" };
  }
  if (!module.repoPath || !module.manifestPath) {
    return { ok: false, error: "ModuleのRepository Path設定が不足しています。" };
  }

  const repoRoot = path.resolve(module.repoPath);
  if (!existsSync(repoRoot)) {
    return { ok: false, error: "Module Repositoryが見つかりません。" };
  }

  try {
    const manifestPath = resolveInside(repoRoot, module.manifestPath);
    if (!existsSync(manifestPath)) return { ok: false, error: "Module Manifestが見つかりません。" };

    const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (
      manifest.id !== module.id ||
      manifest.schemaVersion !== "1.0" ||
      manifest.hubApiVersion !== "0.1" ||
      manifest.mode !== "hub-renderer"
    ) {
      return { ok: false, error: "Module Manifestの互換性を確認できません。" };
    }

    const rendererPath = resolveInside(repoRoot, manifest.renderer);
    const preloadPath = resolveInside(repoRoot, manifest.preload);
    const adapterPath = resolveInside(repoRoot, manifest.adapter);

    for (const target of [rendererPath, preloadPath, adapterPath]) {
      if (!existsSync(target)) return { ok: false, error: "Module構成Fileが不足しています。" };
    }

    return {
      ok: true,
      repoRoot,
      manifestPath,
      manifest,
      rendererPath,
      preloadPath,
      adapterPath,
      rendererUrl: pathToFileURL(rendererPath).href
    };
  } catch (error) {
    return { ok: false, error: error?.message || "Module Manifestを読み込めませんでした。" };
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
    return { available: false, manifestPath: ssdManifestPath, managedRoot: null, dataRoot: null };
  }
  return {
    available: true,
    manifestPath: ssdManifestPath,
    managedRoot: manifest.managedRoot ?? "D:\\AI",
    constitutionVersion: manifest.constitutionVersion ?? null,
    dataRoot: configuredDataRoot
  };
}

function moduleDataRoot(manifest) {
  const key = String(manifest.dataRootKey || manifest.id || "module").replace(/[^a-z0-9._-]/gi, "-");
  const appsRoot = readSsdManifest()?.zones?.apps;
  const root = appsRoot || path.join(app.getPath("userData"), "modules");
  const target = path.join(root, key);
  mkdirSync(target, { recursive: true });
  return target;
}

async function openExecutable(module) {
  if (!module?.executablePath || !existsSync(module.executablePath)) {
    return { ok: false, error: "アプリ本体が見つかりません。" };
  }
  const error = await shell.openPath(module.executablePath);
  return error ? { ok: false, error } : { ok: true };
}

async function launchModule(moduleId) {
  const module = getModule(moduleId);
  if (!module) return { ok: false, error: "未登録のModuleです。" };
  if (module.mode !== "external-exe") {
    return { ok: false, error: "このModuleはHub内表示を優先します。" };
  }
  return openExecutable(module);
}

function syncModuleViewBounds() {
  if (!mainWindow) return;
  const [width, height] = mainWindow.getContentSize();
  const bounds = { x: sidebarWidth, y: 0, width: Math.max(0, width - sidebarWidth), height };
  for (const view of moduleViews.values()) view.setBounds(bounds);
}

function hideAllModuleViews() {
  for (const view of moduleViews.values()) view.setVisible(false);
}

async function createModuleView(module) {
  const resolved = resolveEmbeddedModule(module);
  if (!resolved.ok) return resolved;

  const view = new WebContentsView({
    webPreferences: {
      preload: resolved.preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  view.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
  view.webContents.on("will-navigate", (event, url) => {
    if (url !== resolved.rendererUrl) event.preventDefault();
  });

  mainWindow.contentView.addChildView(view);
  moduleViews.set(module.id, view);
  syncModuleViewBounds();

  try {
    const adapter = await import(pathToFileURL(resolved.adapterPath).href);
    if (typeof adapter.activate !== "function") {
      throw new Error("Module Adapterにactivate()がありません。");
    }

    const controller = await adapter.activate({
      hostWindow: mainWindow,
      webContents: view.webContents,
      dataRoot: moduleDataRoot(resolved.manifest),
      sharedSettings: await getSharedSettings()
    });

    moduleRuntimeControllers.set(module.id, controller ?? null);
    await view.webContents.loadFile(resolved.rendererPath);
    return { ok: true, view };
  } catch (error) {
    mainWindow.contentView.removeChildView(view);
    moduleViews.delete(module.id);
    try { view.webContents.close(); } catch {}
    return { ok: false, error: error?.message || "Moduleの起動に失敗しました。" };
  }
}

async function getOrCreateModuleView(module) {
  const existing = moduleViews.get(module.id);
  if (existing && !existing.webContents.isDestroyed()) return { ok: true, view: existing };
  return createModuleView(module);
}

async function openModuleView(moduleId) {
  const module = getModule(moduleId);
  if (!module) return { ok: false, error: "未登録のModuleです。" };

  const result = await getOrCreateModuleView(module);
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

function activeRunningControllers() {
  return [...moduleRuntimeControllers.entries()]
    .filter(([, controller]) => controller?.commandStatus?.().running)
    .map(([moduleId, controller]) => ({ moduleId, controller }));
}

function installCloseGuard(win) {
  win.on("close", (event) => {
    if (allowWindowClose) return;

    const running = activeRunningControllers();
    if (running.length === 0) return;

    event.preventDefault();
    const choice = dialog.showMessageBoxSync(win, {
      type: "warning",
      title: "処理を実行中です",
      message: "Hub内Moduleで実行中の処理があります。",
      detail: "このまま終了すると実行中の処理を停止します。保存済みCheckpointがある処理は、次回起動後に再開できる場合があります。",
      buttons: ["処理を続ける", "停止して終了"],
      defaultId: 0,
      cancelId: 0,
      noLink: true
    });

    if (choice !== 1) return;

    Promise.all(
      running.map(({ controller }) => controller.cancelActiveCommand?.({ quitAfter: false }))
    ).finally(() => {
      allowWindowClose = true;
      win.close();
    });
  });
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
      preload: path.join(appRoot, "src", "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });

  win.loadFile(path.join(appRoot, "src", "renderer", "index.html"));
  win.on("resize", syncModuleViewBounds);
  installCloseGuard(win);
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

  app.whenReady().then(async () => {
    ipcMain.handle("hub:list-modules", () => readRegistry().map(publicModule));
    ipcMain.handle("hub:launch-module", (_event, moduleId) => launchModule(moduleId));
    ipcMain.handle("hub:open-module-view", (_event, moduleId) => openModuleView(moduleId));
    ipcMain.handle("hub:show-home", () => showHome());
    ipcMain.handle("hub:ssd-status", () => readSsdStatus());
    ipcMain.handle("hub:settings:get", async () => publicSharedSettings(await getSharedSettings()));
    ipcMain.handle("hub:settings:save", (_event, input) => saveSharedSettings(input));
    ipcMain.handle("hub:settings:select-repository-root", () => selectSharedRepositoryRoot());

    const sharedSettings = await getSharedSettings();
    mainWindow = createWindow();

    const startupModule = String(
      process.env.AI_HUB_START_MODULE || sharedSettings.startupModuleId || ""
    ).trim();
    if (startupModule) {
      void openModuleView(startupModule).then((result) => {
        console.log("[AI Hub] startup module:", startupModule, result.ok ? "OK" : result.error);
      });
    }

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) mainWindow = createWindow();
    });
  });

  app.on("before-quit", () => {
    for (const controller of moduleRuntimeControllers.values()) {
      try { controller?.dispose?.(); } catch {}
    }
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
