/**
 * Zenn 記事のテーマ一覧（駆け出しエンジニアが気になる内容）
 * qiita-auto-first/config/articleTheme.js の TECHNOLOGIES / KEYWORDS / MOTIVATION_TOPICS を参考に定義。
 * 配列からランダムに 1 件選んで記事生成に使う。
 *
 * 各要素: { theme: string, detail?: string }
 */

export const ZENN_ARTICLE_THEMES = [
  {
    theme: "TypeScript 初心者向けの型の基本とつまずきポイント",
    detail:
      "駆け出しエンジニアが型定義や any の扱いでつまずきやすいポイントを中心に、具体例ベースで解説してください。",
  },
  {
    theme: "React でよくあるエラーと対処法",
    detail:
      "useEffect の依存配列や再レンダー、キーの付け忘れなど、現場でよく遭遇するエラーと解決のコツを具体例で解説してください。",
  },
  {
    theme: "Git の基本と現場でよく使うコマンド",
    detail:
      "clone / pull / branch / commit / push の流れと、コンフリクト時の対処など、駆け出しが押さえておくべきポイントを解説してください。",
  },
  {
    theme: "SQL の基礎とよく書くクエリ",
    detail:
      "SELECT / WHERE / JOIN の基本と、集計・サブクエリなど、実務でよく使うパターンを具体例で解説してください。",
  },
  {
    theme: "Next.js 入門とつまずきがちなポイント",
    detail:
      "App Router と Pages Router の違い、サーバーコンポーネントとクライアントコンポーネントなど、初心者が混乱しやすい点を整理して解説してください。",
  },
  {
    theme: "JavaScript の非同期処理（Promise / async await）入門",
    detail:
      "コールバック地獄からの脱却、then と async/await の使い分け、エラーハンドリングの基本を具体例で解説してください。",
  },
  {
    theme: "Docker 入門と開発環境の立て方",
    detail:
      "イメージとコンテナの違い、docker-compose の基本、ローカル開発で Docker を使うメリットを駆け出し向けに解説してください。",
  },
  {
    theme: "コードレビューで学んだこととメンタルの保ち方",
    detail:
      "指摘の受け止め方、質問の仕方、レビューを成長の機会にするコツを、体験談を交えて解説してください。",
  },
  {
    theme: "駆け出しエンジニア時代に効いた学習法",
    detail:
      "インプットとアウトプットのバランス、ドキュメントの読み方、写経や個人開発の活かし方など、実体験に基づいて解説してください。",
  },
  {
    theme: "Rails でよくあるエラーとデバッグのコツ",
    detail:
      "ルーティング・マイグレーション・N+1 など、初心者がハマりやすいポイントと対処法を具体例で解説してください。",
  },
  {
    theme: "Tailwind CSS の基本とよく使うユーティリティ",
    detail:
      "クラス名の考え方、レスポンシブの書き方、カスタム設定の入口など、実務で使う範囲を中心に解説してください。",
  },
  {
    theme: "20代後半・30代からエンジニアを目指して良かったこと",
    detail:
      "転職やキャリアチェンジの体験、学習の進め方、現場で感じた手応えなどを、等身大の体験談で解説してください。",
  },
  {
    theme: "AI ツール（Claude Code など）を開発に取り入れるコツ",
    detail:
      "頼りすぎないバランス、聞き方のコツ、コードを自分で書く部分との使い分けを、駆け出し目線で解説してください。",
  },
  {
    theme: "VS Code で入れておきたい拡張機能と設定",
    detail:
      "開発効率が上がる拡張機能、キーバインド、設定の共有方法など、駆け出しが押さえておくとよいポイントを解説してください。",
  },
  {
    theme: "REST API の基本とフロントから叩くまでの流れ",
    detail:
      "HTTP メソッドとステータスコード、JSON のやり取り、fetch や axios での呼び出し例を、初心者向けに解説してください。",
  },
];

/**
 * 配列からランダムに 1 件選ぶ（qiita-auto-core の pickRandom と同様）
 * @param {Array<{ theme: string, detail?: string }>} themes
 * @returns {{ theme: string, detail?: string }}
 */
export function pickRandomTheme(themes) {
  if (!Array.isArray(themes) || themes.length === 0) {
    throw new Error("pickRandomTheme: テーマ配列が空です");
  }
  return themes[Math.floor(Math.random() * themes.length)];
}
