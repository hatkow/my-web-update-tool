# 🚀 初心者向け Vercel デプロイガイド

このガイドでは、一度も Vercel を使ったことがない方でも、ステップバイステップでアプリを公開できるように説明します。

---

## 📋 事前準備

以下のアカウントが必要です（すべて無料）：

1. **GitHub アカウント** - コードを保存する場所
2. **Vercel アカウント** - アプリを公開する場所
3. **Supabase アカウント** - データベースと認証

---

## ステップ 1️⃣：GitHub にコードをアップロード

### 1-1. GitHub アカウントを作成

まだ GitHub アカウントがない場合：

1. https://github.com にアクセス
2. 「Sign up」をクリック
3. メールアドレス、パスワード、ユーザー名を入力
4. メール認証を完了

### 1-2. 新しいリポジトリを作成

1. GitHub にログイン
2. 右上の「+」ボタン → 「New repository」をクリック
3. 設定：
   - **Repository name**: `web-update-support`
   - **Description**: ウェブサイト更新支援ツール
   - **Public** を選択（無料で使うため）
4. 「Create repository」をクリック

### 1-3. コードをアップロード

コマンドプロンプト（または PowerShell）を開き、以下を実行：

```bash
# プロジェクトフォルダに移動
cd "C:\Users\hator\Downloads\クエスト作業効率\自社サイト更新支援ツール\web-update-support"

# Git を初期化（まだの場合）
git init

# すべてのファイルを追加
git add .

# コミット
git commit -m "初回コミット"

# GitHub と接続
git branch -M main
git remote add origin https://github.com/あなたのユーザー名/web-update-support.git

# アップロード
git push -u origin main
```

> 💡 「あなたのユーザー名」の部分は、実際の GitHub ユーザー名に置き換えてください

---

## ステップ 2️⃣：Supabase を設定

### 2-1. Supabase アカウントを作成

1. https://supabase.com にアクセス
2. 「Start your project」をクリック
3. GitHub でログイン（推奨）

### 2-2. 新しいプロジェクトを作成

1. 「New project」をクリック
2. 設定：
   - **Name**: web-update-support
   - **Database Password**: 強力なパスワードを入力（メモしておく）
   - **Region**: Northeast Asia (Tokyo)
3. 「Create new project」をクリック
4. 2〜3 分待つ

### 2-3. データベースを設定

1. 左メニューの「SQL Editor」をクリック
2. 「New query」をクリック
3. `supabase/schema.sql` ファイルの内容をすべてコピー＆ペースト
4. 「Run」ボタンをクリック
5. 「Success」と表示されれば OK

### 2-4. API キーを取得

1. 左メニューの「Settings」→「API」をクリック
2. 以下をメモしておく：
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL` 用
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY` 用
   - **service_role** → `SUPABASE_SERVICE_ROLE_KEY` 用（⚠️ 絶対に公開しない）

---

## ステップ 3️⃣：Vercel でデプロイ

### 3-1. Vercel アカウントを作成

1. https://vercel.com にアクセス
2. 「Sign Up」をクリック
3. 「Continue with GitHub」を選択
4. GitHub 連携を許可

### 3-2. プロジェクトをインポート

1. Vercel ダッシュボードで「Add New...」→「Project」をクリック
2. 「Import Git Repository」で `web-update-support` を選択
3. 「Import」をクリック

### 3-3. 環境変数を設定

「Configure Project」画面で：

1. 「Environment Variables」セクションを開く
2. 以下の 4 つを追加：

| Name                            | Value                                                          |
| ------------------------------- | -------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | Supabase の Project URL                                        |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase の anon public キー                                   |
| `SUPABASE_SERVICE_ROLE_KEY`     | Supabase の service_role キー                                  |
| `ENCRYPTION_KEY`                | 任意の 32 文字の文字列（例：`mySecretEncryptionKey123456789`） |

3. 「Deploy」をクリック！

### 3-4. デプロイ完了！

2〜3 分後、以下のような URL が発行されます：

```
https://web-update-support-xxxxx.vercel.app
```

おめでとうございます！🎉 これでアプリが公開されました！

---

## ステップ 4️⃣：初期管理者を作成

### 4-1. Supabase で管理者ユーザーを作成

1. Supabase ダッシュボード → 「Authentication」→「Users」
2. 「Add user」→「Create new user」
3. メールアドレスとパスワードを入力
4. 作成されたユーザーの「UUID」をコピー

### 4-2. 管理者権限を付与

1. 「SQL Editor」に移動
2. 以下を実行（値は置き換え）：

```sql
SELECT create_admin_profile(
  'コピーしたUUID',
  'メールアドレス'
);
```

例：

```sql
SELECT create_admin_profile(
  'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  'admin@example.com'
);
```

---

## ✅ 完成！

これで準備完了です。

1. Vercel で発行された URL にアクセス
2. 設定したメールアドレスとパスワードでログイン
3. 管理者メニューからユーザーやプロジェクトを追加！

---

## ❓ よくある質問

### Q: デプロイに失敗した

環境変数が正しく設定されているか確認してください。特に：

- コピー時に余計なスペースが入っていないか
- キーの名前が完全に一致しているか

### Q: ログインできない

1. Supabase でユーザーが作成されているか確認
2. `create_admin_profile` を実行したか確認
3. パスワードが正しいか確認

### Q: 更新したコードを反映したい

GitHub にプッシュするだけで自動的に再デプロイされます：

```bash
git add .
git commit -m "変更内容"
git push
```
