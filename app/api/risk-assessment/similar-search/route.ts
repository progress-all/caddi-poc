import { NextRequest, NextResponse } from "next/server";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import type {
  SimilarSearchRequest,
  SimilarSearchResponse,
  CandidateInfo,
  CandidateSource,
} from "@/app/risk-assessment/_lib/types";
import type {
  DigiKeyProductSubstitute,
} from "@/app/_lib/vendor/digikey/types";

/**
 * 類似品検索API
 *
 * 並列で以下の2つのソースから候補を収集:
 * 1. カスタムロジック（TODO: 将来実装）
 * 2. DigiKey Substitutions API
 *
 * 各ソースの結果をマージし、重複を排除してラベル付きで返却
 */
export async function POST(request: NextRequest) {
  try {
    const clientId = process.env.DIGIKEY_CLIENT_ID;
    const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      return NextResponse.json(
        {
          error:
            "DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables are not set",
        },
        { status: 500 }
      );
    }

    const body: SimilarSearchRequest = await request.json();
    const { mpn, digiKeyProductNumber } = body;

    if (!mpn || typeof mpn !== "string") {
      return NextResponse.json(
        { error: "mpn is required and must be a string" },
        { status: 400 }
      );
    }

    // 検索に使用する製品番号（DigiKey PNがあれば優先）
    const productNumber = digiKeyProductNumber || mpn;

    const client = new DigiKeyApiClient(clientId, clientSecret);

    // ===== 並列で2つのソースから候補を取得 =====
    const [customResult, substitutionsResult] =
      await Promise.allSettled([
        // 1. カスタムロジック（TODO: 将来実装）
        searchByCustomLogic(productNumber),
        // 2. Substitutions API
        client.getSubstitutions({ productNumber }),
      ]);

    // ===== 結果を処理 =====
    const candidateMap = new Map<string, CandidateInfo>();
    const sourceSummary: SimilarSearchResponse["sourceSummary"] = {
      custom: { count: 0 },
      substitutions: { count: 0 },
    };

    // カスタムロジック結果の処理
    if (customResult.status === "fulfilled") {
      const customCandidates = customResult.value;
      sourceSummary.custom.count = customCandidates.length;
      for (const candidate of customCandidates) {
        mergeCandidateToMap(candidateMap, candidate, "custom");
      }
    } else {
      sourceSummary.custom.error = customResult.reason?.message || "Unknown error";
    }

    // Substitutions結果の処理
    if (substitutionsResult.status === "fulfilled") {
      const substitutes = substitutionsResult.value.ProductSubstitutes || [];
      sourceSummary.substitutions.count = substitutes.length;
      for (const sub of substitutes) {
        const candidate = convertSubstituteToCandidate(sub);
        mergeCandidateToMap(candidateMap, candidate, "substitutions");
      }
    } else {
      sourceSummary.substitutions.error =
        substitutionsResult.reason?.message || "Unknown error";
    }

    // Mapから配列に変換
    const candidates = Array.from(candidateMap.values());

    const response: SimilarSearchResponse = {
      targetMpn: mpn,
      candidates,
      searchedAt: new Date().toISOString(),
      sourceSummary,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Similar search API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to search similar products",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}

/**
 * カスタムロジックによる類似品検索
 * TODO: 将来実装予定
 * - Keyword Searchを使用して同一カテゴリ内検索
 * - パッケージ・電圧範囲でフィルタリング
 * など
 */
async function searchByCustomLogic(
  _productNumber: string
): Promise<CandidateInfo[]> {
  // TODO: カスタムロジック実装
  // 現時点では空配列を返す
  return [];
}

/**
 * ProductSubstitute → CandidateInfo への変換
 */
function convertSubstituteToCandidate(
  sub: DigiKeyProductSubstitute
): CandidateInfo {
  return {
    digiKeyProductNumber: sub.DigiKeyProductNumber || "",
    manufacturerProductNumber: sub.ManufacturerProductNumber || "",
    manufacturerName: sub.Manufacturer?.Name || "",
    description: sub.Description || "",
    quantityAvailable: sub.QuantityAvailable || 0,
    productUrl: sub.ProductUrl,
    unitPrice: sub.UnitPrice,
    sources: [],
    substituteType: sub.SubstituteType,
  };
}

/**
 * 候補をMapにマージ（重複排除・ソースの追記）
 */
function mergeCandidateToMap(
  map: Map<string, CandidateInfo>,
  candidate: CandidateInfo,
  source: CandidateSource
): void {
  // DigiKey製品番号をキーとして使用（空の場合はMPNを使用）
  const key =
    candidate.digiKeyProductNumber || candidate.manufacturerProductNumber;
  if (!key) return;

  const existing = map.get(key);
  if (existing) {
    // 既存の候補にソースを追加
    if (!existing.sources.includes(source)) {
      existing.sources.push(source);
    }
    // substituteTypeがあれば追記
    if (candidate.substituteType && !existing.substituteType) {
      existing.substituteType = candidate.substituteType;
    }
  } else {
    // 新規候補として追加
    candidate.sources = [source];
    map.set(key, candidate);
  }
}
