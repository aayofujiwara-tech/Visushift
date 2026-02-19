# Visushift

検索キーワードに応じてUI全体のテーマが変わるPinterest風画像ブラウジングアプリ。

## ローカル開発

```
npm install
npm run dev
```

## Vercelデプロイ

1. このリポジトリをGitHubにpush
2. vercel.com にGitHubアカウントでログイン
3. 「New Project」→ このリポジトリを選択
4. Framework Preset: Vite（自動検出される）
5. 「Deploy」をクリック

## 環境変数（任意）

Unsplash APIを使う場合、Vercelのダッシュボードで以下を設定:
- `VITE_UNSPLASH_ACCESS_KEY`: UnsplashのAccess Key

設定しない場合はPicsum Photosがフォールバックとして使用されます。
