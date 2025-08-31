# みんパズを自分で好きにいじって自分でデプロイする方法
## 1. Fork
現在みんパズは kotek のリポジトリとして GitHub に登録されています。 このままでは色々とやりにくいと思うのでまずはこのリポジトリを **fork** することで自分のリポジトリとしてコピーします。
### 1.1 フォークする
https://github.com/kotek-7/minpuzz の "Fork" ボタンを押して下さい。あとは案内の通りに進めれば自分のリポジトリとして新しく minpuzz がコピーされます。
### 1.2 クローンする
新しくフォークした自分のリポジトリをローカルにクローンしましょう。
```
git clone https://github.com/<GitHubのユーザ名>/minpuzz
```
注意点として、もともとのみんパズと同じディレクトリに配置してしまうとディレクトリ名が被ってしまうので気を付けましょう。
### 1.3 .envを配置
kotek が discord に配布した Google Drive の共有リンクから .env ファイルの内容を2つコピーしてそれぞれのファイル内に記述されている場所に配置してください
### 1.4 完了！
フォークが完了すれば新しいリポジトリは自分のものなので、 main ブランチにも好きにコミットを push できます。
ローカルでみんぱずを起動するには README.md を参照してください。

## 2. Deploy
みんパズは3つの場所をデプロイ先にしています。
- フロントエンド: [Vercel](https://vercel.com)
- バックエンド: [Render](https://render.com)
- Redis (データベース): [Upstash](https://upstash.com)

新しくフォークされたみんぱずをそれぞれの場所にデプロイしていきましょう。
### 2.1 Vercel
1. https://vercel.com/new にアクセスします。
2. ログインしていない場合はログイン/サインインします。 (GitHub の連携も必要です)
3. "import git repository" からフォークした minpuzz リポジトリを選択します。
4. Root Directory を frontend に変更し、Environment Variable には以下を入力します。
```
# ポート番号
PORT=3000

# フロントエンドの実行環境
NODE_ENV=production

# ファイル監視の設定（Docker環境でのホットリロード用）
WATCHPACK_POLLING=true

# バックエンドAPI URL (この後変更)
NEXT_PUBLIC_API_URL=http://localhost:3001

NEXT_PUBLIC_API_MODE=real
```
5. Deploy を押します。デプロイが始まって成功すれば URL が表示されます！
### 2.2 Render
1. https://dashboard.render.com/web/new にアクセスします
2. ログインしていない場合はログイン/サインインします。 (GitHub の連携も必要です)
3. リストからみんパズのリポジトリを選択します。
4. Root Directory を backend に変更し、Environment Variables には以下を入力します。
```
# ポート番号
PORT=3001

# 実行環境（development | production）
NODE_ENV=production

# CORS許可オリジン (この後変更)
CORS_ORIGIN=http://localhost:3000

# Redis接続URL (この後変更)
REDIS_URL=redis://redis:6379
```
5. Deploy Web Service を押します。デプロイが始まって成功すれば URL が表示されます！
### 2.3 Upstash
1. https://console.upstash.com にアクセスします。
2. ログインしていない場合はログイン/サインインします。
3. https://console.upstash.com/redis にアクセスして Create Database を選択します。
4. Region は AP-NORTH-EAST-1 (Japan) で、TLS (SSL) を有効にして、 Create を押します。
5. データベースが作成されます。
### 2.4 環境変数の設定
デプロイされた URL を使って再度各サービスの環境変数を設定します。
#### 2.4.5 Vercel
1. Render のプロジェクトページに移動します。
2. デプロイ URL をコピーします。 (https://〇〇.onrender.com という形式)
3. Vercel のプロジェクトページに移動します。
4. 上の Settings タブを開き、 Environment Variables タブを開いて、 下の方から NEXT_PUBLIC_API_URL の Value を さっきの Render の URL に設定して保存します。
#### 2.4.6 Render
1. Vercel のプロジェクトページに移動します。
2. デプロイ URL をコピーしてメモします。 (https://〇〇.vercel.app という形式)
3. Upstash のプロジェクトページに移動します。
4. Details タブを開き、 Endpoint のところにカーソルを持っていくと `□ TCP □ HTTPS` みたいに表示されると思うので、 □ TCP をクリックして　URL をコピーしてメモします。 (rediss://default:××××@〇〇.upstash.io:6379 という形式)
5. Render のプロジェクトぺージに移動します。
6. 左の Environment タブを開き、 Edit ボタンを押して CORS_ORIGIN をさっきの Vercel のデプロイ URL に、 REDIS_URL をさっきの Upstash のデプロイ URL に設定して保存します。 (**CORS_ORIGIN は末尾の "/" は必ず消して設定してください！！！ (https://〇〇.vercel.app という形式)**)

## 3. 完成
Vercel, Render のデプロイが完了していることを確認してから、Vercel のデプロイ URL にアクセスして、 ちゃんと動けば成功です。おめでとうございます！  
あとは自分のリポジトリですから煮るなり焼くなり好きにしてください🔥