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
 * 正規化された規制情報からリスクレベルを評価
 */
export function getRiskLevel(compliance: NormalizedCompliance): RiskLevel {
  if (
    compliance.rohs === "NonCompliant" ||
    compliance.reach === "NonCompliant"
  ) {
    return "High";
  }
  if (compliance.rohs === "Compliant" && compliance.reach === "Compliant") {
    return "Low";
  }
  return "Medium";
}
