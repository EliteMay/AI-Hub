# AI Hub Module Contract

Version: 0.1

## 目的

各Repositoryを独立させたままAI Hubへ統合するための最小Contract。

## Current Mode: external-exe

Phase 1ではAI Hub側の `config/modules.json` が次を管理する。

- id
- name
- description
- repository
- mode
- executablePath

Rendererから任意Pathを指定して起動することは禁止する。RendererはModule IDだけをMain Processへ渡し、Main ProcessがRegistryから実Pathを解決する。

## Future Mode: hub-renderer

各Repositoryが将来Hub向けBuild Artifactを提供する場合、次をVersioned Contractとして追加する。

- Module manifest schema version
- Hub API compatibility version
- Renderer entry point
- Required capabilities
- Storage scopes
- Migration requirements
- Validation result

## Ownership

AI Hubが所有するもの:

- Hub Shell
- Navigation
- Common Settings
- Common Storage routing
- Module discovery / lifecycle
- Shared diagnostics
- Module Contract

各Repositoryが所有するもの:

- Product-specific requirements
- Product-specific UI / logic
- Product-specific tests
- Product-specific release compatibility

Hubへの統合を理由にProject固有仕様をAI Hubへコピーしない。
