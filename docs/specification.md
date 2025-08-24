# みんなでパズル (みんパズ) プロジェクト仕様書

## 概要

みんパズはリアルタイムのチーム制対戦Webゲームの開発プロジェクト。  
ゲーム内容は複数人で完成させるリアルタイムジグゾーパズルだが、詳細は未定。

## 機能要件

### ユーザーフロー

1. **ホーム画面**
   - チーム作成 または チーム参加 を選択

2. **チーム作成**
   - チーム待機画面に移動
   - チーム番号が表示される
   - メンバーの参加を待機

3. **チーム参加**
   - チーム番号入力画面
   - 番号入力後、該当チームの待機画面に移動

4. **チーム待機画面**
   - チームメンバーが集合
   - 人数が揃うと対戦相手探索が可能
   - マッチング画面に移動

5. **マッチング画面**
   - 対戦相手チームを探索
   - マッチング成立でゲーム画面に移動

6. **ゲーム画面**
   - リアルタイムジグゾ―パズル
   - 詳細は未定 (随時追加)

## 技術スタック

### フロントエンド
- **フレームワーク**: Next.js (App Router)
- **リアルタイム通信**: Socket.io-client
- **言語**: TypeScript

### バックエンド
- **フレームワーク**: Node.js + Express.js
- **リアルタイム通信**: Socket.io
- **ORM**: Prisma
- **言語**: TypeScript

### データベース・インフラ
- **状態管理**: Upstash Redis
- **RDB**: Supabase PostgreSQL (ローカル開発にSupabase CLIを利用)

## プロジェクト構成

```
project-root/
├── frontend/            # Next.js アプリケーション
├── backend/             # Express.js サーバー
│   ├── src/
│   │   ├── routes/      # API ルート
│   │   ├── controller/  # API コントローラー
│   │   ├── model/       # データモデル
│   │   ├── shared/      # 共有ユーティリティ・Redis
│   │   ├── socket/      # Socket.io ハンドラー
│   │   ├── generated/   # Prisma生成ファイル
│   │   └── middlewares.ts
│   └── prisma/          # Prisma設定・スキーマ（未作成）
├── supabase/            # Supabaseローカル開発環境
│   └── supabase/
│       └── config.toml  # Supabase設定
└── docs/
    ├── specification.md # 本仕様書
    ├── architecture.mmd # アーキテクチャ図
    ├── sequence-home-to-team.mmd # シーケンス図
    └── typescript/      # TypeScript開発ガイド
        └── fp.md        # 関数型プログラミングガイド
```

## デプロイ・運用

### 本番環境
- **フロントエンド**: Vercel
- **バックエンド**: Render
- **Redis**: Upstash
- **PostgreSQL**: Supabase

### ローカル開発環境
- **データベース**: Supabase CLI（`supabase start`）
- **Redis**: ローカルRedis
- **フロントサーバー**: Next.js dev server
- **バックエンドサーバー**: Express.js dev server

### 開発フロー
1. Supabase migrations作成・適用
2. Prisma generate実行
3. アプリケーション開発
4. テスト・デプロイ

## CI/CD

### ワークフロー
1. **データベースマイグレーション**
   - Supabaseマイグレーション実行（ローカル→リモート）
   - Prismaスキーマ同期

2. **アプリケーションデプロイ**
   - フロントエンド: Vercel自動デプロイ
   - バックエンド: Render自動デプロイ

3. **環境設定管理**
   - 環境変数の適切な設定
   - 秘匿情報の安全な管理

## 主要設計要素

### リアルタイム通信
- WebSocketによるリアルタイム状態同期
- チーム状態、ゲーム進行、マッチング状況の即座反映

### 状態管理
- **Redis**: 一時的なゲーム状態、セッション管理（現在はMock実装）
- **PostgreSQL**: 永続化が必要なユーザー情報、ゲーム履歴（Prisma未設定）

### アーキテクチャパターン
- **関数型ドメインモデリング**: docs/typescript/fp.md参照
- **Result型エラーハンドリング**: neverthrowライブラリ使用
- **型安全性**: Zodバリデーション、TypeScript strict mode

## 今後の拡張性

### 機能拡張
- 複数ゲームモード対応
- ランキング・統計機能
- チャット機能
- 観戦機能
