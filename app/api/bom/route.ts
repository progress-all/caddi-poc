import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { parseCSV } from "@/app/_lib/csv-utils";
import type { BOMRow, BOMRowWithRisk } from "@/app/bom/_lib/types";
import { getRiskLevel, getComplianceFromProduct } from "@/app/risk-assessment/_lib/compliance-utils";
import { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import { withCache, buildCacheKey } from "@/app/_lib/cache";

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
        const publicDir = path.join(process.cwd(), "public");
        const csvPath = path.join(publicDir, "data", `${bomId}.csv`);

        // CSVファイルを読み込み
        let csvText: string;
        try {
          csvText = await fs.readFile(csvPath, "utf-8");
        } catch (csvError) {
          throw new Error(`BOM file not found: ${bomId}.csv`);
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

        // 各部品のリスクを取得
        const rowsWithRisk: BOMRowWithRisk[] = [];

        for (const row of rows) {
          try {
            // 部品型番でDigiKey APIを検索
            const searchResult = await client.keywordSearch({
              keywords: row.部品型番,
              limit: 1,
            });

            if (searchResult.Products && searchResult.Products.length > 0) {
              const product = searchResult.Products[0];
              const compliance = getComplianceFromProduct(product);

              // ライフサイクルステータスを正規化
              const lifecycleStatus = normalizeLifecycleStatus(
                product.ProductStatus?.Status
              );

              // 代替候補の件数を取得
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
                  // エラー時はnullのまま（既存判定を据え置く）
                }
              }

              // リスクを算出（総合評価）
              let riskLevel = getRiskLevel(
                compliance,
                product.ProductStatus?.Status,
                substitutionCount
              );
              // 表示上のライフサイクルがEOLの場合は顕在リスク（High）とする
              if (lifecycleStatus === "EOL" && riskLevel !== "High") {
                riskLevel = "High";
              }

              rowsWithRisk.push({
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
              });
            } else {
              // 検索結果が見つからない場合
              rowsWithRisk.push({
                ...row,
                リスク: "取得失敗" as const,
                代替候補有無: "取得失敗" as const,
                rohsStatus: "N/A" as const,
                reachStatus: "N/A" as const,
                lifecycleStatus: "N/A" as const,
              });
            }
          } catch (err) {
            console.error(`リスク取得エラー (${row.部品型番}):`, err);
            rowsWithRisk.push({
              ...row,
              リスク: "取得失敗" as const,
              代替候補有無: "取得失敗" as const,
              rohsStatus: "N/A" as const,
              reachStatus: "N/A" as const,
              lifecycleStatus: "N/A" as const,
            });
          }

          // APIレートリミット対策: 200ms待機
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
