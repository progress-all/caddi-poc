"use client";

import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DataTableColumnHeader } from "@/components/ui/data-table-column-header";

// 空状態コンポーネント
export function EmptyState() {
  return (
    <div className="py-8 text-center text-muted-foreground">
      <p>検索結果が見つかりませんでした。</p>
    </div>
  );
}

// キー値タグのプロパティ
interface KeyValueTagsProps {
  items: unknown[];
  formatFn?: (item: unknown) => string;
}

// 配列値をバッジで表示するコンポーネント
export function KeyValueTags({ items, formatFn }: KeyValueTagsProps) {
  if (!Array.isArray(items) || items.length === 0) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  // 最大2つまでのバッジを表示
  const displayItems = items.slice(0, 2);
  const hasMore = items.length > 2;

  // 全アイテムのフルテキストを生成（ツールチップ用）
  const fullText = items
    .map((item, i) => {
      if (formatFn) {
        return `${i + 1}. ${formatFn(item)}`;
      } else if (typeof item === "object" && item !== null) {
        const entries = Object.entries(item);
        return `${i + 1}. ${entries.map(([k, v]) => `${k}: ${v ?? "-"}`).join(", ")}`;
      }
      return `${i + 1}. ${String(item)}`;
    })
    .join("\n");

  return (
    <div
      className="flex flex-nowrap gap-1 max-h-[2.5rem] overflow-x-auto scrollbar-thin cursor-help"
      title={fullText}
    >
      {displayItems.map((item, index) => {
        let displayText: string;
        let fullItemText: string;

        if (formatFn) {
          fullItemText = formatFn(item);
          displayText = fullItemText;
        } else if (typeof item === "object" && item !== null) {
          // オブジェクトの場合は主要なkey:valueペアを抽出
          const entries = Object.entries(item);
          if (entries.length > 0) {
            fullItemText = entries
              .map(([key, value]) => {
                const val = value === null || value === undefined ? "-" : String(value);
                return `${key}: ${val}`;
              })
              .join(", ");
            displayText = entries
              .slice(0, 2) // 最大2つのペアまで表示
              .map(([key, value]) => {
                const val = value === null || value === undefined ? "-" : String(value);
                return `${key}: ${val}`;
              })
              .join(", ");
          } else {
            fullItemText = JSON.stringify(item);
            displayText = fullItemText;
          }
        } else {
          fullItemText = String(item);
          displayText = fullItemText;
        }

        // テキストを短縮（表示用のみ）
        if (displayText.length > 30) {
          displayText = displayText.substring(0, 30) + "...";
        }

        return (
          <Badge
            key={index}
            variant="secondary"
            className="text-[10px] px-1 py-0 h-4 leading-4 whitespace-nowrap flex-shrink-0"
            title={fullItemText}
          >
            {displayText}
          </Badge>
        );
      })}
      {hasMore && (
        <Badge
          variant="secondary"
          className="text-[10px] px-1 py-0 h-4 leading-4 whitespace-nowrap flex-shrink-0"
          title={`他 ${items.length - 2} 件\n\n${fullText}`}
        >
          +{items.length - 2}
        </Badge>
      )}
    </div>
  );
}

// ProductVariationのフォーマッター
export function formatProductVariation(item: unknown): string {
  if (typeof item === "object" && item !== null) {
    const pv = item as {
      DigiKeyProductNumber?: string;
      PackageType?: { Name?: string };
      UnitPrice?: number;
      QuantityAvailableforPackageType?: number;
    };
    const parts: string[] = [];
    if (pv.DigiKeyProductNumber) parts.push(`PN: ${pv.DigiKeyProductNumber}`);
    if (pv.PackageType?.Name) parts.push(`Package: ${pv.PackageType.Name}`);
    if (pv.UnitPrice !== undefined) parts.push(`Price: $${pv.UnitPrice}`);
    if (pv.QuantityAvailableforPackageType !== undefined)
      parts.push(`Qty: ${pv.QuantityAvailableforPackageType}`);
    return parts.length > 0 ? parts.join(", ") : JSON.stringify(item);
  }
  return JSON.stringify(item);
}

// Parameterのフォーマッター
export function formatParameter(item: unknown): string {
  if (typeof item === "object" && item !== null) {
    const param = item as {
      ParameterText?: string;
      ValueText?: string;
    };
    if (param.ParameterText && param.ValueText !== undefined) {
      return `${param.ParameterText}: ${param.ValueText}`;
    }
  }
  return JSON.stringify(item);
}

// セル値のレンダリング関数
export function renderCellValue(
  value: unknown,
  fieldName: string
): React.ReactNode {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground text-xs">-</span>;
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const text = String(value);
    return (
      <div className="text-xs line-clamp-2 max-w-xs" title={text}>
        {text}
      </div>
    );
  }

  if (Array.isArray(value)) {
    if (fieldName === "ProductVariations") {
      return <KeyValueTags items={value} formatFn={formatProductVariation} />;
    }
    if (fieldName === "Parameters") {
      return <KeyValueTags items={value} formatFn={formatParameter} />;
    }
    if (fieldName === "OtherNames") {
      return <KeyValueTags items={value} />;
    }
    return <KeyValueTags items={value} />;
  }

  if (typeof value === "object") {
    // ネストされたオブジェクトの場合は主要なフィールドを表示
    const entries = Object.entries(value);
    if (entries.length > 0) {
      const displayText = entries
        .slice(0, 2)
        .map(([key, val]) => {
          const v = val === null || val === undefined ? "-" : String(val);
          return `${key}: ${v}`;
        })
        .join(", ");
      const fullText = entries
        .map(([key, val]) => {
          const v = val === null || val === undefined ? "-" : String(val);
          return `${key}: ${v}`;
        })
        .join(", ");
      return (
        <div className="text-xs line-clamp-2 max-w-xs" title={fullText}>
          {displayText}
        </div>
      );
    }
    return <KeyValueTags items={[value]} />;
  }

  const text = JSON.stringify(value);
  return (
    <div className="text-xs line-clamp-2 max-w-xs" title={text}>
      {text}
    </div>
  );
}

// ラベルを生成（キャメルケースをスペース区切りに変換）
export function formatLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// 動的カラム定義を生成する関数
export function createDynamicColumns<T extends Record<string, unknown>>(
  items: T[],
  priorityKeys: string[]
): ColumnDef<T>[] {
  // すべてのアイテムからすべてのキーを収集
  const allKeys = new Set<string>();
  items.forEach((item) => {
    Object.keys(item).forEach((key) => allKeys.add(key));
  });

  // キーを配列に変換してソート（優先キーを先頭に配置）
  const sortedKeys = Array.from(allKeys).sort((a, b) => {
    const aPriority = priorityKeys.indexOf(a);
    const bPriority = priorityKeys.indexOf(b);

    // 両方が優先キーの場合
    if (aPriority !== -1 && bPriority !== -1) {
      return aPriority - bPriority;
    }
    // aのみが優先キーの場合
    if (aPriority !== -1) return -1;
    // bのみが優先キーの場合
    if (bPriority !== -1) return 1;
    // 両方とも優先キーでない場合はアルファベット順
    return a.localeCompare(b);
  });

  // 列定義を作成
  return sortedKeys.map((key) => ({
    accessorKey: key,
    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={formatLabel(key)}
      />
    ),
    cell: ({ row }) => {
      const value = (row.original as Record<string, unknown>)[key];
      return (
        <div className="max-h-[2.5rem] overflow-hidden">
          {renderCellValue(value, key)}
        </div>
      );
    },
    enableSorting: true,
    enableHiding: true,
  }));
}
