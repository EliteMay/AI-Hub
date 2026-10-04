# AI Hub

複数のAI関連Electronアプリを、各GitHub Repositoryを独立させたまま1つのデスクトップ入口へ統合するHubです。

## 現在の段階

Phase 1では既存アプリを安全に起動するHub Shellとして動作します。

- Local AI Lab
- Game Dev Hub
- VReview
- Video Plugin Dev Hub

各アプリのRepository・Release・Project固有仕様は引き続き各RepositoryがSource of Truthです。

将来は各RepositoryにHub Module Adapterを追加し、個別exe起動からHub内Module表示へ段階移行します。

## 開発

```powershell
npm install
npm start
```

## 方針

- AI Hubは共通Electron Shell / Navigation / Settings / Storage integrationを担当する。
- Project固有機能は各Repositoryへ残す。
- Module間の共通ContractだけをAI Hubが所有する。
- AI SSDを利用できる場合は `D:\AI_SSD_CONSTITUTION.md` を確認し、SSD側Rule Routingに従う。
