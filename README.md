# みんパズ (MinPuzz) - 開発環境セットアップ

リアルタイム対戦ジグソーパズルゲームの開発プロジェクト

## 🚀 開発環境セットアップ

### 前提条件
- Node.js 22.18.0
- pnpm
- Docker & Docker Compose

### セットアップ手順

1. **依存関係のインストール**
   このステップをすることで `/frontend/node_modules` と `/backend/node_modules` に必要なライブラリ等をインストールできます
   これをしないとvscode上でエラーばっかり出ると思います！

   ```bash
   # フロントエンドの依存関係
   cd frontend && pnpm install
   
   # バックエンドの依存関係  
   cd ../backend && pnpm install
   ```

2. **環境変数の設定**
   kotekに.envファイルをふたつもらって、 frontend/ と backend/ に (`/frontend/.env`、`/backend/.env`となるように) 配置

3. **Supabase ローカル環境の起動**
   ```bash
   cd supabase
   pnpm install
   pnpm supabase start
   ```
   
4. **全サービス起動（Docker Compose）**
   ```bash
   # Redis + Frontend + Backend を一括起動
   docker-compose up --build
   ```

## 🌐 アクセスURL

- **フロントエンド**: http://localhost:3000
- **バックエンドAPI**: http://localhost:3001
- **Supabase API**: http://localhost:54321
- **Supabase Studio**: http://localhost:54323
- **PostgreSQL**: localhost:54322
- **Redis**: localhost:6379

## 🏗️ アーキテクチャ

### ローカル開発
- **フロント**: Next.js (Docker)
- **バック**: Express.js (Docker)
- **DB**: Supabase CLI (独立Docker)
- **Redis**: Docker Compose

### 本番環境
- **フロント**: Vercel
- **バック**: Render
- **DB**: Supabase Cloud
- **Redis**: Upstash

## 📂 プロジェクト構成

```
minpuzz/
├── frontend/           # Next.js フロントエンド
├── backend/            # Express.js バックエンド
├── supabase/           # Supabase設定・マイグレーション
├── docs/               # プロジェクトドキュメント
├── docker-compose.yml  # 開発環境（Redis + Frontend + Backend）
├── backend/.env.example # バックエンド環境変数の参考用の例
└── frontend/.env.example # フロントエンド環境変数の参考用の例
```

## 🔧 開発コマンド

```bash
# Supabase起動
cd supabase && supabase start

# 全サービス起動
docker-compose up -d

# ログ確認
docker-compose logs -f

# 特定サービスのログ
docker-compose logs -f frontend
docker-compose logs -f backend

# 全てのサービス停止
docker-compose down
cd supabase && supabase stop
```

## 📋 注意事項

- **Docker Compose**: Redis + Frontend + Backend を統合管理
- **Supabase**: CLI経由で独立管理（複雑さ回避）
- **環境変数**: 各サービスの.envファイルが必要
- **本番デプロイ**: 各サービス個別にCI/CD設定
- **ホットリロード**: ソースコード変更が自動反映
