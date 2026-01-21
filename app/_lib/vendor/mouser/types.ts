/**
 * Mouser API 型定義
 * 自動生成された型を再エクスポートし、カスタム入力型を定義
 */

// 自動生成された型を再エクスポート
export type {
  components,
  paths,
  operations,
} from "./types.generated";

// 便利なエイリアス
import type { components } from "./types.generated";

export type MouserPart = components["schemas"]["MouserPart"];
export type MouserSearchResponseRoot = components["schemas"]["SearchResponseRoot"];
export type MouserSearchResponse = components["schemas"]["SearchResponse"];
export type MouserErrorEntity = components["schemas"]["ErrorEntity"];
export type MouserProductAttribute = components["schemas"]["ProductAttribute"];
export type MouserPricebreak = components["schemas"]["Pricebreak"];

// フロントエンド用の入力型（UIからAPIへの変換用）
export interface KeywordSearchInput {
  keyword: string;
  records?: number;
  startingRecord?: number;
}

export interface PartNumberSearchInput {
  partNumber: string;
  partSearchOptions?: string;
}

// 後方互換性のためのエイリアス（既存コードで使用されている場合）
export type MouserSearchResults = MouserSearchResponseRoot;
