import type { ParameterEvaluation } from "@/app/_lib/datasheet/similarity-schema";
import { isComparableParameter } from "@/app/_lib/datasheet/similarity-score";

const NO_DIFF_LINE = "・差分なし（比較可能な範囲では全項目一致）";

/**
 * 類似度評価の parameters から、差分のみの箇条書きサマリ文字列を生成する（フォールバック用）。
 * - 表示対象: 比較成立（isComparable）かつ score 1–84（85以上は上位互換・実用上問題なし、0/100 は除外）
 * - 各項目: ・{description}：{targetValue} → {candidateValue} または ・{description}：条件・特性に差あり
 * - 差分 0 件: ・差分なし（比較可能な範囲では全項目一致）
 */
export function formatSimilaritySummaryDiff(
  parameters: ParameterEvaluation[]
): string {
  const diffItems = parameters.filter(
    (p) => isComparableParameter(p) && p.score >= 1 && p.score <= 84
  );

  if (diffItems.length === 0) {
    return NO_DIFF_LINE;
  }

  const lines = diffItems.map((p) => {
    const desc = p.description ?? "";
    const hasValues =
      p.targetValue != null &&
      p.candidateValue != null &&
      String(p.targetValue).trim() !== "" &&
      String(p.candidateValue).trim() !== "";

    if (hasValues) {
      return `・${desc}：${p.targetValue} → ${p.candidateValue}`;
    }
    return `・${desc}：条件・特性に差あり`;
  });

  return lines.join("\n");
}
