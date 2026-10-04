# AI Hub

複数のAI関連Electronアプリを、各GitHub Repositoryを独立させたまま1つのデスクトップ入口へ統合するHubです。

## 現在の段階

Local AI Labを最初の本統合Pilotとして、**既存のLocal AI Lab Renderer / Runtime / IPCをAI Hub内でそのまま動かし、共通設定だけAI Hubへ集約する方式**へ移行しています。

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


## 共通設定

AI Hubの「共通設定」は、複数Moduleで同じ意味を持つ項目だけを管理します。

現在:

- デスクトップ通知
- 起動時に開くModule
- AI Repositoryの共通保存先

AI SSD利用時の正本:

```text
D:\AI\config\ai-hub-shared-settings.json
```

Backup:

```text
D:\AI\backups\ai-hub-shared-settings.backup.json
```

モデル選択、監査条件、Bonsai等のProduct固有設定は各Module側に残します。
