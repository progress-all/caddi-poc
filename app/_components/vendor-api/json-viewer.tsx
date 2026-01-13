"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { VisualViewerWrapper } from "./visual-viewer";

interface JsonViewerProps {
  data: unknown;
  title?: string;
}

export function JsonViewer({ data, title = "Response" }: JsonViewerProps) {
  const [copied, setCopied] = useState(false);
  const jsonString = JSON.stringify(data, null, 2);

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
    <Card>
      <CardContent className="p-4">
        <div className="space-y-4">
          {title && (
            <h3 className="text-sm font-semibold text-foreground">{title}</h3>
          )}
          <Tabs defaultValue="visual" className="w-full">
            <TabsList>
              <TabsTrigger value="visual">ビジュアルビュー</TabsTrigger>
              <TabsTrigger value="json">JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="visual" className="mt-4">
              <VisualViewerWrapper data={data} />
            </TabsContent>
            <TabsContent value="json" className="mt-4">
              <div className="space-y-2">
                <div className="flex justify-end">
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
                <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                  <code>{jsonString}</code>
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>
  );
}
