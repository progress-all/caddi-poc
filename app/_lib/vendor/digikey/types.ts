/**
 * DigiKey API 型定義
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

export type DigiKeyProduct = components["schemas"]["Product"];
export type DigiKeyKeywordResponse = components["schemas"]["KeywordResponse"];
export type DigiKeyKeywordRequest = components["schemas"]["KeywordRequest"];
export type DigiKeySortOptions = components["schemas"]["SortOptions"];
export type DigiKeyFilterOptionsRequest = components["schemas"]["FilterOptionsRequest"];
export type DigiKeyManufacturer = components["schemas"]["Manufacturer"];
export type DigiKeyCategory = components["schemas"]["Category"];
export type DigiKeyCategoryNode = components["schemas"]["CategoryNode"];
export type DigiKeyParameter = components["schemas"]["Parameter"];
export type DigiKeyProductVariation = components["schemas"]["ProductVariation"];
export type DigiKeyDescription = components["schemas"]["Description"];
export type DigiKeyProductStatus = components["schemas"]["ProductStatusV4"];
export type DigiKeyProblemDetails = components["schemas"]["DKProblemDetails"];

// SortOptionsのField型
export type DigiKeySortField = NonNullable<DigiKeySortOptions>["Field"];
export type DigiKeySortOrder = NonNullable<DigiKeySortOptions>["SortOrder"];

// フロントエンド用の入力型（UIからAPIへの変換用）
export interface KeywordSearchInput {
  keywords: string;
  limit?: number;
  offset?: number;
  sortField?: DigiKeySortField | ""; // フォームからの空文字列を許容
  sortOrder?: DigiKeySortOrder | ""; // フォームからの空文字列を許容
  manufacturerIds?: string; // カンマ区切りテキスト
  categoryIds?: string;
  statusIds?: string;
  minimumQuantityAvailable?: number;
}

// 後方互換性のためのエイリアス
export type DigiKeyKeywordSearchResults = DigiKeyKeywordResponse;
