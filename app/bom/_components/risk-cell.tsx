"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import type { BOMRowWithRisk, BOMRiskDisplayCategory } from "../_lib/types";

/** リスク値 → 表示区分（優先順位: 顕在 > 将来 > 要確認 > リスクなし） */
export function riskToDisplayCategory(
  risk: BOMRowWithRisk["リスク"]
): BOMRiskDisplayCategory {
  switch (risk) {
    case "High":
      return "顕在リスク";
    case "Medium":
      return "将来リスク";
    case "取得中":
    case "取得失敗":
      return "要確認";
    case "Low":
      return "リスクなし";
  }
}

/** 表示区分ごとのバッジ設定（部品画面の NonCompliant/Unknown/Compliant と同様のアイコン）。類似品検索の総合リスク表示でも共用。 */
export const riskCategoryConfig: Record<
  BOMRiskDisplayCategory,
  { label: string; className: string; icon: string }
> = {
  顕在リスク: {
    label: "顕在リスク",
    className: "bg-red-500 text-white border-red-600",
    icon: "❌",
  },
  将来リスク: {
    label: "将来リスク",
    className: "bg-amber-500 text-white border-amber-600",
    icon: "⚠️",
  },
  要確認: {
    label: "要確認",
    className: "bg-slate-500 text-white border-slate-600",
    icon: "⚠️",
  },
  リスクなし: {
    label: "リスクなし",
    className: "bg-green-500 text-white border-green-600",
    icon: "✅",
  },
};

/** RoHS/REACH ステータス → アイコン（共通設定を re-export、BOM列表示用） */
export {
  complianceIconConfig,
  lifecycleIconConfig,
} from "@/app/_lib/risk-icon-config";

interface RiskCellProps {
  readonly row: BOMRowWithRisk;
}

/**
 * リスクセル：リスク区分バッジ + RoHS/REACH/Status 内訳アイコンを表示。
 * クリックで判断根拠（RoHS/REACH/ライフサイクル/代替候補）を表示。
 */
export function RiskCell({ row }: RiskCellProps) {
  const risk = row.リスク;
  const displayCategory = riskToDisplayCategory(risk);
  const categoryConfig = riskCategoryConfig[displayCategory];

  const substituteText =
    row.代替候補有無 === "あり" && row.代替候補件数 != null
      ? `${row.代替候補有無}（${row.代替候補件数}件）`
      : row.代替候補有無;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          title="クリックでリスクの理由を表示"
          className="inline-flex cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <Badge
            variant="outline"
            className={`text-xs font-semibold border ${categoryConfig.className}`}
          >
            {categoryConfig.icon} {categoryConfig.label}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-64 p-3 text-sm"
        align="start"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-2">
          <p className="font-medium text-xs text-muted-foreground">
            リスクの理由
          </p>
          <dl className="space-y-1.5 text-xs">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">RoHS</dt>
              <dd>{row.rohsStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">REACH</dt>
              <dd>{row.reachStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">ライフサイクル</dt>
              <dd>{row.lifecycleStatus}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">代替・類似候補</dt>
              <dd>{substituteText}</dd>
            </div>
          </dl>
          <p className="pt-1 text-xs text-muted-foreground">
            詳細はリスク評価画面で確認できます。
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
