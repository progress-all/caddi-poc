"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DataTable } from "@/components/ui/data-table";
import type { ColumnDef } from "@tanstack/react-table";
import { parseCSV } from "@/app/_lib/csv-utils";
import type { BOMRowWithRisk, BOMRow } from "./_lib/types";
import { getRiskLevel, getComplianceFromProduct } from "@/app/risk-assessment/_lib/compliance-utils";
import { searchByKeyword, getSubstitutions } from "@/app/_lib/vendor/digikey/api";
import { cn } from "@/app/_lib/utils";

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

// リスクレベルの表示設定
const riskLevelConfig: Record<
  BOMRowWithRisk["リスク"],
  { label: string; className: string }
> = {
  High: {
    label: "High",
    className: "bg-red-500 text-white border-red-600",
  },
  Medium: {
    label: "Medium",
    className: "bg-yellow-500 text-white border-yellow-600",
  },
  Low: {
    label: "Low",
    className: "bg-green-500 text-white border-green-600",
  },
  取得中: {
    label: "取得中",
    className: "bg-gray-400 text-white border-gray-500",
  },
  取得失敗: {
    label: "取得失敗",
    className: "bg-gray-600 text-white border-gray-700",
  },
};

// ライフサイクルステータスの表示設定
const lifecycleStatusConfig: Record<
  BOMRowWithRisk["lifecycleStatus"],
  { label: string; className: string }
> = {
  Active: {
    label: "Active",
    className: "bg-green-500 text-white border-green-600",
  },
  NRND: {
    label: "NRND",
    className: "bg-yellow-500 text-white border-yellow-600",
  },
  Obsolete: {
    label: "Obsolete",
    className: "bg-red-500 text-white border-red-600",
  },
  EOL: {
    label: "EOL",
    className: "bg-red-500 text-white border-red-600",
  },
  Unknown: {
    label: "Unknown",
    className: "bg-gray-500 text-white border-gray-600",
  },
  "N/A": {
    label: "N/A",
    className: "bg-gray-500 text-white border-gray-600",
  },
};

// 規制ステータスの表示設定
const complianceStatusConfig: Record<
  BOMRowWithRisk["rohsStatus"] | BOMRowWithRisk["reachStatus"],
  { label: string; className: string }
> = {
  Compliant: {
    label: "Compliant",
    className: "bg-green-500 text-white border-green-600",
  },
  NonCompliant: {
    label: "Non-Compliant",
    className: "bg-red-500 text-white border-red-600",
  },
  Unknown: {
    label: "Unknown",
    className: "bg-gray-500 text-white border-gray-600",
  },
  "N/A": {
    label: "N/A",
    className: "bg-gray-500 text-white border-gray-600",
  },
};

