# AI-DLC and Spec-Driven Development

Kiro-style Spec Driven Development implementation on AI-DLC (AI Development Life Cycle)

## Project Context

### Paths
- Steering: `.kiro/steering/`
- Specs: `.kiro/specs/`

### Steering vs Specification

**Steering** (`.kiro/steering/`) - Guide AI with project-wide rules and context
**Specs** (`.kiro/specs/`) - Formalize development process for individual features

### Active Specifications
- **teacher-assignment-system**: 入塾割当アシスタント - 講師の授業枠アサイン自動化システム
- **recurring-assignments**: 定期授業パターンシステム - 曜日ベースの授業パターン登録・自動展開機能
- Check `.kiro/specs/` for active specifications
- Use `/kiro:spec-status [feature-name]` to check progress

## Development Guidelines
- Think in English, generate responses in Japanese. All Markdown content written to project files (e.g., requirements.md, design.md, tasks.md, research.md, validation reports) MUST be written in the target language configured for this specification (see spec.json.language).

## Minimal Workflow
- Phase 0 (optional): `/kiro:steering`, `/kiro:steering-custom`
- Phase 1 (Specification):
  - `/kiro:spec-init "description"`
  - `/kiro:spec-requirements {feature}`
  - `/kiro:validate-gap {feature}` (optional: for existing codebase)
  - `/kiro:spec-design {feature} [-y]`
  - `/kiro:validate-design {feature}` (optional: design review)
  - `/kiro:spec-tasks {feature} [-y]`
- Phase 2 (Implementation): `/kiro:spec-impl {feature} [tasks]`
  - `/kiro:validate-impl {feature}` (optional: after implementation)
- Progress check: `/kiro:spec-status {feature}` (use anytime)

## Development Rules
- 3-phase approval workflow: Requirements → Design → Tasks → Implementation
- Human review required each phase; use `-y` only for intentional fast-track
- Keep steering current and verify alignment with `/kiro:spec-status`
- Follow the user's instructions precisely, and within that scope act autonomously: gather the necessary context and complete the requested work end-to-end in this run, asking questions only when essential information is missing or the instructions are critically ambiguous.

## Steering Configuration
- Load entire `.kiro/steering/` as project memory
- Default files: `product.md`, `tech.md`, `structure.md`
- Custom files are supported (managed via `/kiro:steering-custom`)

## Documentation
- **Location**: `docs/`
- **Database Documentation**: `docs/database/`
  - `schema.md`: データベーススキーマ全体像（テーブル、ER図、インデックス）
  - `migrations.md`: マイグレーション履歴とリファレンス
  - `rpc-functions.md`: RPC関数の詳細リファレンス
  - `sql-modification-guide.md`: SQL変更時の必須手順とチェックリスト
- **Architecture Documentation**: `docs/architecture/`
  - `project-structure.md`: プロジェクト構成、技術スタック、開発ワークフロー
- **Index**: `docs/README.md` - ドキュメントの全体像とクイックスタート

### Documentation Update Rules
- **CRITICAL**: SQLを変更したら必ずドキュメントを更新すること
  - `schema.md`: テーブル構造の変更を反映
  - `migrations.md`: 新しいマイグレーションを追加
  - `rpc-functions.md`: RPC関数の変更を反映
- Skills使用時は事前にドキュメントを参照し、変更後は必ず更新
- 新しい機能を追加したら`project-structure.md`を更新
