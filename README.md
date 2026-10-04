# AI Hub

複数のAI関連Electronアプリを、各GitHub Repositoryを独立させたまま1つのデスクトップ入口へ統合するHubです。

## 現在の段階

Phase 1のLauncher基盤に加えて、Phase 2の最初のPilotとして **Local AI LabをHub内Rendererへ統合**しています。

- Local AI Lab — `hub-renderer`
- Game Dev Hub — `external-exe`
- VReview — `external-exe`
- Video Plugin Dev Hub — `external-exe`

各アプリのRepository・Release・Project固有仕様は引き続き各RepositoryがSource of Truthです。

Local AI LabのHub向け画面自体も `EliteMay/local-ai-lab/hub/` が所有します。AI Hubは共通Shell / Module Contract / 安全なBridgeを担当します。

## 開発

```powershell
npm install
npm start
```

Local AI Lab PilotをHub内で表示するには、標準SSD Pathへ対象Repositoryが必要です。

```text
D:\AI\projects\repos\EliteMay--local-ai-lab
```

## 方針

- AI Hubは共通Electron Shell / Navigation / Settings / Storage integrationを担当する。
- Project固有機能は各Repositoryへ残す。
- Module間の共通ContractだけをAI Hubが所有する。
- Moduleは一括Rewriteせず `external-exe → hub-renderer → capability migration` の順で段階移行する。
- AI SSDを利用できる場合は `D:\AI_SSD_CONSTITUTION.md` を確認し、SSD側Rule Routingに従う。
