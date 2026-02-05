import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type { NormalizedCompliance, RiskLevel, PartRiskClassification } from "./types";

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

  // High リスク: RoHS/REACH が NonCompliant、または ステータスが Obsolete/Discontinued/EOL
  if (
    compliance.rohs === "NonCompliant" ||
    compliance.reach === "NonCompliant"
  ) {
    baseRiskLevel = "High";
  } else if (
    productStatus &&
    (productStatus.includes("Obsolete") ||
      productStatus.includes("Discontinued") ||
      productStatus.toLowerCase().includes("eol") ||
      productStatus.toLowerCase().includes("end of life"))
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

/**
 * 部品リスクを「顕在リスク」「将来リスク」に分類する（可視化用・PoC）
 * - 顕在: Lifecycle Obsolete/Discontinued/EOL、RoHS/REACH Non-compliant
 * - 将来: Lifecycle NRND/Last Time Buy、代替品・類似品が0件
 */
export function getPartRiskClassification(
  compliance: NormalizedCompliance,
  productStatus?: string | null,
  substitutionCount?: number | null
): PartRiskClassification {
  const status = (productStatus ?? "").toLowerCase();

  const current =
    compliance.rohs === "NonCompliant" ||
    compliance.reach === "NonCompliant" ||
    status.includes("obsolete") ||
    status.includes("discontinued") ||
    status.includes("eol") ||
    status.includes("end of life");

  const future =
    status.includes("not for new designs") ||
    status.includes("nrnd") ||
    status.includes("last time buy") ||
    (substitutionCount !== undefined && substitutionCount !== null && substitutionCount === 0);

  return { current, future };
}

/**
 * リスク判定に「寄与した原因」だけを文章で返す（判断根拠の表示用）
 * RoHS/REACH/ステータスは問題ないが代替0件で将来リスク、などが分かるようにする
 */
export function getContributingReasons(
  compliance: NormalizedCompliance,
  productStatus: string | null | undefined,
  substitutionCount: number | null | undefined,
  classification: PartRiskClassification
): { currentReasons: string[]; futureReasons: string[] } {
  const status = (productStatus ?? "").trim();
  const statusLower = status.toLowerCase();
  const currentReasons: string[] = [];
  const futureReasons: string[] = [];

  if (classification.current) {
    if (compliance.rohs === "NonCompliant") {
      currentReasons.push("RoHSが規制非適合のため、顕在リスクに該当しています。");
    }
    if (compliance.reach === "NonCompliant") {
      currentReasons.push("REACHが規制非適合のため、顕在リスクに該当しています。");
    }
    if (statusLower.includes("obsolete")) {
      currentReasons.push(`Lifecycleが${status || "Obsolete"}（廃番）のため、顕在リスクに該当しています。`);
    } else if (statusLower.includes("discontinued")) {
      currentReasons.push(`Lifecycleが${status || "Discontinued"}のため、顕在リスクに該当しています。`);
    } else if (statusLower.includes("eol") || statusLower.includes("end of life")) {
      currentReasons.push(`Lifecycleが${status || "EOL"}（End of Life）のため、顕在リスクに該当しています。`);
    }
  }

  if (classification.future) {
    if (statusLower.includes("not for new designs") || statusLower.includes("nrnd")) {
      futureReasons.push(`Lifecycleが${status || "NRND"}（新規設計非推奨）のため、将来リスクに該当しています。`);
    } else if (statusLower.includes("last time buy")) {
      futureReasons.push(`Lifecycleが${status || "Last Time Buy"}のため、将来リスクに該当しています。`);
    }
    if (
      substitutionCount !== undefined &&
      substitutionCount !== null &&
      substitutionCount === 0
    ) {
      futureReasons.push("代替・類似候補が0件のため、将来リスクに該当しています。");
    }
  }

  return { currentReasons, futureReasons };
}

/**
 * CandidateDetailedInfo の classifications / partStatus から NormalizedCompliance を簡易取得
 */
export function getComplianceFromClassifications(rohs?: string, reach?: string): NormalizedCompliance {
  const rohsNorm = rohs?.includes("Compliant") ? "Compliant" as const
    : rohs?.includes("Non-Compliant") || rohs?.includes("NonCompliant") ? "NonCompliant" as const
    : "Unknown" as const;
  const reachNorm = reach?.includes("Unaffected") || reach?.includes("Compliant") ? "Compliant" as const
    : reach?.includes("Affected") ? "NonCompliant" as const
    : "Unknown" as const;
  return { rohs: rohsNorm, reach: reachNorm };
}
