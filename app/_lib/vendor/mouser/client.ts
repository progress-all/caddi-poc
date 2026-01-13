/**
 * Mouser API Client
 * Mouser API v2へのリクエストを処理するクライアント
 */

const MOUSER_API_BASE_URL = "https://api.mouser.com/api/v2";

export interface MouserSearchByKeywordRequest {
  keyword: string;
  records?: number;
  startingRecord?: number;
}

export interface MouserSearchByPartNumberRequest {
  partNumber: string;
  partSearchOptions?: string;
}

export interface MouserApiError {
  Errors?: Array<{
    ErrorCode?: string;
    ErrorMessage?: string;
  }>;
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
    request: MouserSearchByKeywordRequest
  ): Promise<unknown> {
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
    request: MouserSearchByPartNumberRequest
  ): Promise<unknown> {
    // APIキーをクエリパラメータとして追加
    const url = new URL(`${MOUSER_API_BASE_URL}/search/partnumber`);
    url.searchParams.append("apiKey", this.apiKey);

    const response = await fetch(url.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        SearchByPartNumberRequest: {
          mouserPartNumber: request.partNumber,
          partSearchOptions: request.partSearchOptions,
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
