import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export const SHARED_SETTINGS_SCHEMA_VERSION = 1;

function normalizeBoolean(value, fallback) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeModuleId(value) {
  const id = String(value || "").trim();
  return /^[a-z0-9-]+$/.test(id) ? id : "";
}

function normalizeRepositoryRoot(value, fallback) {
  const candidate = String(value || "").trim();
  return candidate ? path.resolve(candidate) : path.resolve(fallback);
}

export function normalizeSharedSettings(input = {}, { defaultRepositoryRoot }) {
  return {
    schemaVersion: SHARED_SETTINGS_SCHEMA_VERSION,
    notificationsEnabled: normalizeBoolean(input.notificationsEnabled, true),
    startupModuleId: normalizeModuleId(input.startupModuleId),
    repositoryRoot: normalizeRepositoryRoot(input.repositoryRoot, defaultRepositoryRoot)
  };
}

async function readJson(pathname) {
  return JSON.parse(await readFile(pathname, "utf8"));
}

async function directoryExists(pathname) {
  try {
    return (await stat(pathname)).isDirectory();
  } catch {
    return false;
  }
}

async function atomicWriteJson(targetPath, backupPath, value) {
  await mkdir(path.dirname(targetPath), { recursive: true });
  await mkdir(path.dirname(backupPath), { recursive: true });

  const temporaryPath = targetPath + ".tmp";
  await writeFile(temporaryPath, JSON.stringify(value, null, 2) + "\n", "utf8");

  try {
    await copyFile(targetPath, backupPath);
  } catch {}

  try {
    await rename(temporaryPath, targetPath);
  } catch {
    await rm(targetPath, { force: true });
    await rename(temporaryPath, targetPath);
  }
}

export function createSharedSettingsStore({
  configPath,
  backupPath,
  defaultRepositoryRoot
}) {
  let cached = null;

  async function read() {
    if (cached) return { ...cached };

    let source = null;
    try {
      source = await readJson(configPath);
    } catch {
      try {
        source = await readJson(backupPath);
      } catch {
        source = {};
      }
    }

    const next = normalizeSharedSettings(source, { defaultRepositoryRoot });
    if (!(await directoryExists(next.repositoryRoot))) {
      await mkdir(defaultRepositoryRoot, { recursive: true });
      next.repositoryRoot = path.resolve(defaultRepositoryRoot);
    }

    cached = next;
    return { ...cached };
  }

  async function save(input) {
    const current = await read();
    const next = normalizeSharedSettings({ ...current, ...input }, { defaultRepositoryRoot });

    if (!(await directoryExists(next.repositoryRoot))) {
      throw new Error("Repository保存先フォルダが見つかりません。");
    }

    await atomicWriteJson(configPath, backupPath, next);
    cached = next;
    return { ...cached };
  }

  return {
    read,
    save,
    paths: {
      configPath,
      backupPath
    }
  };
}
