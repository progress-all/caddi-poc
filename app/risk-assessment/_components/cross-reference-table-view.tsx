"use client";

import { useMemo, useState } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, FileText, Loader2 } from "lucide-react";
import { DataTable, type CsvColumnConfig } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateDetailedInfo } from "../_lib/types";
import { SubstituteTypeBadge } from "./substitute-type-badge";
import { SimilarityScoreModal } from "./similarity-score-modal";

interface CrossReferenceTableViewProps {
  candidates: CandidateDetailedInfo[];
  targetProduct?: CandidateDetailedInfo;
  /** データシートパラメーターの読み込み中フラグ */
  isLoadingDatasheet?: boolean;
}

/**
 * クロスリファレンステーブルビュー
 * DigiKey APIで取得できるすべての詳細データを比較表示
 */
export function CrossReferenceTableView({
  candidates,
  targetProduct,
  isLoadingDatasheet = false,
}: CrossReferenceTableViewProps) {
  // モーダルの状態管理
  const [selectedCandidate, setSelectedCandidate] =
    useState<CandidateDetailedInfo | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // スコアクリックハンドラ
  const handleScoreClick = (candidate: CandidateDetailedInfo) => {
    if (!targetProduct) return;
    setSelectedCandidate(candidate);
    setIsModalOpen(true);
  };

  // 対象部品と候補を結合（対象部品を先頭に）
  const tableData = useMemo(() => {
    const allData: CandidateDetailedInfo[] = [];
    if (targetProduct) {
      allData.push(targetProduct);
    }
    allData.push(...candidates);
    return allData;
  }, [candidates, targetProduct]);

  // 動的カラムを生成（対象部品も含めてパラメータを収集）
  const columns = useMemo(() => {
    return generateColumns(
      tableData,
      !!targetProduct,
      isLoadingDatasheet,
      handleScoreClick
    );
  }, [tableData, targetProduct, isLoadingDatasheet]);

  // 対象部品の行かどうかを判定する関数
  const getRowClassName = (row: CandidateDetailedInfo) => {
    // 対象部品が存在し、かつ同じ製品番号の場合
    if (
      targetProduct &&
      (targetProduct.digiKeyProductNumber === row.digiKeyProductNumber ||
        (targetProduct.digiKeyProductNumber === "" &&
          targetProduct.manufacturerProductNumber ===
            row.manufacturerProductNumber))
    ) {
      return "bg-primary/10 dark:bg-primary/20 border-l-4 border-l-primary font-semibold";
    }
    return "";
  };

  // CSVエクスポート用のカラム設定を生成
  const csvColumnAccessors = useMemo(() => {
    const configs: CsvColumnConfig<CandidateDetailedInfo>[] = [
      {
        header: "Mfr Part #",
        accessor: (row) => row.manufacturerProductNumber,
      },
      {
        header: "Description",
        accessor: (row) => row.description,
      },
      {
        header: "Manufacturer",
        accessor: (row) => row.manufacturerName,
      },
      {
        header: "Match Type",
        accessor: (row) => {
          // 対象部品かどうかを判定
          if (
            targetProduct &&
            (targetProduct.digiKeyProductNumber === row.digiKeyProductNumber ||
              (targetProduct.digiKeyProductNumber === "" &&
                targetProduct.manufacturerProductNumber ===
                  row.manufacturerProductNumber))
          ) {
            return "Target";
          }
          return row.substituteType || "";
        },
      },
      {
        header: "Similarity",
        accessor: (row) => {
          // 対象部品の場合は空文字
          if (
            targetProduct &&
            (targetProduct.digiKeyProductNumber === row.digiKeyProductNumber ||
              (targetProduct.digiKeyProductNumber === "" &&
                targetProduct.manufacturerProductNumber ===
                  row.manufacturerProductNumber))
          ) {
            return "";
          }
          return row.similarityScore !== undefined && row.similarityScore !== null
            ? row.similarityScore.toString()
            : "";
        },
      },
      {
        header: "Unit Price",
        accessor: (row) => (row.unitPrice ? `$${row.unitPrice}` : ""),
      },
      {
        header: "Quantity Available",
        accessor: (row) => row.quantityAvailable.toLocaleString(),
      },
      {
        header: "DigiKey Part Number",
        accessor: (row) => row.digiKeyProductNumber,
      },
      {
        header: "Product URL",
        accessor: (row) => row.productUrl || "",
      },
      {
        header: "Part Status",
        accessor: (row) => row.partStatus || "",
      },
      {
        header: "Series",
        accessor: (row) => row.series || "",
      },
      {
        header: "Category",
        accessor: (row) => row.category?.name || "",
      },
      {
        header: "Datasheet URL",
        accessor: (row) => row.datasheetUrl || "",
      },
      {
        header: "Lead Time",
        accessor: (row) =>
          row.manufacturerLeadWeeks
            ? `${row.manufacturerLeadWeeks} weeks`
            : "",
      },
      {
        header: "RoHS",
        accessor: (row) => row.classifications?.rohs || "",
      },
      {
        header: "REACH",
        accessor: (row) => row.classifications?.reach || "",
      },
    ];

    // 動的パラメータを追加（DigiKey）
    const parameterNames = new Set<string>();
    for (const candidate of tableData) {
      if (candidate.parameters) {
        for (const param of candidate.parameters) {
          if (param.name) {
            parameterNames.add(param.name);
          }
        }
      }
    }

    const sortedParameterNames = Array.from(parameterNames).sort();
    for (const paramName of sortedParameterNames) {
      configs.push({
        header: paramName,
        accessor: (row) => {
          const param = row.parameters?.find((p) => p.name === paramName);
          return param?.value || "";
        },
      });
    }

    // データシートパラメーターを追加
    const datasheetParameterIds = new Set<string>();
    for (const candidate of tableData) {
      if (candidate.datasheetParameters) {
        for (const paramId of Object.keys(candidate.datasheetParameters)) {
          datasheetParameterIds.add(paramId);
        }
      }
    }

    const sortedDatasheetParameterIds = Array.from(datasheetParameterIds).sort();
    for (const paramId of sortedDatasheetParameterIds) {
      configs.push({
        header: `[DS] ${paramId}`,
        accessor: (row) => {
          const param = row.datasheetParameters?.[paramId];
          return param?.value || "";
        },
      });
    }

    return configs;
  }, [tableData, targetProduct]);

  return (
    <div className="w-full h-full min-h-0 flex flex-col">
      <DataTable
        columns={columns}
        data={tableData}
        enableSorting={true}
        enableFiltering={false}
        enablePagination={true}
        enableColumnVisibility={true}
        pageSize={20}
        getRowClassName={getRowClassName}
        enableCsvExport={true}
        csvFilenamePrefix="similar-search"
        csvColumnAccessors={csvColumnAccessors}
        enableStickyHeader={true}
        maxHeight="calc(100vh - 300px)"
      />
      {/* スコア内訳モーダル */}
      {targetProduct && selectedCandidate && (
        <SimilarityScoreModal
          open={isModalOpen}
          onOpenChange={setIsModalOpen}
          targetProduct={targetProduct}
          candidate={selectedCandidate}
        />
      )}
    </div>
  );
}