export default function BOMPage() {
  const [bomData, setBomData] = useState<BOMRowWithRisk[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // CSVを読み込んでリスクを算出
  useEffect(() => {
    const loadBOMData = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // CSVファイルを取得
        const response = await fetch("/data/bom.csv");
        if (!response.ok) {
          throw new Error(`CSVファイルの読み込みに失敗しました: ${response.status}`);
        }

        const csvText = await response.text();
        const parsedRows = parseCSV<Record<string, string>>(csvText);
        const rows = parsedRows as unknown as BOMRow[];

        // 初期状態でリスクを「取得中」に設定
        const rowsWithRisk: BOMRowWithRisk[] = rows.map((row) => ({
          ...row,
          リスク: "取得中" as const,
          代替候補有無: "判定中" as const,
          rohsStatus: "N/A" as const,
          reachStatus: "N/A" as const,
          lifecycleStatus: "N/A" as const,
        }));

        setBomData(rowsWithRisk);

        // 各部品のリスクを非同期で取得
        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];
          try {
            // 部品型番でDigiKey APIを検索
            const searchResult = await searchByKeyword({
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
                  const substitutionsResult = await getSubstitutions({
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
              const riskLevel = getRiskLevel(
                compliance,
                product.ProductStatus?.Status,
                substitutionCount
              );

              // 状態を更新
              setBomData((prev) => {
                const updated = [...prev];
                updated[i] = {
                  ...updated[i],
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
                return updated;
              });
            } else {
              // 検索結果が見つからない場合
              setBomData((prev) => {
                const updated = [...prev];
                updated[i] = {
                  ...updated[i],
                  リスク: "取得失敗" as const,
                  代替候補有無: "取得失敗" as const,
                  rohsStatus: "N/A" as const,
                  reachStatus: "N/A" as const,
                  lifecycleStatus: "N/A" as const,
                };
                return updated;
              });
            }
          } catch (err) {
            console.error(`リスク取得エラー (${row.部品型番}):`, err);
            setBomData((prev) => {
              const updated = [...prev];
              updated[i] = {
                ...updated[i],
                リスク: "取得失敗" as const,
                代替候補有無: "取得失敗" as const,
                rohsStatus: "N/A" as const,
                reachStatus: "N/A" as const,
                lifecycleStatus: "N/A" as const,
              };
              return updated;
            });
          }

          // APIレートリミット対策: 200ms待機
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      } catch (err) {
        console.error("BOMデータ読み込みエラー:", err);
        setError(
          err instanceof Error ? err.message : "BOMデータの読み込みに失敗しました"
        );
      } finally {
        setIsLoading(false);
      }
    };

    loadBOMData();
  }, []);

  // リスクの高い順にソート（High → Medium → Low → 取得中 → 取得失敗）
  const sortedData = useMemo(() => {
    const riskOrder: Record<BOMRowWithRisk["リスク"], number> = {
      High: 0,
      Medium: 1,
      Low: 2,
      取得中: 3,
      取得失敗: 4,
    };

    return [...bomData].sort((a, b) => {
      const orderDiff = riskOrder[a.リスク] - riskOrder[b.リスク];
      if (orderDiff !== 0) return orderDiff;
      // 同一リスク内では部品型番順
      return a.部品型番.localeCompare(b.部品型番);
    });
  }, [bomData]);

  // テーブルの列定義
  const columns: ColumnDef<BOMRowWithRisk>[] = [
    {
      accessorKey: "部品型番",
      header: "部品型番",
      cell: ({ row }) => (
        <Link
          href={`/risk-assessment?keyword=${encodeURIComponent(row.original.部品型番)}`}
          className="font-medium text-sm text-primary hover:underline"
        >
          {row.original.部品型番}
        </Link>
      ),
    },
    {
      accessorKey: "メーカー",
      header: "メーカー",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.メーカー}</div>
      ),
    },
    {
      accessorKey: "カテゴリ",
      header: "カテゴリ",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.カテゴリ}</div>
      ),
    },
    {
      accessorKey: "サブシステム",
      header: "サブシステム",
      cell: ({ row }) => (
        <div className="text-sm">{row.original.サブシステム}</div>
      ),
    },
    {
      accessorKey: "rohsStatus",
      header: "RoHS",
      cell: ({ row }) => {
        const status = row.original.rohsStatus;
        const config = complianceStatusConfig[status];
        return (
          <Badge className={cn("text-xs px-2 py-0.5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "reachStatus",
      header: "REACH",
      cell: ({ row }) => {
        const status = row.original.reachStatus;
        const config = complianceStatusConfig[status];
        return (
          <Badge className={cn("text-xs px-2 py-0.5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "lifecycleStatus",
      header: "ライフサイクル",
      cell: ({ row }) => {
        const status = row.original.lifecycleStatus;
        const config = lifecycleStatusConfig[status];
        return (
          <Badge className={cn("text-xs px-2 py-0.5", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "リスク",
      header: "リスク",
      cell: ({ row }) => {
        const risk = row.original.リスク;
        const config = riskLevelConfig[risk];
        return (
          <Badge className={cn("text-sm px-3 py-1", config.className)}>
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "代替候補有無",
      header: "代替・類似候補",
      cell: ({ row }) => {
        const hasSubs = row.original.代替候補有無;
        const count = row.original.代替候補件数;
        if (hasSubs === "あり" && count !== undefined) {
          return (
            <div className="text-sm">
              {hasSubs}（{count}件）
            </div>
          );
        }
        return <div className="text-sm">{hasSubs}</div>;
      },
    },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">BOM一覧</h1>
        <p className="text-sm text-muted-foreground">
          部品のリスク評価と代替候補の有無を表示します（リスクの高い順）
        </p>
      </div>

      <Card className="flex-1 min-h-0 flex flex-col">
        <CardHeader className="flex-shrink-0">
          <CardTitle className="text-base">
            BOM一覧 ({sortedData.length}件)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 min-h-0 overflow-hidden">
          {error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <p className="font-medium">エラー</p>
              <p>{error}</p>
            </div>
          ) : (
            <div className="h-full min-h-[500px]">
              <DataTable
                columns={columns}
                data={sortedData}
                searchKey="部品型番"
                enableSorting={true}
                enableFiltering={true}
                enablePagination={true}
                enableColumnVisibility={true}
                pageSize={50}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
