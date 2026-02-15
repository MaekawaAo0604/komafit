# KomaFit - 入塾割当アシスタント

講師の授業枠アサイン自動化システム

## 概要

入塾・時間割調整時の担当講師アサインを自動化し、Excel/スプレッドシート運用の事故（手作業ミス、属人化、監査不可）を防ぐシステムです。

### 主な機能

- **講師推薦エンジン**: ハード制約とソフト条件に基づく最適な講師の推薦
- **ロールベースアクセス制御**: 管理者・講師・閲覧の3つのロール
- **監査ログ**: 全ての割当変更を記録し、追跡可能
- **Undo機能**: 誤操作からの即座の復旧
- **CSV入出力**: データのインポート・エクスポートをサポート

## 技術スタック

### Frontend
- **React 18** + **TypeScript 5**: モダンなUI構築
- **Redux Toolkit**: 状態管理
- **Material-UI (MUI)**: UIコンポーネント
- **Vite**: 高速ビルドツール

### Backend
- **Supabase**: BaaS（PostgreSQL, Auth, Storage, Edge Functions）
- **PostgreSQL 15**: ACID準拠のデータベース
- **Row Level Security (RLS)**: データベースレベルの権限制御

## セットアップ

### 必要要件

- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker Desktop (ローカルSupabase用)

### インストール

1. 依存関係をインストール:
```bash
npm install
```

2. 環境変数を設定:
```bash
cp .env.example .env
# .env ファイルを編集してSupabaseの認証情報を記入
```

3. Supabaseをローカルで起動:
```bash
npm run supabase:start
```

4. 開発サーバーを起動:
```bash
npm run dev
```

アプリケーションは http://localhost:3000 で起動します。

## 開発

### コマンド

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# テスト実行
npm test

# テスト（UIモード）
npm run test:ui

# カバレッジ確認
npm run test:coverage

# Lint
npm run lint

# フォーマット
npm run format

# Supabase操作
npm run supabase:start    # Supabase起動
npm run supabase:stop     # Supabase停止
npm run supabase:reset    # データベースリセット
npm run supabase:migrate  # マイグレーション実行
```

### ディレクトリ構造

```
KomaFit/
├── src/                  # フロントエンドソースコード
│   ├── components/       # Reactコンポーネント
│   ├── services/         # API層、推薦エンジン
│   ├── types/            # TypeScript型定義
│   ├── store/            # Redux store
│   ├── pages/            # ページコンポーネント
│   ├── utils/            # ユーティリティ関数
│   └── lib/              # ライブラリ初期化
├── supabase/             # Supabaseプロジェクト
│   ├── migrations/       # データベースマイグレーション
│   ├── functions/        # Edge Functions
│   └── seed/             # シードデータ
├── tests/                # テスト
│   ├── unit/             # ユニットテスト
│   ├── integration/      # 統合テスト
│   └── e2e/              # E2Eテスト
└── .kiro/                # Kiro仕様ドキュメント
    └── specs/
        └── teacher-assignment-system/
            ├── requirements.md
            ├── design.md
            └── tasks.md
```

## テスト

このプロジェクトはテスト駆動開発（TDD）アプローチで構築されています。

```bash
# すべてのテストを実行
npm test

# 特定のテストを実行
npm test -- src/services/recommendationEngine.test.ts

# ウォッチモード
npm test -- --watch

# カバレッジレポート
npm run test:coverage
```

## 仕様ドキュメント

詳細な仕様は `.kiro/specs/teacher-assignment-system/` ディレクトリを参照してください：

- [requirements.md](.kiro/specs/teacher-assignment-system/requirements.md) - 機能要件
- [design.md](.kiro/specs/teacher-assignment-system/design.md) - 技術設計
- [tasks.md](.kiro/specs/teacher-assignment-system/tasks.md) - 実装タスク

## ライセンス

Private - All Rights Reserved
