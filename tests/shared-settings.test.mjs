import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { createSharedSettingsStore } from "../src/shared-settings.mjs";

test("shared settings persist one canonical config with backup recovery", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "ai-hub-settings-"));
  const repoRoot = path.join(root, "repos");
  const configPath = path.join(root, "config", "shared-settings.json");
  const backupPath = path.join(root, "backups", "shared-settings.backup.json");
  await mkdir(repoRoot, { recursive: true });

  const store = createSharedSettingsStore({ configPath, backupPath, defaultRepositoryRoot: repoRoot });
  const initial = await store.read();

  assert.equal(initial.notificationsEnabled, true);
  assert.equal(initial.startupModuleId, "");
  assert.equal(initial.repositoryRoot, path.resolve(repoRoot));

  await store.save({
    notificationsEnabled: false,
    startupModuleId: "local-ai-lab",
    repositoryRoot: repoRoot
  });
  await store.save({ notificationsEnabled: true });
  await writeFile(configPath, "{broken", "utf8");

  const recoveredStore = createSharedSettingsStore({ configPath, backupPath, defaultRepositoryRoot: repoRoot });
  const recovered = await recoveredStore.read();

  assert.equal(recovered.notificationsEnabled, false);
  assert.equal(recovered.startupModuleId, "local-ai-lab");
});
