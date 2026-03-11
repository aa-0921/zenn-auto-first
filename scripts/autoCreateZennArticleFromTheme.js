import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { ZennAIContentGenerator, buildZennArticleMarkdown } from "@aa-0921/zenn-auto-core";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolveZennRepoPath() {
  const envPath = process.env.ZENN_REPO_PATH || "./zenn-repo";
  return path.resolve(__dirname, "..", envPath);
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

  // 2. テーマから AI で記事生成
  const theme = process.env.ZENN_THEME || "TypeScript 初心者向けの型の基本とつまずきポイント";
  const detail =
    process.env.ZENN_THEME_DETAIL ||
    "駆け出しエンジニアが型定義や any の扱いでつまずきやすいポイントを中心に、具体例ベースで解説してください。";

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
  }
}

main().catch((err) => {
  console.error("[FATAL] スクリプト実行中にエラーが発生しました:", err);
  process.exit(1);
});
