/**
 * リスクアイコン表示用の共通設定（BOM一覧・部品詳細・候補一覧で共通利用）
 * RoHS/REACH/ライフサイクルの表示アイコン・ラベルを定義
 */

/** RoHS/REACH ステータス（表示用） */
export type ComplianceStatus =
  | "Compliant"
  | "NonCompliant"
  | "Unknown"
  | "N/A";

/** ライフサイクルステータス（表示用） */
export type LifecycleStatus =
  | "Active"
  | "NRND"
  | "Obsolete"
  | "EOL"
  | "Unknown"
  | "N/A";

export interface IconConfig {
  icon: string;
  label: string;
}

/** RoHS/REACH ステータス → アイコン・ラベル（部品詳細・BOM一覧と同一） */
export const complianceIconConfig: Record<ComplianceStatus, IconConfig> = {
  Compliant: { icon: "✅", label: "Compliant" },
  NonCompliant: { icon: "❌", label: "Non-Compliant" },
  Unknown: { icon: "⚠️", label: "Unknown" },
  "N/A": { icon: "⚠️", label: "N/A" },
};

/** Part Status（ライフサイクル）→ アイコン・ラベル（部品詳細・BOM一覧と同一） */
export const lifecycleIconConfig: Record<LifecycleStatus, IconConfig> = {
  Active: { icon: "✅", label: "Active" },
  NRND: { icon: "⚠️", label: "NRND" },
  Obsolete: { icon: "❌", label: "Obsolete" },
  EOL: { icon: "⚠️", label: "EOL" },
  Unknown: { icon: "⚠️", label: "Unknown" },
  "N/A": { icon: "⚠️", label: "N/A" },
};

/**
 * API/候補の文字列を RoHS/REACH 表示用ステータスに正規化
 * 欠損・Unknown・NotFound は Unknown として表示（要確認扱い）
 */
export function normalizeComplianceStatus(value?: string | null): ComplianceStatus {
  if (value == null || value === "") return "Unknown";
  const v = value.trim();
  if (v === "N/A" || v.toLowerCase() === "n/a") return "N/A";
  if (v.includes("Compliant") && !v.includes("Non")) return "Compliant";
  if (v.includes("Non-Compliant") || v.includes("NonCompliant")) return "NonCompliant";
  if (v.includes("Unaffected") && v.includes("REACH")) return "Compliant";
  if (v.includes("Affected") && v.includes("REACH")) return "NonCompliant";
  return "Unknown";
}

/**
 * API/候補の Part Status 文字列をライフサイクル表示用に正規化
 * 欠損・Unknown は Unknown として表示（要確認扱い）
 */
export function normalizeLifecycleStatus(value?: string | null): LifecycleStatus {
  if (value == null || value === "") return "Unknown";
  const v = value.trim().toLowerCase();
  if (v === "n/a") return "N/A";
  if (v === "active") return "Active";
  if (v.includes("obsolete") || v.includes("discontinued")) return "Obsolete";
  if (v.includes("eol") || v.includes("end of life")) return "EOL";
  if (
    v.includes("last time buy") ||
    v.includes("not for new designs") ||
    v.includes("nrnd")
  ) {
    return "NRND";
  }
  return "Unknown";
}
