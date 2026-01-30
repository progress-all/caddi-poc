/**
 * Risk Assessment API クライアント関数
 */

import type { SimilarSearchRequest, SimilarSearchResponse } from "./types";
import type { DatasheetData } from "@/app/_lib/datasheet/types";
import type { SimilarityResult } from "@/app/_lib/datasheet/similarity-schema";

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

/**
 * 類似品検索API呼び出し
 * @param input 検索パラメータ（mpn必須、digiKeyProductNumberオプション）
 * @returns 候補リストとソース情報
 */
export async function searchSimilarProducts(
  input: SimilarSearchRequest
): Promise<SimilarSearchResponse> {
  return postJson<SimilarSearchResponse>(
    "/api/risk-assessment/similar-search",
    input
  );
}

/**
 * datasheetUrlからdatasheet_idを抽出するユーティリティ
 * @param datasheetUrl データシートPDFのURL
 * @returns datasheet_id（.pdfを除去したファイル名）、抽出できない場合はnull
 */
export function extractDatasheetId(datasheetUrl: string): string | null {
  if (!datasheetUrl) {
    return null;
  }

  try {
    const url = new URL(datasheetUrl);
    const pathname = url.pathname;
    
    // パス末尾からファイル名を抽出
    const filename = pathname.split("/").pop();
    if (!filename) {
      return null;
    }

    // .pdfを除去
    if (filename.toLowerCase().endsWith(".pdf")) {
      return filename.slice(0, -4);
    }

    return filename;
  } catch {
    // URLパースエラーの場合はnullを返す
    return null;
  }
}

/**
 * 複数のdatasheet_idを20件ずつバッチ処理してデータを取得
 * @param ids datasheet_idの配列
 * @returns datasheet_idをキーとしたDatasheetDataのレコード
 */
export async function fetchDatasheetParameters(
  ids: string[]
): Promise<Record<string, DatasheetData>> {
  const BATCH_SIZE = 20;
  const results: Record<string, DatasheetData> = {};

  // 20件ずつに分割して処理
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = ids.slice(i, i + BATCH_SIZE);
    const idsParam = batch.join(",");
    
    try {
      const response = await fetch(`/api/datasheet?ids=${encodeURIComponent(idsParam)}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error(`Failed to fetch datasheet batch:`, errorData);
        continue;
      }

      const batchResults: Record<string, DatasheetData> = await response.json();
      Object.assign(results, batchResults);
    } catch (error) {
      console.error(`Error fetching datasheet batch:`, error);
      // エラーが発生しても処理を続行
    }
  }

  return results;
}

/**
 * 類似度結果取得API呼び出し
 * @param targetId Target部品のdatasheet_id
 * @returns candidateIdをキーとしたSimilarityResultのレコード
 */
export async function fetchSimilarityResults(
  targetId: string
): Promise<Record<string, SimilarityResult>> {
  try {
    const response = await fetch(
      `/api/similarity-results?targetId=${encodeURIComponent(targetId)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Failed to fetch similarity results:`, errorData);
      return {};
    }

    return response.json();
  } catch (error) {
    console.error(`Error fetching similarity results:`, error);
    return {};
  }
}
