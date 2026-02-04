/**
 * 類似度スコア（0-100）の段階的カラーリング仕様
 * スコア表示箇所すべてで共通利用する。
 *
 * レンジ:
 * - 79以下: 赤
 * - 80-84: 薄い赤
 * - 85-89: 黄色
 * - 90-93: 薄い緑
 * - 94-96: 中間の緑
 * - 97-100: 濃い緑
 * - null/undefined/NaN: ニュートラル（グレー）、表示は「-」
 */

export type ScoreDisplayResult = {
  /** 表示用ラベル（数値または "-"） */
  label: string;
  /** 文字色用 className */
  textClassName: string;
  /** バー背景色用 className（プログレスバー等） */
  barClassName: string;
  /** Badge 用の border + 文字色 className（outline Badge 用） */
  badgeClassName: string;
  /** スコアが有効な数値か（null/undefined/NaN で false） */
  hasScore: boolean;
};

const NEUTRAL_TEXT = "text-muted-foreground";
const NEUTRAL_BAR = "bg-transparent";
const NEUTRAL_BADGE = "border-muted-foreground/30 text-muted-foreground";

/** 有効なスコア値かどうか（0-100 の数値のみ有効） */
function isValidScore(score: number | null | undefined): score is number {
  if (score === null || score === undefined) return false;
  const n = Number(score);
  return !Number.isNaN(n) && n >= 0 && n <= 100;
}

/** スコアを 0-100 の整数に正規化（無効な場合は NaN） */
function normalizeScore(score: number | null | undefined): number {
  if (!isValidScore(score)) return Number.NaN;
  return Math.round(Number(score));
}

/**
 * 類似度スコアから表示用ラベル・文字色・バー色を返す。
 * null/undefined/NaN の場合は「-」＋グレー。
 */
export function getScoreDisplay(
  score: number | null | undefined
): ScoreDisplayResult {
  const n = normalizeScore(score);
  if (Number.isNaN(n)) {
    return {
      label: "-",
      textClassName: NEUTRAL_TEXT,
      barClassName: NEUTRAL_BAR,
      badgeClassName: NEUTRAL_BADGE,
      hasScore: false,
    };
  }

  // 79以下: 赤
  if (n <= 79) {
    return {
      label: String(n),
      textClassName: "text-red-600 dark:text-red-400",
      barClassName: "bg-red-500",
      badgeClassName: "border-red-500 text-red-600 dark:text-red-400",
      hasScore: true,
    };
  }
  // 80-84: 薄い赤
  if (n <= 84) {
    return {
      label: String(n),
      textClassName: "text-red-500 dark:text-red-300",
      barClassName: "bg-red-400",
      badgeClassName: "border-red-400 text-red-500 dark:text-red-300",
      hasScore: true,
    };
  }
  // 85-89: 黄色
  if (n <= 89) {
    return {
      label: String(n),
      textClassName: "text-yellow-600 dark:text-yellow-400",
      barClassName: "bg-yellow-500",
      badgeClassName: "border-yellow-500 text-yellow-600 dark:text-yellow-400",
      hasScore: true,
    };
  }
  // 90-93: 薄い緑（文字・バーとも薄い）
  if (n <= 93) {
    return {
      label: String(n),
      textClassName: "text-green-500 dark:text-green-300",
      barClassName: "bg-green-300 dark:bg-green-500/70",
      badgeClassName: "border-green-400 text-green-500 dark:border-green-500 dark:text-green-300",
      hasScore: true,
    };
  }
  // 94-96: 中間の緑
  if (n <= 96) {
    return {
      label: String(n),
      textClassName: "text-green-600 dark:text-green-400",
      barClassName: "bg-green-500 dark:bg-green-600",
      badgeClassName: "border-green-500 text-green-600 dark:border-green-600 dark:text-green-400",
      hasScore: true,
    };
  }
  // 97-100: 濃い緑（文字も濃く・バーと同系で揃える）
  return {
    label: String(n),
    textClassName: "text-green-800 dark:text-green-500",
    barClassName: "bg-green-700 dark:bg-green-700",
    badgeClassName: "border-green-700 text-green-800 dark:border-green-600 dark:text-green-500",
    hasScore: true,
  };
}
