import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type { NormalizedCompliance, RiskEvidence, RiskEvidenceDigiKey, RiskEvidencePdfItem } from "./types";

/** 正規化済み ComplianceStatus を表示用ラベルに（Unknown もそのまま表示） */
function complianceLabel(status: NormalizedCompliance["rohs"] | NormalizedCompliance["reach"]): string {
  switch (status) {
    case "Compliant":
      return "Compliant";
    case "NonCompliant":
      return "NonCompliant";
    default:
      return "Unknown";
  }
}

/**
 * DigiKey Product と正規化済み規制情報から判断根拠（DigiKey 由来）を組み立てる
 * 値が無い項目は省略する（行を出さない方針）
 */
export function buildRiskEvidenceFromProduct(
  product: DigiKeyProduct,
  compliance: NormalizedCompliance
): RiskEvidence {
  const lifecycle = product.ProductStatus?.Status ?? undefined;
  const rohsRaw = product.Classifications?.RohsStatus;
  const reachRaw = product.Classifications?.ReachStatus;
  const digiKey: RiskEvidenceDigiKey = {
    lifecycle: lifecycle || undefined,
    rohs: rohsRaw && rohsRaw.trim() !== "" ? rohsRaw : complianceLabel(compliance.rohs),
    reach: reachRaw && reachRaw.trim() !== "" ? reachRaw : complianceLabel(compliance.reach),
    productUrl: product.ProductUrl && product.ProductUrl.trim() !== "" ? product.ProductUrl : undefined,
    datasheetUrl:
      product.DatasheetUrl?.trim()
        ? product.DatasheetUrl
        : undefined,
  };
  return { digiKey };
}

/**
 * PDF 根拠をマージする（既存の evidence に pdf を付与）
 * pdf が空または未指定の場合はそのまま返す
 */
export function mergePdfEvidence(
  evidence: RiskEvidence,
  pdfItems: RiskEvidencePdfItem[]
): RiskEvidence {
  if (!pdfItems || pdfItems.length === 0) return evidence;
  return { ...evidence, pdf: { items: pdfItems } };
}
