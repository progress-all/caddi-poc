"use client";

import { Badge } from "@/components/ui/badge";
import { getScoreDisplay } from "@/app/_lib/similarity-score-color";
import { cn } from "@/app/_lib/utils";

type SimilarityScoreDisplayProps = {
  /** 類似度スコア (0-100)。null/undefined/NaN の場合は「-」＋グレー表示 */
  score: number | null | undefined;
  /** 表示形式: テキストのみ / テキスト+バー / Badge */
  variant?: "text" | "textWithBar" | "badge";
  /** テキストサイズ用の className（例: text-sm, text-lg） */
  className?: string;
  /** Badge のプレフィックス（例: "スコア: "）。variant=badge のときのみ */
  badgePrefix?: string;
  /** スコア表示を "85 / 100" 形式にする（モーダル用） */
  showMax?: boolean;
};

/**
 * 類似度スコアを段階的カラーで表示する共通コンポーネント。
 * 仕様: 79以下=赤, 80-84=薄い赤, 85-89=黄, 90-93=薄い緑, 94-96=中間緑, 97-100=濃い緑, 無効=グレー「-」
 */
export function SimilarityScoreDisplay({
  score,
  variant = "text",
  className,
  badgePrefix = "スコア: ",
  showMax = false,
}: SimilarityScoreDisplayProps) {
  const display = getScoreDisplay(score);
  const label = showMax && display.hasScore ? `${display.label} / 100` : display.label;

  if (variant === "text") {
    return (
      <span className={cn("font-medium", display.textClassName, className)}>
        {label}
      </span>
    );
  }

  if (variant === "textWithBar") {
    return (
      <div className={cn("flex flex-col gap-0.5 min-w-0", className)}>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-medium shrink-0", display.textClassName)}>
            {label}
          </span>
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
            <div
              className={cn("h-full transition-all", display.hasScore ? display.barClassName : "bg-transparent")}
              style={{ width: display.hasScore ? `${display.label}%` : "0%" }}
            />
          </div>
        </div>
      </div>
    );
  }

  // variant === "badge"
  return (
    <Badge
      variant="outline"
      className={cn("text-xs flex-shrink-0", display.badgeClassName, className)}
    >
      {badgePrefix}
      {label}
    </Badge>
  );
}
