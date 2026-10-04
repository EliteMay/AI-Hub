# AI Hub Module Contract

Version: 0.1

## 目的

各Repositoryを独立させたままAI Hubへ統合するための最小Contract。

## Runtime Modes

### external-exe

既存Applicationをそのまま残し、Hubからallowlistされたexeだけを起動する互換Mode。

Registry:

- id
- name
- description
- repository
- mode
- executablePath

Rendererから任意Pathを指定して起動しない。

### hub-renderer

各Repository自身がHub向けRendererを所有し、AI Hubが `WebContentsView` で表示する。

AI Hub Registry:

- id
- repository
- mode = hub-renderer
- repoPath
- manifestPath
- executablePath（移行中のFallback）

各Repository側のManifest:

```json
{
  "schemaVersion": "0.1",
  "hubApiVersion": "0.1",
  "id": "local-ai-lab",
  "name": "Local AI Lab",
  "entry": "index.html",
  "capabilities": [
    "module-context",
    "open-full-app",
    "show-hub-home"
  ]
}
```

## Security Boundary

- Module Rendererは `nodeIntegration: false` / `contextIsolation: true` / `sandbox: true` で動かす。
- ModuleへNode / Electron APIを直接公開しない。
- `module-preload.cjs` の限定Bridgeだけを公開する。
- Module IDはRenderer入力をAuthorizationにせず、Main Processが `webContents.id` から対応Moduleを解決する。
- ManifestとEntryは登録済みRepository Root内に収まることをMain Processで検証する。
- Moduleから任意Command / 任意Path実行を許可しない。

## Current Module API 0.1

- `getContext()`
  - Module ID / name / repository / package version / full app availability
- `openFullApp()`
  - Registryに固定されたFallback exeのみ起動
- `showHome()`
  - Hub Homeへ戻る

Product固有の強い権限はまだ提供しない。

## Ownership

AI Hubが所有するもの:

- Hub Shell
- Navigation
- Common Settings
- Common Storage routing
- Module discovery / lifecycle
- Shared diagnostics
- Module Contract / Bridge

各Repositoryが所有するもの:

- Module Renderer
- Product-specific requirements
- Product-specific UI / logic
- Product-specific tests
- Product-specific release compatibility

Hubへの統合を理由にProject固有仕様をAI Hubへコピーしない。

## Migration

```text
external-exe
→ hub-renderer
→ capability単位でHub Bridgeへ移行
→ native-module相当の統合
→ 検証後に個別exeを廃止
```

一括Rewriteしない。
