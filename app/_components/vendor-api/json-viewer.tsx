"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { Copy, Check, Table2, ListTree, Braces } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { cn } from "@/app/_lib/utils";

const VisualViewerWrapper = dynamic(
  () => import("./visual-viewer").then((mod) => mod.VisualViewerWrapper),
  { loading: () => <div className="p-4 text-muted-foreground">Loading...</div> }
);

interface ResultViewerProps {
  data: unknown;
  title?: string;
  customView?: React.ReactNode;
  className?: string;
}

export function ResultViewer({
  data,
  title = "Response",
  customView,
  className,
}: ResultViewerProps) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

  // デフォルトタブの決定: customViewがあればcustom、なければvisualJson
  const defaultTab = customView ? "custom" : "visualJson";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Failed to copy to clipboard:", error);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <Tabs defaultValue={defaultTab} className="w-full flex flex-col flex-1 min-h-0">
        <TabsList className="flex-shrink-0 justify-start">
          {customView ? (
            <TabsTrigger value="custom" aria-label="一覧" className="gap-1.5">
              <Table2 className="h-4 w-4" />
              一覧
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="visualJson" aria-label="構造" className="gap-1.5">
            <ListTree className="h-4 w-4" />
            構造
          </TabsTrigger>
          <TabsTrigger value="json" aria-label="JSON" className="gap-1.5">
            <Braces className="h-4 w-4" />
            JSON
          </TabsTrigger>
        </TabsList>
        {customView ? (
          <TabsContent value="custom" className="mt-2 flex-1 min-h-0">
            <div className="h-full flex flex-col">
              {customView}
            </div>
          </TabsContent>
        ) : null}
        <TabsContent value="visualJson" className="mt-2 flex-1 min-h-0">
          <div className="h-full overflow-auto border rounded-md p-4">
            <VisualViewerWrapper data={data} />
          </div>
        </TabsContent>
        <TabsContent value="json" className="mt-2 flex-1 min-h-0">
          <div className="h-full flex flex-col space-y-2">
            <div className="flex justify-end flex-shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopy}
                className="gap-2"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    コピーしました
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    コピー
                  </>
                )}
              </Button>
            </div>
            <pre className="flex-1 overflow-auto rounded-md bg-muted p-4 text-sm">
              <code>{jsonString}</code>
            </pre>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// 後方互換性のため、JsonViewerもエクスポート
export function JsonViewer({ data, title = "Response" }: { data: unknown; title?: string }) {
  return <ResultViewer data={data} title={title} />;
}
