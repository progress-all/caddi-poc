/**
 * BOM関連の型定義
 */

export interface BOMRow {
  サブシステム: string;
  カテゴリ: string;
  部品型番: string;
  メーカー: string;
  製品概要: string;
  製品ページURL: string;
}

/** BOM一覧で表示するリスク区分（UI用） */
export type BOMRiskDisplayCategory =
  | "顕在リスク"
  | "将来リスク"
  | "要確認"
  | "リスクなし";

export interface BOMRowWithRisk extends BOMRow {
  リスク: "High" | "Medium" | "Low" | "取得中" | "取得失敗";
  代替候補有無: "あり" | "なし" | "判定中" | "取得失敗";
  代替候補件数?: number;
  // 規制情報
  rohsStatus: "Compliant" | "NonCompliant" | "Unknown" | "N/A";
  reachStatus: "Compliant" | "NonCompliant" | "Unknown" | "N/A";
  // ライフサイクルステータス
  lifecycleStatus: "Active" | "NRND" | "Obsolete" | "EOL" | "Unknown" | "N/A";
}
