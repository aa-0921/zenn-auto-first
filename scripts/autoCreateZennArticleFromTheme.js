import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { ZennAIContentGenerator, buildZennArticleMarkdown } from "@aa-0921/zenn-auto-core";
import { pickRandomTheme } from "../config/zennArticleThemes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Zenn の GitHub 連携リポジトリとして、このスクリプトと同じリポジトリルートを使う
function resolveZennRepoPath() {
  return path.resolve(__dirname, "..");
}

function ensureArticlesDir(zennRepoPath) {
  const articlesDir = path.join(zennRepoPath, "articles");
  if (!fs.existsSync(articlesDir)) {
    fs.mkdirSync(articlesDir, { recursive: true });
  }
  return articlesDir;
}

function buildArticleFilename() {
  const now = new Date();
  const yyyy = String(now.getFullYear());
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  const hh = String(now.getHours()).padStart(2, "0");
  const mi = String(now.getMinutes()).padStart(2, "0");
  const rand = Math.random().toString(36).slice(2, 8);
  return `${yyyy}${mm}${dd}-${hh}${mi}-${rand}.md`;
}

function runGitCommand(cwd, command, args) {
  execFileSync(command, args, {
    cwd,
    stdio: "inherit"
  });
}

async function main() {
  // OpenRouter APIキーの存在チェックと余計な空白除去
  let apiKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY を設定してください（.env または環境変数）");
  }
  process.env.OPENROUTER_API_KEY = apiKey;
  const keyPreview =
    apiKey.length >= 6 ? `${apiKey.slice(0, 4)}...${apiKey.slice(-2)}` : "(短すぎ)";
  console.log(
    `[DEBUG] OPENROUTER_API_KEY: 設定済み 長さ=${apiKey.length} プレビュー=${keyPreview}`
  );

  const zennRepoPath = resolveZennRepoPath();

  if (!fs.existsSync(zennRepoPath)) {
    console.error(
      `[ERROR] Zenn リポジトリが見つかりませんでした: ${zennRepoPath}\nZENN_REPO_PATH を .env で設定し、事前にリポジトリをクローンしてください。`
    );
    process.exit(1);
  }

  // 1. 最新化（pull）
  try {
    console.log("[INFO] git pull を実行します...");
    runGitCommand(zennRepoPath, "git", ["pull", "--ff-only"]);
  } catch (err) {
    console.warn("[WARN] git pull に失敗しましたが処理を継続します:", err.message);
  }

  // 2. テーマから AI で記事生成（駆け出し向けテーマ配列からランダムに 1 件取得）
  const defaultDetail =
    "駆け出しエンジニアが理解しやすいよう、具体例ベースで解説してください。";
  const picked = pickRandomTheme();
  const theme = picked.theme;
  const detail = picked.detail ?? defaultDetail;
  console.log("[INFO] テーマをランダムに選択しました:", theme);

  const generator = new ZennAIContentGenerator({});
  console.log("[INFO] AI による Zenn 記事生成を開始します...");
  const { title, body, topics } = await generator.generateArticleForZennFromTheme({
    theme,
    detail
  });

  const publishedEnv = process.env.ZENN_PUBLISHED;
  const published =
    publishedEnv == null ? true : String(publishedEnv).toLowerCase() === "true";
  const markdown = buildZennArticleMarkdown({
    title,
    body,
    topics,
    emoji: "📝",
    published
  });

  const articlesDir = ensureArticlesDir(zennRepoPath);
  const filename = buildArticleFilename();
  const filePath = path.join(articlesDir, filename);

  fs.writeFileSync(filePath, markdown, "utf8");

  console.log(`[INFO] Zenn 記事ファイルを生成しました: ${filePath}`);

  // 4. git add / commit / push
  try {
    console.log("[INFO] git add を実行します...");
    runGitCommand(zennRepoPath, "git", ["add", path.relative(zennRepoPath, filePath)]);

    const commitMessage = `chore: add zenn article ${filename}`;
    console.log("[INFO] git commit を実行します...");
    runGitCommand(zennRepoPath, "git", ["commit", "-m", commitMessage]);

    console.log("[INFO] git push を実行します...");
    runGitCommand(zennRepoPath, "git", ["push"]);
    console.log("[INFO] git push まで完了しました。Zenn 側の同期をお待ちください。");
  } catch (err) {
    console.error("[ERROR] git add/commit/push のいずれかで失敗しました。手動で確認してください。");
    console.error(err.message);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("[FATAL] スクリプト実行中にエラーが発生しました:", err);
  process.exit(1);
});
