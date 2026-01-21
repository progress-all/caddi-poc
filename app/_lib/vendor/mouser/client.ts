/**
 * Mouser API Client
 * Mouser APIへのリクエストを処理するクライアント
 */

import type { components } from "./types.generated";

// 生成された型のエイリアス
export type MouserSearchResponseRoot = components["schemas"]["SearchResponseRoot"];
export type MouserPart = components["schemas"]["MouserPart"];
export type MouserSearchByKeywordRequest = components["schemas"]["SearchByKeywordRequest"];
export type MouserSearchByPartRequest = components["schemas"]["SearchByPartRequest"];
export type MouserErrorEntity = components["schemas"]["ErrorEntity"];

// APIバージョンは環境変数で上書き可能、デフォルトはv2
const MOUSER_API_VERSION = process.env.MOUSER_API_VERSION || "2";
const MOUSER_API_BASE_URL = `https://api.mouser.com/api/v${MOUSER_API_VERSION}`;

// リクエスト用の簡略化された入力型（既存のコードとの互換性のため）
export interface MouserKeywordSearchInput {
  keyword: string;
  records?: number;
  startingRecord?: number;
}

export interface MouserPartNumberSearchInput {
  partNumber: string;
  partSearchOptions?: string;
}

export class MouserApiClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Keyword検索を実行
   */
  async searchByKeyword(
    request: MouserKeywordSearchInput
  ): Promise<MouserSearchResponseRoot> {
    // APIキーをクエリパラメータとして追加
    const url = new URL(`${MOUSER_API_BASE_URL}/search/keyword`);
    url.searchParams.append("apiKey", this.apiKey);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SearchByKeywordRequest: {
          keyword: request.keyword,
          records: request.records ?? 10,
          startingRecord: request.startingRecord ?? 0,
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(
        `Mouser API error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    return response.json();
  }

  /**
   * Part Number検索を実行
   */
  async searchByPartNumber(
    request: MouserPartNumberSearchInput
  ): Promise<MouserSearchResponseRoot> {
    // APIキーをクエリパラメータとして追加
    const url = new URL(`${MOUSER_API_BASE_URL}/search/partnumber`);
    url.searchParams.append("apiKey", this.apiKey);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SearchByPartRequest: {
          mouserPartNumber: request.partNumber,
          partSearchOptions: request.partSearchOptions ?? "",
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(
        `Mouser API error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    return response.json();
  }
}
