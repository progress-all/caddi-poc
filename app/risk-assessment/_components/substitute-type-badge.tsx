"use client";

import { Badge } from "@/components/ui/badge";
import type { SubstituteType } from "../_lib/types";
import { substituteTypeLabels } from "../_lib/types";

/**
 * 代替品種別チップのプロパティ
 */
interface SubstituteTypeBadgeProps {
  /** 代替品種別 */
  type: SubstituteType | string;
  /** 説明をツールチップとして表示するか */
  showDescription?: boolean;
  /** 追加のクラス名 */
  className?: string;
}

/**
 * 代替品種別チップコンポーネント
 * 4種別（メーカー推奨、直接代替、パラメトリック同等品、類似品）を表示
 * 全て outline スタイルで統一
 */
export function SubstituteTypeBadge({
  type,
  showDescription = false,
  className,
}: SubstituteTypeBadgeProps) {
  // 型安全にラベルを取得
  const typeConfig =
    type && type in substituteTypeLabels
      ? substituteTypeLabels[type as SubstituteType]
      : {
          label: type || "不明",
          description: "種別情報なしの候補",
          variant: "outline" as const,
        };

  return (
    <Badge
      variant="outline"
      className={className}
      title={showDescription ? typeConfig.description : undefined}
    >
      {typeConfig.label}
    </Badge>
  );
}

/**
 * DigiKey 代替品大分類チップのプロパティ
 */
interface DigiKeyBadgeProps {
  /** 追加のクラス名 */
  className?: string;
}

/**
 * DigiKey 代替品大分類チップコンポーネント
 * 青ベース（default variant）で表示
 */
export function DigiKeyBadge({ className }: DigiKeyBadgeProps) {
  return (
    <Badge variant="default" className={className}>
      DigiKey 代替品
    </Badge>
  );
}
