# AI Hub Module Contract

Version: 0.2

## 目的

各Repositoryを独立させたまま、Project固有Runtime / Renderer / IPCをAI Hub内で安全に動かすためのContract。

## Runtime Modes

### external-exe

既存Applicationをそのまま残し、Hubからallowlistされたexeだけを起動する互換Mode。

### hub-renderer

各Repositoryが次を所有する。

- Module Manifest
- Renderer
- Preload
- Runtime Adapter
- Product固有IPC / Runtime

AI Hubはそれらを登録済みRepository Pathから解決し、`WebContentsView` へ読み込む。

## Manifest 1.0

例:

```json
{
  "schemaVersion": "1.0",
  "hubApiVersion": "0.1",
  "id": "local-ai-lab",
  "name": "Local AI Lab",
  "mode": "hub-renderer",
  "renderer": "desktop/renderer/index.html",
  "preload": "hub/preload.cjs",
  "adapter": "hub/adapter.mjs",
  "dataRootKey": "local-ai-lab",
  "capabilities": [
    "local-models",
    "repository-read",
    "long-running-process",
    "history",
    "diagnostics"
  ]
}
```

## Adapter Contract

Module Adapterは最低限:

```js
export async function activate({
  hostWindow,
  webContents,
  dataRoot
}) {
  return {
    commandStatus,
    cancelActiveCommand,
    dispose
  };
}
```

を提供できる。

返却Controllerの機能はModuleが実際に必要なものだけ持つ。AI HubはProduct固有処理を再実装しない。

## Security Boundary

- Module Registryに登録済みRepositoryだけ読み込む。
- Manifest / Renderer / Preload / AdapterはすべてRepository Root内に収まることを検証する。
- Module Rendererは `contextIsolation: true` / `nodeIntegration: false` / `sandbox: true`。
- Module Preloadは各Repositoryが所有し、必要なIPCだけExposeする。
- 任意URLへのNavigation / Window Openを許可しない。
- Module Runtimeが許可するCommand / File操作は各ProjectのSecurity Contractに従う。
- AI HubはModule側のSecurity Contractを広げない。

## Storage

AI SSDが利用可能な場合:

```text
D:\AI\apps\<dataRootKey>
```

をModule dataRootとして渡す。

ModuleはこのPathを受け取っても、Canonical / History / Cache等のProject固有Data Roleを自身のRequirementsに従って扱う。

SSDが利用できない場合はAI Hub userData配下のModule領域へFallbackする。

## Lifecycle

```text
AI Hub
↓
Registry
↓
Module Manifest
↓
WebContentsView作成
↓
Repository-owned Preload
↓
Adapter.activate()
↓
Repository-owned Runtime
↓
Repository-owned Renderer
```

Moduleの長時間処理が実行中の場合、AI Hub終了時も無警告でProcessを破棄しない。

## Ownership

AI Hub:

- Window / Sidebar / Navigation
- Module Registry
- Module lifecycle
- SSD routing
- 共通Close Guard
- Module Contract

各Project Repository:

- Renderer
- Preload
- Product Runtime
- IPC
- Product Requirements / Tests
- Product固有Storage / Recovery

Hubへの統合を理由にProject固有CodeをAI Hubへコピーしない。

## Migration

```text
external-exe
→ hub-renderer（既存Runtimeを共有）
→ 共通化価値が実証された責務だけHubへ移行
→ 個別exe不要を検証
→ 廃止
```

一括Rewriteしない。
