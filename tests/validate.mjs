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
  "src/preload.mjs",
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
assert.equal(registry.schemaVersion, "1.0");
assert.ok(Array.isArray(registry.modules));
assert.equal(registry.modules.length, 4);

const ids = registry.modules.map((module) => module.id);
assert.equal(new Set(ids).size, ids.length, "Module IDs must be unique.");

for (const module of registry.modules) {
  assert.match(module.id, /^[a-z0-9-]+$/);
  assert.ok(module.name);
  assert.ok(module.repository.startsWith("EliteMay/"));
  assert.equal(module.mode, "external-exe");
  assert.ok(module.executablePath.endsWith(".exe"));
}

console.log("AI Hub validation passed.");
