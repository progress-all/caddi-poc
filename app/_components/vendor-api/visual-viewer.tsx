"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/app/_lib/utils";

interface VisualViewerProps {
  data: unknown;
  level?: number;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return JSON.stringify(value);
}

function VisualViewer({ data, level = 0 }: VisualViewerProps) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggleExpand = (key: string) => {
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // プリミティブ値の表示
  if (
    data === null ||
    data === undefined ||
    typeof data === "string" ||
    typeof data === "number" ||
    typeof data === "boolean"
  ) {
    return (
      <div className="text-sm">
        <span className="text-muted-foreground">{formatValue(data)}</span>
      </div>
    );
  }

  // 配列の処理
  if (isArray(data)) {
    // 空配列
    if (data.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">空の配列</div>
      );
    }

    // 配列の要素がオブジェクトの場合、テーブル形式で表示
    if (data.length > 0 && isObject(data[0])) {
      // すべてのオブジェクトからキーを収集
      const allKeys = new Set<string>();
      data.forEach((item) => {
        if (isObject(item)) {
          Object.keys(item).forEach((key) => allKeys.add(key));
        }
      });

      const keys = Array.from(allKeys);

      return (
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {keys.map((key) => (
                  <TableHead key={key} className="font-semibold">
                    {key}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((item, index) => (
                <TableRow key={index}>
                  {keys.map((key) => (
                    <TableCell key={key}>
                      {isObject(item[key]) || isArray(item[key]) ? (
                        <div className="pl-4">
                          <VisualViewer data={item[key]} level={level + 1} />
                        </div>
                      ) : (
                        <span className="text-sm">
                          {formatValue(item[key])}
                        </span>
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      );
    }

    // 配列の要素がプリミティブの場合、リスト形式で表示
    return (
      <div className="space-y-1">
        {data.map((item, index) => (
          <div key={index} className="flex items-start gap-2">
            <span className="text-muted-foreground text-sm">[{index}]:</span>
            <div className="flex-1">
              {isObject(item) || isArray(item) ? (
                <VisualViewer data={item} level={level + 1} />
              ) : (
                <span className="text-sm">{formatValue(item)}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // オブジェクトの処理
  if (isObject(data)) {
    const keys = Object.keys(data);

    if (keys.length === 0) {
      return (
        <div className="text-sm text-muted-foreground italic">空のオブジェクト</div>
      );
    }

    return (
      <div className="space-y-1">
        {keys.map((key) => {
          const value = data[key];
          const isNested = isObject(value) || isArray(value);
          const isExpanded = expanded[key] ?? level < 2; // デフォルトで2階層まで展開

          return (
            <div key={key} className="border-b border-border/50 last:border-0">
              <div
                className={cn(
                  "flex items-start gap-2 py-2",
                  isNested && "cursor-pointer hover:bg-muted/50 rounded px-2 -mx-2"
                )}
                onClick={() => isNested && toggleExpand(key)}
              >
                {isNested && (
                  <div className="mt-0.5 flex-shrink-0">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <span className="font-semibold text-sm text-foreground flex-shrink-0">
                      {key}:
                    </span>
                    {!isNested ? (
                      <span className="text-sm break-words">
                        {formatValue(value)}
                      </span>
                    ) : (
                      <div className="flex-1">
                        {isExpanded ? (
                          <div className="mt-1 pl-4 border-l-2 border-border/30">
                            <VisualViewer data={value} level={level + 1} />
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground italic">
                            {isArray(value)
                              ? `配列 (${value.length} 項目)`
                              : `オブジェクト (${Object.keys(value).length} キー)`}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // その他の型
  return (
    <div className="text-sm text-muted-foreground">
      {JSON.stringify(data, null, 2)}
    </div>
  );
}

export function VisualViewerWrapper({ data }: { data: unknown }) {
  return (
    <div className="space-y-2">
      <VisualViewer data={data} />
    </div>
  );
}
