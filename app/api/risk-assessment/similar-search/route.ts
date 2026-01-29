import { NextRequest, NextResponse } from "next/server";
import { DigiKeyApiClient, type DigiKeyProductDetails } from "@/app/_lib/vendor/digikey/client";
import type {
  SimilarSearchRequest,
  SimilarSearchResponse,
  CandidateInfo,
  CandidateDetailedInfo,
  CandidateSource,
} from "@/app/risk-assessment/_lib/types";
import type {
  DigiKeyProductSubstitute,
  DigiKeyProduct,
} from "@/app/_lib/vendor/digikey/types";
import { withCache, buildCacheKey } from "@/app/_lib/cache";

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

    // 検索に使用する製品番号（DigiKey PNがあれば優先的に使用）
    // DigiKey Product Numberは一意の識別子のため、MPNの重複によるエラーを回避できる
    const productNumber = digiKeyProductNumber || mpn;

    // キャッシュキーの生成
    const cacheKey = buildCacheKey({
      mpn,
      dkpn: digiKeyProductNumber,
    });

    // キャッシュを使用して類似品検索を実行
    const { data: response, fromCache } = await withCache(
      {
        namespace: "similar-search",
        key: cacheKey,
      },
      async () => {
        const client = new DigiKeyApiClient(clientId, clientSecret);

        // ===== 並列で2つのソースから候補を取得 =====
        const [customResult, substitutionsResult] =
          await Promise.allSettled([
            // 1. カスタムロジック（TODO: 将来実装）
            searchByCustomLogic(productNumber),
            // 2. Substitutions API（productNumberにはDKPNが優先的に使用される）
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

        // ===== 対象部品の詳細情報を取得 =====
        let targetProduct: CandidateDetailedInfo | undefined;
        try {
          const targetProductDetails = await client.getProductDetails(productNumber);
          if (targetProductDetails.Product) {
            // 基本情報を作成
            const baseCandidate: CandidateInfo = {
              digiKeyProductNumber: targetProductDetails.Product.ProductVariations?.[0]?.DigiKeyProductNumber || "",
              manufacturerProductNumber: targetProductDetails.Product.ManufacturerProductNumber || mpn,
              manufacturerName: targetProductDetails.Product.Manufacturer?.Name || "",
              description: targetProductDetails.Product.Description?.ProductDescription || "",
              quantityAvailable: targetProductDetails.Product.QuantityAvailable || 0,
              productUrl: targetProductDetails.Product.ProductUrl,
              photoUrl: targetProductDetails.Product.PhotoUrl,
              unitPrice: targetProductDetails.Product.UnitPrice?.toString(),
              sources: [],
            };
            // 詳細情報に変換
            targetProduct = convertProductToDetailedCandidate(baseCandidate, targetProductDetails.Product);
          }
        } catch (error) {
          console.error("Failed to get target product details:", error);
          // エラーが発生しても処理は続行（targetProductはundefinedのまま）
        }

        // ===== 各候補の詳細情報を取得 =====
        const detailedCandidates = await enrichCandidatesWithDetails(
          client,
          candidates
        );

        return {
          targetMpn: mpn,
          targetProduct,
          candidates: detailedCandidates,
          searchedAt: new Date().toISOString(),
          sourceSummary,
        } as SimilarSearchResponse;
      }
    );

    return NextResponse.json(response, {
      headers: {
        "X-Cache": fromCache ? "HIT" : "MISS",
      },
    });
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

/**
 * 各候補の詳細情報をProduct Details APIから取得して拡張
 */
async function enrichCandidatesWithDetails(
  client: DigiKeyApiClient,
  candidates: CandidateInfo[]
): Promise<CandidateDetailedInfo[]> {
  // DigiKey Product Numberがある候補のみ詳細取得
  const candidatesWithDigiKeyPn = candidates.filter(
    (c) => c.digiKeyProductNumber
  );

  // sleep関数: レートリミット対策のため待機時間を挿入
  const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  // 直列でProduct Details APIを呼び出し（レートリミット対策）
  const detailResults: PromiseSettledResult<DigiKeyProductDetails>[] = [];
  for (const candidate of candidatesWithDigiKeyPn) {
    try {
      const result = await client.getProductDetails(candidate.digiKeyProductNumber);
      detailResults.push({ status: 'fulfilled', value: result });
    } catch (error) {
      detailResults.push({ status: 'rejected', reason: error });
    }
    // Spike Arrest対策: 200ms待機（5リクエスト/秒以下に抑制）
    await sleep(200);
  }

  // 詳細情報をマージ
  const detailedCandidates: CandidateDetailedInfo[] = candidates.map(
    (candidate, index) => {
      // DigiKey PNがない場合は基本情報のみ
      if (!candidate.digiKeyProductNumber) {
        return candidate as CandidateDetailedInfo;
      }

      // 対応する詳細情報のインデックスを取得
      const detailIndex = candidatesWithDigiKeyPn.findIndex(
        (c) => c.digiKeyProductNumber === candidate.digiKeyProductNumber
      );
      if (detailIndex === -1) {
        return candidate as CandidateDetailedInfo;
      }

      const detailResult = detailResults[detailIndex];
      if (detailResult.status !== "fulfilled" || !detailResult.value.Product) {
        // 詳細取得に失敗した場合は基本情報のみ
        return candidate as CandidateDetailedInfo;
      }

      const product = detailResult.value.Product;
      return convertProductToDetailedCandidate(candidate, product);
    }
  );

  return detailedCandidates;
}

/**
 * DigiKey Product → CandidateDetailedInfo への変換
 */
function convertProductToDetailedCandidate(
  baseCandidate: CandidateInfo,
  product: DigiKeyProduct
): CandidateDetailedInfo {
  return {
    ...baseCandidate,
    // Product基本情報
    detailedDescription: product.Description?.DetailedDescription,
    datasheetUrl: product.DatasheetUrl,
    photoUrl: product.PhotoUrl || baseCandidate.photoUrl,
    productUrl: product.ProductUrl || baseCandidate.productUrl,

    // ステータス情報
    partStatus: product.ProductStatus?.Status,
    backOrderNotAllowed: product.BackOrderNotAllowed,
    normallyStocking: product.NormallyStocking,
    discontinued: product.Discontinued,
    endOfLife: product.EndOfLife,
    ncnr: product.Ncnr,

    // カテゴリ・シリーズ
    category: product.Category
      ? {
          name: product.Category.Name,
          categoryId: product.Category.CategoryId,
        }
      : undefined,
    series: product.Series?.Name,

    // 在庫・リードタイム
    manufacturerLeadWeeks: product.ManufacturerLeadWeeks,
    manufacturerPublicQuantity: product.ManufacturerPublicQuantity,

    // 規制情報
    classifications: product.Classifications
      ? {
          rohs: product.Classifications.RohsStatus,
          reach: product.Classifications.ReachStatus,
          moisture: product.Classifications.MoistureSensitivityLevel,
          exportControl: product.Classifications.ExportControlClassNumber,
        }
      : undefined,

    // バリエーション
    variations: product.ProductVariations?.map((variation) => ({
      digiKeyProductNumber: variation.DigiKeyProductNumber,
      packageType: variation.PackageType?.Name,
      quantityAvailable: variation.QuantityAvailableforPackageType,
      pricing: variation.StandardPricing?.map((price) => ({
        breakQuantity: price.BreakQuantity || 0,
        unitPrice: price.UnitPrice || 0,
      })),
    })),

    // 動的パラメータ
    parameters: product.Parameters?.map((param) => ({
      name: param.ParameterText || "",
      value: param.ValueText || "",
      parameterId: param.ParameterId,
    })),
  };
}
