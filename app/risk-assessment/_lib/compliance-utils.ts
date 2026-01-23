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
 */
export function getRiskLevel(
  compliance: NormalizedCompliance,
  productStatus?: string
): RiskLevel {
  // High リスク: RoHS/REACH が NonCompliant、または ステータスが Obsolete/Discontinued
  if (
    compliance.rohs === "NonCompliant" ||
    compliance.reach === "NonCompliant"
  ) {
    return "High";
  }
  if (
    productStatus &&
    (productStatus.includes("Obsolete") ||
      productStatus.includes("Discontinued"))
  ) {
    return "High";
  }

  // Medium リスク: RoHS/REACH が Unknown、または ステータスが Last Time Buy/Not For New Designs
  if (
    compliance.rohs === "Unknown" ||
    compliance.reach === "Unknown"
  ) {
    return "Medium";
  }
  if (
    productStatus &&
    (productStatus.includes("Last Time Buy") ||
      productStatus.includes("Not For New Designs"))
  ) {
    return "Medium";
  }

  // Low リスク: RoHS/REACH が両方 Compliant、かつ ステータスが Active
  if (
    compliance.rohs === "Compliant" &&
    compliance.reach === "Compliant"
  ) {
    if (!productStatus || productStatus === "Active") {
      return "Low";
    }
    // Active以外のステータスの場合は、上記のHigh/Mediumチェックで既に処理されている
    // ここに来る場合は、CompliantだがActive以外のステータスなのでMediumとする
    return "Medium";
  }

  // デフォルトはMedium
  return "Medium";
}
