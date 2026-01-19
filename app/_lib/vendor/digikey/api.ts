/**
 * DigiKey API クライアント関数
 * UI層から分離されたAPI通信層
 */

import type {
  KeywordSearchInput,
  DigiKeyKeywordSearchResults,
} from "./types";

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to fetch");
  }

  return response.json();
}

export async function searchByKeyword(
  input: KeywordSearchInput
): Promise<DigiKeyKeywordSearchResults> {
  return postJson<DigiKeyKeywordSearchResults>(
    "/api/vendor/digikey/search/keyword",
    input
  );
}
