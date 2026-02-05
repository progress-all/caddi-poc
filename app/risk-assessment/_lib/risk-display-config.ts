import type { PartRiskClassification } from "./types";

/**
 * 表示区分: 顕在リスク / 将来リスク / リスクなし
 * BOM の risk-cell と同一の分類・カラーリングで統一する。
 */
export type RiskDisplayCategory = "顕在リスク" | "将来リスク" | "リスクなし";

/**
 * 表示区分ごとのバッジ設定（BOM risk-cell の riskCategoryConfig と完全同一）
 * 顕在=赤、将来=アンバー、リスクなし=緑
 */
export const riskDisplayConfig: Record<
  RiskDisplayCategory,
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
  リスクなし: {
    label: "リスクなし",
    className: "bg-green-500 text-white border-green-600",
    icon: "✅",
  },
};

/**
 * PartRiskClassification から表示区分を取得（優先: 顕在 > 将来 > リスクなし）
 */
export function classificationToDisplayCategory(
  classification: PartRiskClassification
): RiskDisplayCategory {
  if (classification.current) return "顕在リスク";
  if (classification.future) return "将来リスク";
  return "リスクなし";
}
