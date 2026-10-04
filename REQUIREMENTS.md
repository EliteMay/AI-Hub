# AI Hub Requirements

## 目的

複数のAI関連Electronアプリを、各GitHub Repositoryを独立したSource of Truthとして維持しながら、Windows上では1つのHubから利用できるようにする。

## Current Scope

Phase 1基盤 + Phase 2 Pilot:

- AI Hub自身を1つのElectron Applicationとして提供する。
- 既存の個別Electron AppをHubから起動できる。
- Module RegistryでRepository / Runtime mode / executable locationを管理する。
- AI SSDが存在する場合は状態を表示する。
- Local AI Labを最初の `hub-renderer` PilotとしてHub内に表示する。
- Hubから任意Pathや任意Commandを実行できるAPIは公開しない。

## Module Migration

Moduleは段階的に次の状態を取れる。

1. external-exe
   - 既存exeをHubから起動する。
2. hub-renderer
   - 各RepositoryがHub向けRendererを提供し、HubのWebContentsView内に表示する。
   - Project固有UIのOwnerは各Repository。
3. capability migration
   - Hubの限定BridgeへStorage / Process / Settings等をCapability単位で移す。
4. native integration
   - 個別exeが不要になったRepositoryだけ、検証後に廃止する。

一括Rewriteは行わず、Repositoryごとに検証して移行する。

## Source of Truth

- Hub共通Shell / Module Contract / Navigation: EliteMay/AI-Hub
- Local AI固有機能 / Hub Renderer: EliteMay/local-ai-lab
- Game Dev固有機能: EliteMay/game-dev-hub
- VALORANT Review固有機能: EliteMay/valorant-review
- Video Plugin固有機能: EliteMay/video-plugin-dev-hub
- SSD構成 / SSDローカル運用: D:\AI_SSD_CONSTITUTION.md

Hubは各Project固有Requirementsの第二Source of Truthにならない。

## Safety

- contextIsolationを有効にする。
- RendererのnodeIntegrationを無効にする。
- Module Rendererはsandboxを有効にする。
- IPCはallowlistされたModule / Capabilityだけ受け付ける。
- Module Renderer自身がModule IDや任意PathをAuthorizationとして決定しない。
- Manifest / Entryは登録Repository Root外を参照できない。
- Registryの任意Command実行は許可しない。
- Missing App / Missing Moduleは安全に失敗する。
- 既存App / User DataをPilot段階で移動・削除しない。

## Completion Gate: Phase 1

- Electron Windowが起動する。
- 4つの既知Moduleが表示される。
- Installed / Missing状態が実Pathに基づいて表示される。
- Installed external-exe Moduleを起動できる。
- Missing Module起動は安全に失敗する。
- SSD Manifestの有無とRootを表示できる。
- `npm test` が成功する。

## Completion Gate: Local AI Lab hub-renderer Pilot

- Local AI LabのModule ManifestがLocal AI Lab Repositoryに存在する。
- AI Hubが登録済みrepoPath / manifestPathからModuleを解決する。
- Local AI Lab画面をHub Window内のWebContentsViewで表示できる。
- Hub Sidebar / Module画面からHomeへ戻れる。
- Module画面から既存Local AI Lab exeをFallback起動できる。
- ModuleへNode / Electronの汎用APIを公開しない。
- Local AI Lab側とAI Hub側のTestが成功する。
- Windows実機でHub内表示を確認する。
