import type { BOMRow, BOMRowWithRisk, PartCacheValue } from "@/app/bom/_lib/types";
import { getRiskLevel, getComplianceFromProduct } from "@/app/risk-assessment/_lib/compliance-utils";
import type { DigiKeyApiClient } from "@/app/_lib/vendor/digikey/client";
import { buildCacheKey, getCache, setCache } from "@/app/_lib/cache";

function normalizeLifecycleStatus(
  productStatus?: string
): BOMRowWithRisk["lifecycleStatus"] {
  if (!productStatus) return "Unknown";
  const statusLower = productStatus.toLowerCase();
  if (statusLower === "active") return "Active";
  if (statusLower.includes("not for new designs") || statusLower.includes("nrnd")) return "NRND";
  if (statusLower.includes("obsolete") || statusLower.includes("discontinued")) return "Obsolete";
  if (statusLower.includes("last time buy") || statusLower.includes("eol") || statusLower.includes("end of life")) return "EOL";
  return "Unknown";
}

const PART_CACHE_NAMESPACE = "bom-part";

/**
 * BOM行にDigiKeyでリスク情報を付与する（部品キャッシュがあればAPIをスキップ）
 */
export async function enrichBomRows(
  rows: BOMRow[],
  client: DigiKeyApiClient
): Promise<BOMRowWithRisk[]> {
  const rowsWithRisk: BOMRowWithRisk[] = [];

  for (const row of rows) {
    const mpn = row.部品型番.trim();
    const partKey = buildCacheKey({ mpn });
    const cachedPart = await getCache<PartCacheValue>({
      namespace: PART_CACHE_NAMESPACE,
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
        const lifecycleStatus = normalizeLifecycleStatus(product.ProductStatus?.Status);
        const digiKeyProductNumber = product.ProductVariations?.[0]?.DigiKeyProductNumber;
        const productNumberForSubstitutions =
          digiKeyProductNumber || product.ManufacturerProductNumber || "";
        let substitutionCount: number | null = null;
        if (productNumberForSubstitutions) {
          try {
            const substitutionsResult = await client.getSubstitutions({
              productNumber: productNumberForSubstitutions,
            });
            substitutionCount = substitutionsResult.ProductSubstitutes?.length ?? 0;
          } catch (subError) {
            console.error(`代替候補取得エラー (${row.部品型番}):`, subError);
          }
        }
        let riskLevel = getRiskLevel(
          compliance,
          product.ProductStatus?.Status,
          substitutionCount
        );
        if (lifecycleStatus === "EOL" && riskLevel !== "High") riskLevel = "High";
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
          lifecycleStatus,
        };
        rowsWithRisk.push(riskRow);
        await setCache(
          { namespace: PART_CACHE_NAMESPACE, key: partKey },
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
          { namespace: PART_CACHE_NAMESPACE, key: partKey },
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
        { namespace: PART_CACHE_NAMESPACE, key: partKey },
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
