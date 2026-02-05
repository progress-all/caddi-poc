import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { parseCSV } from "@/app/_lib/csv-utils";
import type { BOMRow, BOMRowWithRisk, PartCacheValue } from "@/app/bom/_lib/types";
import { getRiskLevel, getComplianceFromProduct } from "@/app/risk-assessment/_lib/compliance-utils";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { withCache, buildCacheKey, getCache, setCache } from "@/app/_lib/cache";

// ライフサイクルステータスを正規化
function normalizeLifecycleStatus(
  productStatus?: string
): BOMRowWithRisk["lifecycleStatus"] {
  if (!productStatus) {
    return "Unknown";
  }

  const statusLower = productStatus.toLowerCase();

  if (statusLower === "active") {
    return "Active";
  }

  if (
    statusLower.includes("not for new designs") ||
    statusLower.includes("nrnd")
  ) {
    return "NRND";
  }

  if (
    statusLower.includes("obsolete") ||
    statusLower.includes("discontinued")
  ) {
    return "Obsolete";
  }

  if (
    statusLower.includes("last time buy") ||
    statusLower.includes("eol") ||
    statusLower.includes("end of life")
  ) {
    return "EOL";
  }

  return "Unknown";
}

/**
 * BOMデータ取得API
 * GET /api/bom?id={bom-id}
 * 
 * キャッシュが存在する場合はキャッシュを返し、
 * 存在しない場合はCSVを読み込んでDigiKey APIを呼び出し、キャッシュを保存してから返す
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bomId = searchParams.get("id");

    if (!bomId) {
      return NextResponse.json(
        { error: "id parameter is required" },
        { status: 400 }
      );
    }

    // パス検証（ディレクトリトラバーサル対策）
    if (bomId.includes("..") || bomId.includes("/") || bomId.includes("\\")) {
      return NextResponse.json(
        { error: "Invalid bom-id" },
        { status: 400 }
      );
    }

    // キャッシュキーの生成
    const cacheKey = buildCacheKey({ id: bomId });

    // キャッシュを使用してBOMデータを取得
    const { data: rowsWithRisk, fromCache } = await withCache(
      {
        namespace: "bom",
        key: cacheKey,
      },
      async () => {
        // CSV読み込み: アップロード用 → public の順
        const uploadsPath = path.join(process.cwd(), "data", "bom-uploads", `${bomId}.csv`);
        const publicPath = path.join(process.cwd(), "public", "data", `${bomId}.csv`);
        let csvText: string;
        try {
          csvText = await fs.readFile(uploadsPath, "utf-8");
        } catch {
          try {
            csvText = await fs.readFile(publicPath, "utf-8");
          } catch {
            throw new Error(`BOM file not found: ${bomId}.csv`);
          }
        }

        // CSVをパース
        const parsedRows = parseCSV<Record<string, string>>(csvText);
        const rows = parsedRows as unknown as BOMRow[];

        // DigiKey APIクライアントの初期化
        const clientId = process.env.DIGIKEY_CLIENT_ID;
        const clientSecret = process.env.DIGIKEY_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
          throw new Error(
            "DIGIKEY_CLIENT_ID and DIGIKEY_CLIENT_SECRET environment variables are not set"
          );
        }

        const client = new DigiKeyApiClient(clientId, clientSecret);

        // 各部品のリスクを取得（部品キャッシュがあればAPIをスキップ）
        const rowsWithRisk: BOMRowWithRisk[] = [];
        const partCacheNamespace = "bom-part";

        for (const row of rows) {
          const mpn = row.部品型番.trim();
          const partKey = buildCacheKey({ mpn });

          const cachedPart = await getCache<PartCacheValue>({
            namespace: partCacheNamespace,
            key: partKey,
          });

          if (cachedPart) {
            rowsWithRisk.push({
              ...row,
              リスク: cachedPart.riskLevel,
              代替候補有無:
                cachedPart.substitutionCount === null
                  ? "取得失敗"
                  : cachedPart.substitutionCount > 0
                  ? "あり"
                  : "なし",
              代替候補件数: cachedPart.substitutionCount ?? undefined,
              rohsStatus: cachedPart.rohsStatus,
              reachStatus: cachedPart.reachStatus,
              lifecycleStatus: cachedPart.lifecycleStatus,
            });
            continue;
          }

          try {
            const searchResult = await client.keywordSearch({
              keywords: row.部品型番,
              limit: 1,
            });

            if (searchResult.Products && searchResult.Products.length > 0) {
              const product = searchResult.Products[0];
              const compliance = getComplianceFromProduct(product);
              const lifecycleStatus = normalizeLifecycleStatus(
                product.ProductStatus?.Status
              );

              const digiKeyProductNumber =
                product.ProductVariations?.[0]?.DigiKeyProductNumber;
              const productNumberForSubstitutions =
                digiKeyProductNumber || product.ManufacturerProductNumber || "";

              let substitutionCount: number | null = null;
              if (productNumberForSubstitutions) {
                try {
                  const substitutionsResult = await client.getSubstitutions({
                    productNumber: productNumberForSubstitutions,
                  });
                  substitutionCount =
                    substitutionsResult.ProductSubstitutes?.length ?? 0;
                } catch (subError) {
                  console.error(
                    `代替候補取得エラー (${row.部品型番}):`,
                    subError
                  );
                }
              }

              let riskLevel = getRiskLevel(
                compliance,
                product.ProductStatus?.Status,
                substitutionCount
              );
              if (lifecycleStatus === "EOL" && riskLevel !== "High") {
                riskLevel = "High";
              }

              const riskRow: BOMRowWithRisk = {
                ...row,
                リスク: riskLevel,
                代替候補有無:
                  substitutionCount === null
                    ? "取得失敗"
                    : substitutionCount > 0
                    ? "あり"
                    : "なし",
                代替候補件数: substitutionCount ?? undefined,
                rohsStatus: compliance.rohs,
                reachStatus: compliance.reach,
                lifecycleStatus: lifecycleStatus,
              };
              rowsWithRisk.push(riskRow);

              await setCache(
                { namespace: partCacheNamespace, key: partKey },
                {
                  riskLevel,
                  substitutionCount,
                  rohsStatus: compliance.rohs,
                  reachStatus: compliance.reach,
                  lifecycleStatus,
                }
              );
            } else {
              const failRow: BOMRowWithRisk = {
                ...row,
                リスク: "取得失敗" as const,
                代替候補有無: "取得失敗" as const,
                rohsStatus: "N/A" as const,
                reachStatus: "N/A" as const,
                lifecycleStatus: "N/A" as const,
              };
              rowsWithRisk.push(failRow);
              await setCache(
                { namespace: partCacheNamespace, key: partKey },
                {
                  riskLevel: "取得失敗" as const,
                  substitutionCount: null,
                  rohsStatus: "N/A" as const,
                  reachStatus: "N/A" as const,
                  lifecycleStatus: "N/A" as const,
                }
              );
            }
          } catch (err) {
            console.error(`リスク取得エラー (${row.部品型番}):`, err);
            const failRow: BOMRowWithRisk = {
              ...row,
              リスク: "取得失敗" as const,
              代替候補有無: "取得失敗" as const,
              rohsStatus: "N/A" as const,
              reachStatus: "N/A" as const,
              lifecycleStatus: "N/A" as const,
            };
            rowsWithRisk.push(failRow);
            await setCache(
              { namespace: partCacheNamespace, key: partKey },
              {
                riskLevel: "取得失敗" as const,
                substitutionCount: null,
                rohsStatus: "N/A" as const,
                reachStatus: "N/A" as const,
                lifecycleStatus: "N/A" as const,
              }
            );
          }

          await new Promise((resolve) => setTimeout(resolve, 200));
        }

        return rowsWithRisk;
      }
    );

    return NextResponse.json(rowsWithRisk, {
      headers: {
        "X-Cache": fromCache ? "HIT" : "MISS",
      },
    });
  } catch (error) {
    console.error("BOMデータ取得エラー:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to get BOM data",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
