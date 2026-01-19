/**
 * DigiKey API Client
 * DigiKey APIへのリクエストを処理するクライアント
 * OAuth 2.0 client_credentials flowを使用
 */

const DIGIKEY_API_BASE_URL = "https://api.digikey.com";
const DIGIKEY_TOKEN_URL = `${DIGIKEY_API_BASE_URL}/v1/oauth2/token`;

export interface DigiKeyKeywordSearchRequest {
  keywords: string;
  limit?: number;
  offset?: number;
}

interface TokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

export class DigiKeyApiClient {
  private clientId: string;
  private clientSecret: string;
  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(clientId: string, clientSecret: string) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
  }

  /**
   * OAuth 2.0 client_credentials flowでアクセストークンを取得
   * トークンは約10分間有効。キャッシュして再利用する。
   */
  async getAccessToken(): Promise<string> {
    // キャッシュされたトークンが有効ならそれを返す
    if (this.cachedToken && Date.now() < this.cachedToken.expiresAt) {
      return this.cachedToken.token;
    }

    const response = await fetch(DIGIKEY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: "client_credentials",
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
        `DigiKey token error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    const data: TokenResponse = await response.json();
    // 有効期限の少し前（30秒前）にリフレッシュするようにする
    this.cachedToken = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 30) * 1000,
    };
    return data.access_token;
  }

  /**
   * Keyword検索を実行
   */
  async keywordSearch(
    request: DigiKeyKeywordSearchRequest
  ): Promise<unknown> {
    const token = await this.getAccessToken();

    const response = await fetch(
      `${DIGIKEY_API_BASE_URL}/products/v4/search/keyword`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "X-DIGIKEY-Client-Id": this.clientId,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          Keywords: request.keywords,
          Limit: request.limit ?? 25,
          Offset: request.offset ?? 0,
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch {
        errorData = { message: errorText };
      }
      throw new Error(
        `DigiKey API error: ${response.status} ${response.statusText}`,
        { cause: errorData }
      );
    }

    return response.json();
  }
}
