import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type { NormalizedCompliance, RiskLevel } from "./types";

/**
 * DigiKeyProductから規制ステータスを正規化
 */
export function getComplianceFromProduct(
  product: DigiKeyProduct
): NormalizedCompliance {
  const rohsStatus = product.Classifications?.RohsStatus || "";
  const reachStatus = product.Classifications?.ReachStatus || "";

  const rohs: NormalizedCompliance["rohs"] = rohsStatus.includes("Compliant")
    ? "Compliant"
    : rohsStatus.includes("Non-Compliant") ||
      rohsStatus.includes("NonCompliant")
    ? "NonCompliant"
    : "Unknown";

  const reach: NormalizedCompliance["reach"] =
    reachStatus.includes("Unaffected") || reachStatus.includes("Compliant")
      ? "Compliant"
      : reachStatus.includes("Affected")
      ? "NonCompliant"
      : "Unknown";

  return { rohs, reach };
}

/**
 * 正規化された規制情報とステータスからリスクレベルを評価
 * @param compliance 規制情報（RoHS/REACH）
 * @param productStatus 製品ステータス（Active/Obsolete等）
 * @param substitutionCount 代替・類似候補の件数（オプション）
 *   - 0: リスクを1段階引き上げる（Low→Medium, Medium→High, High→High）
 *   - 1以上: 既存判定を変更しない
 *   - null/undefined: 既存判定を据え置く（取得失敗/未取得時）
 * @returns 評価されたリスクレベル
 */
export function getRiskLevel(
  compliance: NormalizedCompliance,
  productStatus?: string,
  substitutionCount?: number | null
): RiskLevel {
  // 既存のリスク判定を実行
  let baseRiskLevel: RiskLevel;

  // High リスク: RoHS/REACH が NonCompliant、または ステータスが Obsolete/Discontinued
  if (
    compliance.rohs === "NonCompliant" ||
    compliance.reach === "NonCompliant"
  ) {
    baseRiskLevel = "High";
  } else if (
    productStatus &&
    (productStatus.includes("Obsolete") ||
      productStatus.includes("Discontinued"))
  ) {
    baseRiskLevel = "High";
  }
  // Medium リスク: RoHS/REACH が Unknown、または ステータスが Last Time Buy/Not For New Designs
  else if (
    compliance.rohs === "Unknown" ||
    compliance.reach === "Unknown"
  ) {
    baseRiskLevel = "Medium";
  } else if (
    productStatus &&
    (productStatus.includes("Last Time Buy") ||
      productStatus.includes("Not For New Designs"))
  ) {
    baseRiskLevel = "Medium";
  }
  // Low リスク: RoHS/REACH が両方 Compliant、かつ ステータスが Active
  else if (
    compliance.rohs === "Compliant" &&
    compliance.reach === "Compliant"
  ) {
    if (!productStatus || productStatus === "Active") {
      baseRiskLevel = "Low";
    } else {
      // Active以外のステータスの場合は、上記のHigh/Mediumチェックで既に処理されている
      // ここに来る場合は、CompliantだがActive以外のステータスなのでMediumとする
      baseRiskLevel = "Medium";
    }
  } else {
    // デフォルトはMedium
    baseRiskLevel = "Medium";
  }
  
  if (substitutionCount === null || substitutionCount === undefined) {
    return baseRiskLevel;
  }

  // 候補件数が0の場合、リスクを1段階引き上げる
  if (substitutionCount === 0) {
    if (baseRiskLevel === "Low") {
      return "Medium";
    } else if (baseRiskLevel === "Medium") {
      return "High";
    }
    // Highの場合は据え置き
    return "High";
  }

  // 候補件数が1以上の場合は既存判定を変更しない
  return baseRiskLevel;
}
