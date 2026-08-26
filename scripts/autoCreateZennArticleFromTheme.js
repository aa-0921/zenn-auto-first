import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { ZennAIContentGenerator, buildZennArticleMarkdown, validateZennMarkdown } from "@aa-0921/zenn-auto-core";
import {
  pickRandomTheme,
  LISTICLE_TOPICS,
  LISTICLE_SYSTEM_PROMPT,
  LISTICLE_PROMPT_TEMPLATE,
} from "../config/zennArticleThemes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * 記事タイプの出現比率
 * 「〇〇10選」系（リスト記事）が最も伸びた実績があるため主力にし、残りを通常テーマに割り振る
 */
const LISTICLE_RATE = 0.7;

const ARTICLE_TYPE_LABELS = {
  listicle: "〇〇10選（リスト記事）",
  theme: "技術テーマ（駆け出しエンジニア向け）",
};

/**
 * 記事タイプを決める
 *
 * 通常は上の比率に従ってランダムに選ぶが、環境変数 ARTICLE_TYPE でタイプを固定できる
 * （GitHub Actions の手動実行で、狙ったタイプの記事を動作確認するため）
 */
function pickArticleType() {
  const forced = process.env.ARTICLE_TYPE?.trim();
  if (forced && forced !== "random") {
    if (!ARTICLE_TYPE_LABELS[forced]) {
      throw new Error(
        `ARTICLE_TYPE の値が不正です: ${forced}（指定できるのは random / ${Object.keys(ARTICLE_TYPE_LABELS).join(" / ")}）`
      );
    }
    console.log("[INFO] ARTICLE_TYPE の指定によりタイプを固定します");
    return forced;
  }

  return Math.random() < LISTICLE_RATE ? "listicle" : "theme";
}

/**
 * リスト記事の項目数が指定個数に足りているか確認し、不足していれば警告ログを出す
 *
 * 「10 選」というタイトルなのに項目が数個しかない記事も生成されうるため、
 * 投稿は止めずに実態をログで追えるようにする。
 */
