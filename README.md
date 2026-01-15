# ウェブサイト更新支援ツール

顧客が簡単にウェブサイトを更新できる CMS（コンテンツ管理システム）です。

## 機能

- 🔐 **認証システム**: Supabase Auth によるセキュアなログイン
- 👥 **ユーザー管理**: 管理者によるユーザーの追加・削除
- 📁 **プロジェクト管理**: FTP 設定の登録とユーザーへの割り当て
- ✏️ **コンテンツ編集**: ブラウザ上で HTML ファイルを直接編集
- 🔒 **FTP パスワード暗号化**: セキュアなパスワード保存

## 技術スタック

- **フロントエンド**: Next.js 14 (App Router) + TypeScript
- **スタイリング**: Tailwind CSS
- **認証・DB**: Supabase (Auth + PostgreSQL)
- **FTP 接続**: basic-ftp
- **デプロイ**: Vercel

## セットアップ

### 1. Supabase プロジェクトの作成

1. [Supabase](https://supabase.com/)でプロジェクトを作成
2. SQL Editor で `supabase/schema.sql` を実行

### 2. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成:

```bash
cp .env.local.example .env.local
```

以下の値を設定:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key
ENCRYPTION_KEY=your-32-character-encryption-key
```

### 3. 初期管理者ユーザーの作成

1. Supabase Auth でユーザーを作成
2. SQL Editor で以下を実行:

```sql
SELECT create_admin_profile('ユーザーのUUID', 'メールアドレス');
```

### 4. 開発サーバーの起動

```bash
npm install
npm run dev
```

`http://localhost:3000` にアクセス

## Vercel へのデプロイ

### 1. GitHub にプッシュ

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Vercel でプロジェクトをインポート

1. [Vercel](https://vercel.com/)にログイン
2. 「New Project」→ GitHub リポジトリを選択
3. 環境変数を設定（Settings → Environment Variables）
4. 「Deploy」をクリック

### 3. 完了！

デプロイ後、`https://your-project.vercel.app` でアクセス可能になります。

## 使い方

### 管理者

1. `/admin/users` でユーザーを作成
2. `/admin/projects` で FTP 設定を登録
3. プロジェクトをユーザーに割り当て

### 作業者

1. ログイン
2. ダッシュボードでプロジェクトを選択
3. ファイルを編集
4. 「サイトに反映」をクリック

## ライセンス

MIT
