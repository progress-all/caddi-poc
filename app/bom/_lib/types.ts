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

export interface BOMRowWithRisk extends BOMRow {
  リスク: "High" | "Medium" | "Low" | "取得中" | "取得失敗";
  代替候補有無: "あり" | "なし" | "判定中" | "取得失敗";
  代替候補件数?: number;
}
