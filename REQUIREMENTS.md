# AI Hub Requirements

## 目的

複数のAI関連Electronアプリを、各GitHub Repositoryを独立したSource of Truthとして維持しながら、Windows上では1つのHubから利用できるようにする。

## Current Scope

Phase 1基盤 + Phase 2 Local AI Lab Pilot + Phase 3 Shared Settings:

- AI Hub自身を1つのElectron Applicationとして提供する。
- 既存の個別Electron AppをHubから起動できる。
- Module RegistryでRepository / Runtime mode / executable locationを管理する。
- AI SSDが存在する場合は状態を表示する。
- Local AI Labを最初の `hub-renderer` として、既存Renderer / Runtime / IPCをHub内で共有する。
- AI Hubに「共通設定」を持ち、通知 / 起動時画面 / AI Repository基準保存先を一元管理する。
- 共通設定をHub内ModuleへSnapshotとして渡し、変更時は対応Moduleへ即時反映できる。
- Module固有Settingsは各Repositoryに残し、AI Hubへ複製しない。
- Hubから任意Pathや任意Commandを実行できる汎用APIは公開しない。

## Module Migration

1. external-exe
   - 既存exeをHubから起動。
2. hub-renderer
   - 各Repository所有のManifest / Renderer / Preload / AdapterをHubが読み込む。
3. shared foundation
   - 共通化価値が実証されたStorage / Settings / Diagnostics等だけHub側共通責務へ移す。
4. standalone retirement
   - 個別exeが不要になったModuleだけ検証後に廃止。

## Source of Truth

- Hub Shell / Registry / Module Contract: EliteMay/AI-Hub
- Local AI固有Runtime / Renderer / IPC / Hub Adapter: EliteMay/local-ai-lab
- Game Dev固有機能: EliteMay/game-dev-hub
- VALORANT Review固有機能: EliteMay/valorant-review
- Video Plugin固有機能: EliteMay/video-plugin-dev-hub
- SSD構成 / SSDローカル運用: D:\AI_SSD_CONSTITUTION.md

Hubは各Project固有Requirementsの第二Source of Truthにならない。

## Security

- Host Renderer / Module RendererともにcontextIsolationを有効にする。
- nodeIntegrationを無効にする。
- Module Rendererはsandboxを有効にする。
- Moduleは登録済みrepoPath / manifestPathからのみ解決する。
- Manifestが指定するRenderer / Preload / AdapterはRepository Root外を参照できない。
- Moduleの任意Command許可は各Repositoryのallowlist Contractを維持する。
- AI HubはModule Runtimeへ追加の任意Shell権限を与えない。
- 外部Navigation / PopupをModule Viewから許可しない。

## Storage

- AI Hub自身: D:\AI\apps\ai-hub
- Local AI Lab Module: D:\AI\apps\local-ai-lab
- 他ModuleもdataRootKey単位で分離する。
- SSDが利用できない場合のみAI Hub userData配下へFallbackする。
- Project固有Data Roleは各RepositoryのRequirementsを優先する。
- 共通設定Canonical: D:\\AI\\config\\ai-hub-shared-settings.json
- 共通設定Backup: D:\\AI\\backups\\ai-hub-shared-settings.backup.json
- SSD未検出時だけAI Hub userData配下へFallbackする。
- 同じ共通設定を各Moduleのsettings.jsonへCanonical Copyしない。

## Completion Gate: Phase 1

- Electron Windowが起動する。
- 4つの既知Moduleが表示される。
- external-exe Moduleを起動できる。
- SSD Manifestを検出できる。
- `npm test` が成功する。

## Completion Gate: Local AI Lab hub-renderer Pilot

- Local AI Lab mainにManifest / Adapter / Hub Preloadが存在する。
- Local AI Lab standaloneとHubが同じRuntime implementationを共有する。
- AI HubがManifest 1.0を検証できる。
- AI HubがLocal AI Labの既存RendererをWebContentsView内に表示できる。
- Local AI Labの設定 / Repository選択 / Model / Run / History / Diagnostics UIがHub内Rendererから既存IPCへ接続できる。
- Local AI LabのUpdaterはHub内では無効化する。
- 長時間Command実行中はHub終了時に警告・停止確認を行う。
- Module dataRootがD:\AI\apps\local-ai-labへRoutingされる。
- Local AI Lab側の全TestとAI Hub側Testが成功する。
- Windows実機でHub内表示を確認する。


## Completion Gate: Shared Settings

- AI Hub Sidebarから「共通設定」へ到達できる。
- 通知ON/OFF、起動時Module、Repository共通保存先を確認・変更できる。
- Repository共通保存先はMain ProcessのFolder Pickerから選ぶ。
- Shared SettingsはSchema Version付きJSONとしてCanonical保存する。
- Current Settings破損時はBackupからRecoverできる。
- Local AI LabへShared Settings Snapshotを渡せる。
- Shared Settings変更後、起動済みLocal AI Lab Runtimeへ通知設定等を即時反映できる。
- Hub内Local AI Labでは重複するApp Update設定を表示しない。
- Standalone Local AI Labでは従来の固有Settings / Updaterを維持する。
- AI Hub TestとLocal AI Lab Testが成功する。
- Windows実機で共通設定画面とLocal AI Lab統合を確認する。
