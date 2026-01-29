"use client";

import { useMemo } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ExternalLink, FileText } from "lucide-react";
import { DataTable, type CsvColumnConfig } from "@/components/ui/data-table";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { CandidateDetailedInfo } from "../_lib/types";
import { SubstituteTypeBadge } from "./substitute-type-badge";

interface CrossReferenceTableViewProps {
  candidates: CandidateDetailedInfo[];
  targetProduct?: CandidateDetailedInfo;
}

/**
 * クロスリファレンステーブルビュー
 * DigiKey APIで取得できるすべての詳細データを比較表示
 */
export function CrossReferenceTableView({
  candidates,
  targetProduct,
}: CrossReferenceTableViewProps) {
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
    return generateColumns(tableData, !!targetProduct);
  }, [tableData, targetProduct]);

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

    // 動的パラメータを追加
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
      />
    </div>
  );
}

/**
 * 候補データから動的カラムを生成
 */
function generateColumns(
  candidates: CandidateDetailedInfo[],
  hasTargetProduct: boolean
): ColumnDef<CandidateDetailedInfo>[] {
  // 全候補からユニークなパラメータ名を収集
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

  // 動的パラメータカラムを生成
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

  return [...fixedColumns, ...parameterColumns];
}
