"use client";

import { cn } from "@/app/_lib/utils";

export type ScoreBreakdown = {
  total: number;
  high: number;
  mid: number;
  low: number;
  excluded: number;
};

type SimilarityScoreBreakdownProps = Readonly<{
  scoreBreakdown: ScoreBreakdown;
  className?: string;
}>;

/**
 * 類似度スコア内訳（総数 + 高/中/低/対象外）を表示する。
 */
export function SimilarityScoreBreakdown({
  scoreBreakdown,
  className,
}: SimilarityScoreBreakdownProps) {
  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2.5 gap-y-1 text-xs text-muted-foreground", className)}>
      <span className="shrink-0">総数: {scoreBreakdown.total}（比較対象）</span>
      <span className="shrink-0">内訳:</span>
      <span className="tabular-nums">高(80以上): {scoreBreakdown.high}</span>
      <span className="tabular-nums">中(50-79): {scoreBreakdown.mid}</span>
      <span className="tabular-nums">低(50未満): {scoreBreakdown.low}</span>
      <span className="tabular-nums">対象外: {scoreBreakdown.excluded}</span>
    </div>
  );
}
