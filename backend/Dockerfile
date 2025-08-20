# Node.js 22.18.0ベースイメージ
FROM node:22.18.0-alpine AS base

# 依存関係のインストール（必要な場合のみ）
FROM base AS deps
# libc6-compatが必要な理由については以下を参照：
# https://github.com/nodejs/docker-node/tree/b4117f9333da4138b03a546ec926ef50a31506c3#nodealpine
RUN apk add --no-cache libc6-compat

WORKDIR /app

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# パッケージマネージャーに基づく依存関係のインストール
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile

# ソースコードの再ビルド（必要な場合のみ）
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# pnpmのインストール
RUN corepack enable && corepack prepare pnpm@latest --activate

# 型チェックとアプリケーションビルド
RUN pnpm run typecheck
RUN pnpm run build

# 本番環境用イメージ、すべてのファイルをコピーしてアプリを実行
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 backend

# ビルド済みアプリケーションのコピー
COPY --from=builder --chown=backend:nodejs /app/dist ./dist
COPY --from=builder --chown=backend:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=backend:nodejs /app/package.json ./package.json

USER backend

EXPOSE 3001

ENV PORT=3001

# アプリケーションの開始
CMD ["pnpm", "start"]