# AI Hub

複数のAI関連Electronアプリを、各GitHub Repositoryを独立させたまま1つのデスクトップ入口へ統合するHubです。

## 現在の段階

Local AI Labを最初の本統合Pilotとして、**既存のLocal AI Lab Renderer / Runtime / IPCをAI Hub内でそのまま動かす方式**へ移行しています。

- Local AI Lab — `hub-renderer`（Repository-owned Runtime Adapter）
- Game Dev Hub — `external-exe`
- VReview — `external-exe`
- Video Plugin Dev Hub — `external-exe`

Repositoryは統合しません。

```text
EliteMay/AI-Hub
= Window / Sidebar / Registry / Module lifecycle / SSD routing

EliteMay/local-ai-lab
= Local AI Lab Renderer / Runtime / IPC / Hub Adapter
```

## 開発

```powershell
npm install
npm start
```

Local AI Lab Moduleは標準SSD Pathを利用します。

```text
Repository
D:\AI\projects\repos\EliteMay--local-ai-lab

Module Data
D:\AI\apps\local-ai-lab
```

## Module読み込み

```text
AI Hub Registry
↓
local-ai-lab/hub/module.json
↓
hub/preload.cjs
↓
hub/adapter.mjs
↓
desktop/runtime-host.mjs
↓
desktop/renderer/index.html
```

Standalone版Local AI Labも `desktop/runtime-host.mjs` を共有するので、Hub用に機能をコピーして二重実装しません。

## 方針

- 各ProjectのSource of Truthは各Repositoryに残す。
- AI HubはProject固有機能を複製しない。
- 共通化するのは実際に複数Moduleで安定して共通化できる責務だけ。
- 個別exeはModule移行が完了するまでFallbackとして残す。
- AI SSDを利用できる場合は `D:\AI_SSD_CONSTITUTION.md` と必要なScoped RuleへRoutingする。
