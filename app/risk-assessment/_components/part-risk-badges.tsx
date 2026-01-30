"use client";

import { Badge } from "@/components/ui/badge";
import type { PartRiskClassification } from "../_lib/types";
import { cn } from "@/app/_lib/utils";

interface PartRiskBadgesProps {
  classification: PartRiskClassification;
  className?: string;
  /** ラベルを短くする（例: 一覧用） */
  short?: boolean;
}

/**
 * 顕在リスク・将来リスクを色分けバッジで表示
 * 顕在=赤、将来=黄
 */
export function PartRiskBadges({
  classification,
  className,
  short = false,
}: PartRiskBadgesProps) {
  if (!classification.current && !classification.future) {
    return null;
  }

  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {classification.current && (
        <Badge
          variant="outline"
          className="border-red-500 bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-400 dark:border-red-600 text-xs"
        >
          {short ? "顕在" : "顕在リスク"}
        </Badge>
      )}
      {classification.future && (
        <Badge
          variant="outline"
          className="border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-600 text-xs"
        >
          {short ? "将来" : "将来リスク"}
        </Badge>
      )}
    </div>
  );
}
