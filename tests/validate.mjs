import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const requiredFiles = [
  "README.md",
  "REQUIREMENTS.md",
  "package.json",
  "config/modules.json",
  "src/main.mjs",
  "src/preload.cjs",
  "src/module-preload.cjs",
  "src/renderer/index.html",
  "src/renderer/app.js",
  "src/renderer/styles.css",
  "docs/MODULE_CONTRACT.md"
];

for (const relativePath of requiredFiles) {
  assert.ok(existsSync(path.join(root, relativePath)), `Missing: ${relativePath}`);
}

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
assert.equal(pkg.main, "src/main.mjs");
assert.equal(pkg.scripts.test, "node tests/validate.mjs");

const registry = JSON.parse(readFileSync(path.join(root, "config", "modules.json"), "utf8"));
assert.equal(registry.schemaVersion, "1.1");
assert.ok(Array.isArray(registry.modules));
assert.equal(registry.modules.length, 4);

const ids = registry.modules.map((module) => module.id);
assert.equal(new Set(ids).size, ids.length, "Module IDs must be unique.");

for (const module of registry.modules) {
  assert.match(module.id, /^[a-z0-9-]+$/);
  assert.ok(module.name);
  assert.ok(module.repository.startsWith("EliteMay/"));
  assert.ok(["external-exe", "hub-renderer"].includes(module.mode));
  assert.ok(module.executablePath.endsWith(".exe"));

  if (module.mode === "hub-renderer") {
    assert.ok(module.repoPath);
    assert.ok(module.manifestPath);
  }
}

const localAi = registry.modules.find((module) => module.id === "local-ai-lab");
assert.equal(localAi.mode, "hub-renderer");
assert.equal(localAi.manifestPath, "hub\\module.json");

const mainSource = readFileSync(path.join(root, "src", "main.mjs"), "utf8");
assert.match(mainSource, /WebContentsView/);
assert.match(mainSource, /contextIsolation:\s*true/);
assert.match(mainSource, /nodeIntegration:\s*false/);
assert.match(mainSource, /sandbox:\s*true/);
assert.match(mainSource, /module-preload\.cjs/);
assert.match(mainSource, /app\.setPath\("userData"/);
assert.match(mainSource, /path\.relative/);

console.log("AI Hub validation passed.");