/**
 * 候補データから動的カラムを生成
 */
function generateColumns(
  candidates: CandidateDetailedInfo[],
  hasTargetProduct: boolean,
  isLoadingDatasheet: boolean,
  onScoreClick?: (candidate: CandidateDetailedInfo) => void
): ColumnDef<CandidateDetailedInfo>[] {
  // 全候補からユニークなパラメータ名を収集（DigiKey）
  const parameterNames = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.parameters) {
      for (const param of candidate.parameters) {
        if (param.name) {
          parameterNames.add(param.name);
        }
      }
    }
  }

  // パラメータ名でソート（アルファベット順）
  const sortedParameterNames = Array.from(parameterNames).sort();

  // 全候補からユニークなデータシートパラメーターIDを収集
  const datasheetParameterIds = new Set<string>();
  for (const candidate of candidates) {
    if (candidate.datasheetParameters) {
      for (const paramId of Object.keys(candidate.datasheetParameters)) {
        datasheetParameterIds.add(paramId);
      }
    }
  }

  // データシートパラメーターIDでソート（アルファベット順）
  const sortedDatasheetParameterIds = Array.from(datasheetParameterIds).sort();

  // 固定カラム
  const fixedColumns: ColumnDef<CandidateDetailedInfo>[] = [
    {
      accessorKey: "photoUrl",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="画像" />
      ),
      cell: ({ row }) => {
        const photoUrl = row.original.photoUrl;
        return (
          <div className="w-16 h-16 flex items-center justify-center">
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photoUrl}
                alt={row.original.manufacturerProductNumber}
                className="w-full h-full object-contain border rounded"
              />
            ) : (
              <span className="text-xs text-muted-foreground">No img</span>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "manufacturerProductNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Mfr Part #" />
      ),
      cell: ({ row, table }) => {
        const candidate = row.original;
        const isTargetProduct = hasTargetProduct && table.getRowModel().rows[0]?.id === row.id;
        return (
          <div className="space-y-1 min-w-[200px]">
            <div className={`text-sm ${isTargetProduct ? "font-bold text-primary" : "font-medium"}`}>
              {candidate.manufacturerProductNumber}
            </div>
            <div className="text-xs text-muted-foreground line-clamp-2">
              {candidate.description}
            </div>
            <div className="text-xs text-muted-foreground">
              {candidate.manufacturerName}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: "substituteType",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Match Type" />
      ),
      cell: ({ row, table }) => {
        // 対象部品かどうかを判定（データの先頭かつtargetProductが存在する場合）
        const isTargetProduct = hasTargetProduct && table.getRowModel().rows[0]?.id === row.id;
        if (isTargetProduct) {
          return (
            <Badge variant="default" className="text-xs bg-primary text-primary-foreground font-bold">
              Target
            </Badge>
          );
        }
        const substituteType = row.original.substituteType;
        if (!substituteType) return null;
        return <SubstituteTypeBadge type={substituteType} className="text-xs" />;
      },
    },
    {
      accessorKey: "similarityScore",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Similarity" />
      ),
      cell: ({ row, table }) => {
        // 対象部品の場合は表示しない
        const isTargetProduct = hasTargetProduct && table.getRowModel().rows[0]?.id === row.id;
        if (isTargetProduct) {
          return <span className="text-muted-foreground">-</span>;
        }

        const score = row.original.similarityScore;
        if (score === undefined || score === null) {
          return <span className="text-muted-foreground">-</span>;
        }

        // スコアに応じた色を決定
        const getScoreColor = (s: number) => {
          if (s >= 80) return "text-green-600 dark:text-green-400";
          if (s >= 60) return "text-yellow-600 dark:text-yellow-400";
          return "text-red-600 dark:text-red-400";
        };

        return (
          <button
            onClick={() => onScoreClick?.(row.original)}
            className="flex items-center gap-2 min-w-[100px] cursor-pointer hover:bg-muted/50 rounded px-1 py-0.5 transition-colors w-full text-left"
            type="button"
          >
            <span className={`text-sm font-medium ${getScoreColor(score)}`}>
              {score}
            </span>
            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  score >= 80
                    ? "bg-green-500"
                    : score >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
                }`}
                style={{ width: `${score}%` }}
              />
            </div>
          </button>
        );
      },
    },
    {
      accessorKey: "unitPrice",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Unit Price" />
      ),
      cell: ({ row }) => {
        const unitPrice = row.original.unitPrice;
        return unitPrice ? `$${unitPrice}` : "-";
      },
    },
    {
      accessorKey: "quantityAvailable",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Quantity Available" />
      ),
      cell: ({ row }) => {
        const qty = row.original.quantityAvailable;
        return qty.toLocaleString();
      },
    },
    {
      accessorKey: "digiKeyProductNumber",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="DigiKey Part Number" />
      ),
      cell: ({ row }) => {
        const dkPn = row.original.digiKeyProductNumber;
        const productUrl = row.original.productUrl;
        return (
          <div className="flex items-center gap-2">
            <span className="text-sm">{dkPn}</span>
            {productUrl && (
              <a
                href={productUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: "partStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Part Status" />
      ),
      cell: ({ row }) => {
        const status = row.original.partStatus;
        if (!status) return "-";
        const variant =
          status === "Active"
            ? "default"
            : status === "Obsolete"
            ? "destructive"
            : "secondary";
        return <Badge variant={variant}>{status}</Badge>;
      },
    },
    {
      accessorKey: "series",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Series" />
      ),
      cell: ({ row }) => {
        return row.original.series || "-";
      },
    },
    {
      accessorKey: "category",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Category" />
      ),
      cell: ({ row }) => {
        return row.original.category?.name || "-";
      },
    },
    {
      accessorKey: "datasheetUrl",
      header: () => <div className="text-xs">Datasheet</div>,
      cell: ({ row }) => {
        const datasheetUrl = row.original.datasheetUrl;
        if (!datasheetUrl) return "-";
        return (
          <a
            href={datasheetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            <FileText className="w-4 h-4" />
          </a>
        );
      },
      enableSorting: false,
    },
    {
      accessorKey: "manufacturerLeadWeeks",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Lead Time" />
      ),
      cell: ({ row }) => {
        const leadWeeks = row.original.manufacturerLeadWeeks;
        return leadWeeks ? `${leadWeeks} weeks` : "-";
      },
    },
    {
      accessorKey: "classifications",
      header: () => <div className="text-xs">RoHS / REACH</div>,
      cell: ({ row }) => {
        const classifications = row.original.classifications;
        if (!classifications) return "-";
        return (
          <div className="space-y-1 text-xs">
            {classifications.rohs && (
              <div>RoHS: {classifications.rohs}</div>
            )}
            {classifications.reach && (
              <div>REACH: {classifications.reach}</div>
            )}
          </div>
        );
      },
      enableSorting: false,
    },
  ];

  // 動的パラメータカラムを生成（DigiKey）
  const parameterColumns: ColumnDef<CandidateDetailedInfo>[] =
    sortedParameterNames.map((paramName) => ({
      id: `param_${paramName}`,
      accessorFn: (row: CandidateDetailedInfo) => {
        const param = row.parameters?.find((p) => p.name === paramName);
        return param?.value || null;
      },
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title={paramName} />
      ),
      cell: ({ row }) => {
        const param = row.original.parameters?.find(
          (p) => p.name === paramName
        );
        return param?.value || "-";
      },
    }));

  // データシートパラメーターカラムを生成
  const datasheetParameterColumns: ColumnDef<CandidateDetailedInfo>[] =
    sortedDatasheetParameterIds.map((paramId) => {
      // パラメーターの説明を取得（最初に見つかった候補から）
      const firstCandidateWithParam = candidates.find(
        (c) => c.datasheetParameters?.[paramId]
      );
      const paramDescription =
        firstCandidateWithParam?.datasheetParameters?.[paramId]?.description ||
        paramId;

      return {
        id: `datasheet_${paramId}`,
        accessorFn: (row: CandidateDetailedInfo) => {
          const param = row.datasheetParameters?.[paramId];
          return param?.value || null;
        },
        header: ({ column }) => (
          <div className="space-y-0.5">
            <DataTableColumnHeader
              column={column}
              title={paramId}
            />
            <div className="text-xs text-muted-foreground font-normal leading-tight">
              {paramDescription}
            </div>
          </div>
        ),
        cell: ({ row }) => {
          const param = row.original.datasheetParameters?.[paramId];
          return <div className="text-sm">{param?.value || "-"}</div>;
        },
      };
    });

  // データシート読み込み中の場合、プレースホルダーカラムを追加
  if (isLoadingDatasheet && sortedDatasheetParameterIds.length === 0) {
    const loadingColumn: ColumnDef<CandidateDetailedInfo> = {
      id: "datasheet_loading",
      header: () => (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>[DS] 読み込み中...</span>
        </div>
      ),
      cell: () => (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
        </div>
      ),
    };
    return [...fixedColumns, ...parameterColumns, loadingColumn];
  }

  return [...fixedColumns, ...parameterColumns, ...datasheetParameterColumns];
}
