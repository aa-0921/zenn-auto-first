# zenn-auto-first

Zenn の GitHub 連携リポジトリ（このリポジトリ）に対して、AI 生成した技術記事を自動で追加・コミット・プッシュするためのスクリプト群です。

## ローカル実行

```bash
node scripts/autoCreateZennArticleFromTheme.js
```

`.env` に `OPENROUTER_API_KEY` を設定してください（`.env.example` 参照）。

## GitHub Actions（一日1回の自動投稿）

`.github/workflows/auto-create-zenn-article.yml` で、一日1回（JST 9:00 頃）記事を自動生成・push します。手動実行は Actions タブから「Auto Create Zenn Article」→ Run workflow で可能です。手動実行時は記事タイプ（random / listicle / theme）を選べます。

生成した記事は `published: false` で追加され、`gradual-publish.yml` が一日1回（JST 10:00 頃）ファイル名の古い順に1件だけ `published: true` へ書き換えます。

### 生成ペースを増やしてはいけない

Zenn は連携リポジトリの記事を**一日1件ほどのペースでしか公開しません**（`published: true` にしても即座には反映されず、古い順に順番待ちになります）。

生成を一日2件にすると、公開が追いつかず未反映の記事が毎日1件ずつ積み上がります。実際に 2026/08 時点で未公開 121 件・Zenn 未反映 23 件まで溜まり、記事の書き方を変えても実際に読者に届くのが3週間後、という状態になりました（いずれも削除して解消済み）。

生成1件/日・公開1件/日の釣り合いを崩さないでください。

### 必要な GitHub Secrets

| Secret 名 | 説明 |
|-----------|------|
| `OPENROUTER_API_KEY` | OpenRouter API キー（記事生成に必須） |
| `CORE_REPO_TOKEN` | private リポジトリ `aa-0921/zenn-auto-core` を checkout するための Personal Access Token（repo スコープ） |