function warnIfListicleItemsMissing(title, body) {
  // 「10 選」「7選」などから期待個数を取る
  const expected = Number(title.match(/(\d+)\s*選/)?.[1] ?? 0);
  if (!expected) {
    console.log(
      "[WARN] 項目数チェック: タイトルから個数を判定できません（「〇〇10選」形式になっていない可能性）"
    );
    return;
  }

  // ### 以下の小見出しは数えない。「まとめ」などの締めの見出しは項目に含めない
  const headings = body.match(/^##[^#].*$/gm) || [];
  const itemCount = headings.filter((h) => !/まとめ|おわりに|終わりに|最後に/.test(h)).length;

  if (itemCount < expected) {
    console.log(`[WARN] 項目数チェック: 不足（期待 ${expected} 個 / 実際 ${itemCount} 個）`);
  } else {
    console.log(`[OK] 項目数チェック: 期待 ${expected} 個 / 実際 ${itemCount} 個`);
  }
}

// 2つ目の見出し直前（または末尾）に挿入する自己紹介・宣伝ブロック
const ARTICLE_PROMOTION_BLOCK = `
✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨

https://www.youtube.com/@tech-trend-zunda-metan/featured

最新ツール・トレンド情報をずんだもん×めたんが解説するYouTubeチャンネルを運営しています！
いいね、チャンネル登録してもらえると嬉しいです🙇‍♂️

---

ハジメル.dev: https://hajimeru-dev.vercel.app/

「ひとりで続けるのは難しい」「何から学べばいいか分からない」という方向けに、
プログラミングのマンツーマンレッスンサービス「ハジメル.dev」も運営しています。
未経験OK・オンライン完結・月額制/違約金なしなので、気軽に無料相談してみてください🙇‍♂️

---

海外テックニュースを追いたいけど、英語や情報量の多さで大変…という方向けに、
Hacker News の話題を日本語でサクッと追える「HackerNews 日本語まとめ & AI要約」 
を個人開発しました！
技術トレンド収集に使ってもらえると嬉しいです🔥🙇‍♂️
→ HackerNews 日本語まとめ & AI要約: https://hn-matome-2ht.pages.dev/


---

https://unityroom.com/games/nyampire_survivors

「ニャンパイアサバイバー」というヴァンパイアサバイバーリスペクトのゲームを作成しました！
もしよろしければ遊んで頂けると嬉しいです😭

---

習い事教室の先生向けに、SNS 投稿・生徒募集・保護者通知の文章を AI で生成する Web サービス「おしらせAI」を個人開発しました。Next.js + Supabase + LLM で構成しており、無料で月 10 回まで試用できます。よければ触ってみてください。

→ おしらせAI: https://oshirase-ai.vercel.app/

---

言いたいことがうまく伝わらない…という方向けに、会話の言い方を添削する「伝え方ラボ」を開発中です。
場面を選んで自分の言葉で返すと、何が伝わっていないかの指摘と、そのまま使える言い換えが返ってきます。
ChatGPT に相談すると褒めから入って直すべきところが残りがちなので、指摘側に振り切りました。
現在は公開時にお知らせするメール登録のみ受付中です🙇‍♂️

→ 伝え方ラボ: https://tsutaekata-lab.pages.dev/

✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨✨
`.trim();

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

function insertFooterBeforeSecondHeading(body, footer) {
  const lines = body.split("\n");
  let headingCount = 0;

  for (let i = 0; i < lines.length; i += 1) {
    if (/^#/.test(lines[i])) {
      headingCount += 1;
      if (headingCount === 2) {
        const before = lines.slice(0, i).join("\n").trimEnd();
        const after = lines.slice(i).join("\n").trimStart();
        return `${before}\n\n${footer}\n\n${after}`.trim();
      }
    }
  }

  return `${body.trimEnd()}\n\n${footer}`;
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

  // 2. 記事タイプを決めて AI で記事生成（70% がリスト記事、残りが通常の技術テーマ）
  const articleType = pickArticleType();
  console.log("[INFO] 記事タイプ:", ARTICLE_TYPE_LABELS[articleType]);

  let title, body, topics;
  if (articleType === "listicle") {
    const topic = pickRandomTheme(LISTICLE_TOPICS);
    console.log("[INFO] トピックをランダムに選択しました:", topic);

    // リスト記事は 3000〜4500 文字と長いため、既定の 4096 トークンでは途中で打ち切られる
    const generator = new ZennAIContentGenerator({ maxTokens: 8192 });
    console.log("[INFO] AI による Zenn 記事生成を開始します...");
    ({ title, body, topics } = await generator.generateArticleFromPrompt({
      systemPrompt: LISTICLE_SYSTEM_PROMPT,
      userMessage: LISTICLE_PROMPT_TEMPLATE.replaceAll("{{topic}}", topic),
      fallbackTitle: topic
    }));

    // 「10 選」と書いてあるのに項目が足りないことがあるため、書き込み前に確認する
    warnIfListicleItemsMissing(title, body);
  } else {
    const defaultDetail =
      "駆け出しエンジニアが理解しやすいよう、具体例ベースで解説してください。";
    const picked = pickRandomTheme();
    const theme = picked.theme;
    const detail = picked.detail ?? defaultDetail;
    console.log("[INFO] テーマをランダムに選択しました:", theme);

    const generator = new ZennAIContentGenerator({});
    console.log("[INFO] AI による Zenn 記事生成を開始します...");
    ({ title, body, topics } = await generator.generateArticleForZennFromTheme({
      theme,
      detail
    }));
  }

  const bodyWithPromotionBlock = insertFooterBeforeSecondHeading(body, ARTICLE_PROMOTION_BLOCK);

  const publishedEnv = process.env.ZENN_PUBLISHED;
  const published =
    publishedEnv == null ? true : String(publishedEnv).toLowerCase() === "true";
  const markdown = buildZennArticleMarkdown({
    title,
    body: bodyWithPromotionBlock,
    topics,
    emoji: "📝",
    published
  });

  const articlesDir = ensureArticlesDir(zennRepoPath);
  const filename = buildArticleFilename();
  const filePath = path.join(articlesDir, filename);

  // FrontMatter の構造を検証してから書き込む（混入バグを早期検出）
  try {
    validateZennMarkdown(markdown);
  } catch (err) {
    console.error(`[ERROR] 生成した Markdown の FrontMatter が不正です: ${err.message}`);
    console.error("[ERROR] ファイルの書き込みを中断しました。生成内容を確認してください。");
    process.exit(1);
  }

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
