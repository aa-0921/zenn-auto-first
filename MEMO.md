# zenn-auto-first

Zenn の GitHub 連携リポジトリ（このリポジトリ）に対して、AI 生成した技術記事を自動で追加・コミット・プッシュするためのスクリプト群です。

## ローカル実行

```bash
node scripts/autoCreateZennArticleFromTheme.js
```

`.env` に `OPENROUTER_API_KEY` を設定してください（`.env.example` 参照）。

## GitHub Actions（一日2回の自動投稿）

`.github/workflows/auto-create-zenn-article.yml` で、一日2回（JST 9:00, 21:00 頃）記事を自動生成・push します。手動実行は Actions タブから「Auto Create Zenn Article」→ Run workflow で可能です。

### 必要な GitHub Secrets

| Secret 名 | 説明 |
|-----------|------|
| `OPENROUTER_API_KEY` | OpenRouter API キー（記事生成に必須） |
| `CORE_REPO_TOKEN` | private リポジトリ `aa-0921/zenn-auto-core` を checkout するための Personal Access Token（repo スコープ） |
