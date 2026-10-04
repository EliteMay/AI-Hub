# AI Hub Module Contract

Version: 0.4

## 目的

各Repositoryを独立させたまま、Project固有Runtime / Renderer / IPCをAI Hub内で安全に動かし、**共通責務だけをAI Hub側で一元管理**するためのContract。

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
- Product固有Settings

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
    "repository-read",
    "history",
    "diagnostics",
    "shared-settings",
    "module-settings"
  ]
}
```

## Adapter Contract

Module Adapterは必要に応じてAI Hubから共通設定Snapshotを受け取る。

```js
export async function activate({
  hostWindow,
  webContents,
  dataRoot,
  sharedSettings
}) {
  return {
    commandStatus,
    cancelActiveCommand,
    applySharedSettings,
    openSettings,
    dispose
  };
}
```

- `sharedSettings` はAI Hubが所有するCurrent Snapshot。
- `applySharedSettings(next)` は共通設定変更を実行中Moduleへ即時反映したい場合のOptional Controller API。
- Module側は共通設定を独自のCanonical Settingsとして複製しない。
- Product固有設定は各RepositoryがOwnする。
- `module-settings` Capabilityを宣言するModuleは、Controllerの `openSettings()` を通じてAI Hubの「アプリ別設定」から固有設定へ遷移できる。
- Hub表示中はModule内部の重複する設定Navigationを隠せるが、Standalone UIの設定入口は維持する。

## Shared Settings Contract

共通設定の正本はAI Hub。

AI SSD利用時:

```text
Canonical
D:\AI\config\ai-hub-shared-settings.json

Backup
D:\AI\backups\ai-hub-shared-settings.backup.json
```

SSD未利用時はAI Hub userData配下へFallbackする。

Current schema:

```json
{
  "schemaVersion": 1,
  "notificationsEnabled": true,
  "startupModuleId": "",
  "repositoryRoot": "D:\\AI\\projects\\repos"
}
```

### Commonに置くもの

複数Moduleで同じ意味を持ち、1つの設定値を共有する価値があるもの。

- Hub / Module共通通知
- Hub起動時に開くModule
- AI Repositoryの基準保存先
- 将来、複数Moduleで本当に共通化できることが確認できた設定

### Module固有に残すもの

意味・Validation・LifecycleがProduct固有のもの。

例:

- Local AI LabのModel Routing / Model Profile
- 監査対象Repository
- Bonsai Runtime Path
- Coverage再利用
- Product固有Diagnostics / Recovery設定

「設定画面を1つに見せたい」ことを理由に、意味の違うSettingsを無理に1 Schemaへ押し込まない。

## Security Boundary

- Module Registryに登録済みRepositoryだけ読み込む。
- Manifest / Renderer / Preload / AdapterはすべてRepository Root内に収まることを検証する。
- Module Rendererは `contextIsolation: true` / `nodeIntegration: false` / `sandbox: true`。
- Module Preloadは各Repositoryが所有し、必要なIPCだけExposeする。
- 任意URLへのNavigation / Window Openを許可しない。
- Module Runtimeが許可するCommand / File操作は各ProjectのSecurity Contractに従う。
- AI HubはModule側のSecurity Contractを広げない。
- 共通設定の保存先PathをRendererから任意指定させない。
- Repository Root変更はMain ProcessのFolder Picker経由だけを標準経路とする。

## Storage

AI SSDが利用可能な場合:

```text
Module Data
D:\AI\apps\<dataRootKey>

Shared Config
D:\AI\config

Shared Config Backup
D:\AI\backups
```

Module dataRootとShared Configを同じ役割として扱わない。

## Lifecycle

```text
AI Hub
↓
Shared Settings load
↓
Registry
↓
Module Manifest
↓
WebContentsView作成
↓
Repository-owned Preload
↓
Adapter.activate(sharedSettings)
↓
Repository-owned Runtime
↓
Repository-owned Renderer

Shared Settings change
↓
AI Hub Canonical save
↓
Module Controller.applySharedSettings()
```

Moduleの長時間処理が実行中の場合、AI Hub終了時も無警告でProcessを破棄しない。

## Ownership

AI Hub:

- Window / Sidebar / Navigation
- Module Registry
- Module lifecycle
- SSD routing
- Shared Settings Canonical Store
- 共通Close Guard
- Module Contract

各Project Repository:

- Renderer
- Preload
- Product Runtime
- IPC
- Product Requirements / Tests
- Product固有Settings
- Product固有Storage / Recovery

Hubへの統合を理由にProject固有CodeやSettingsをAI Hubへコピーしない。

## Migration

```text
external-exe
→ hub-renderer（既存Runtimeを共有）
→ shared-settings（共通責務だけ1つの正本へ）
→ 共通化価値が実証された責務だけ追加移行
→ 個別exe不要を検証
→ 廃止
```

一括Rewriteしない。
