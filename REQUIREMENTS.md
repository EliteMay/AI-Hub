# AI Hub Requirements

## 目的

複数のAI関連Electronアプリを、各GitHub Repositoryを独立したSource of Truthとして維持しながら、Windows上では1つのHubから利用できるようにする。

## Current Scope

Phase 1:

- AI Hub自身を1つのElectron Applicationとして提供する。
- 既存の個別Electron AppをHubから起動できる。
- Module RegistryでRepository / Runtime mode / executable locationを管理する。
- AI SSDが存在する場合は状態を表示する。
- Hubから任意Pathや任意Commandを実行できるAPIは公開しない。

## Module Migration

Moduleは段階的に次の状態を取れる。

1. external-exe
   - 既存exeをHubから起動する。
2. hub-renderer
   - 各RepositoryがHub向けRenderer buildを提供し、Hub内に表示する。
3. native-module
   - Hubの共通IPC / Storage / Process APIと統合する。

一括Rewriteは行わず、Repositoryごとに検証して移行する。

## Source of Truth

- Hub共通Shell / Module Contract / Navigation: EliteMay/AI-Hub
- Local AI固有機能: EliteMay/local-ai-lab
- Game Dev固有機能: EliteMay/game-dev-hub
- VALORANT Review固有機能: EliteMay/valorant-review
- Video Plugin固有機能: EliteMay/video-plugin-dev-hub
- SSD構成 / SSDローカル運用: D:\AI_SSD_CONSTITUTION.md

Hubは各Project固有Requirementsの第二Source of Truthにならない。

## Safety

- contextIsolationを有効にする。
- RendererのnodeIntegrationを無効にする。
- IPCはallowlistされたModule IDのみ受け付ける。
- Registryの任意Command実行はPhase 1では許可しない。
- Missing AppはErrorではなく「未検出」として表示する。
- 既存App / User DataをPhase 1で移動・削除しない。

## Completion Gate: Phase 1

- Electron Windowが起動する。
- 4つの既知Moduleが表示される。
- Installed / Missing状態が実Pathに基づいて表示される。
- Installed Moduleを起動できる。
- Missing Module起動は安全に失敗する。
- SSD Manifestの有無とRootを表示できる。
- `npm test` が成功する。
