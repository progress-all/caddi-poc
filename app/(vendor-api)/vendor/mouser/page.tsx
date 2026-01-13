"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ApiForm } from "@/app/_components/vendor-api/api-form";
import { JsonViewer } from "@/app/_components/vendor-api/json-viewer";
import { Card, CardContent } from "@/components/ui/card";

export default function MouserPage() {
  const [keywordResult, setKeywordResult] = useState<unknown>(null);
  const [partNumberResult, setPartNumberResult] = useState<unknown>(null);
  const [keywordLoading, setKeywordLoading] = useState(false);
  const [partNumberLoading, setPartNumberLoading] = useState(false);
  const [keywordError, setKeywordError] = useState<string | null>(null);
  const [partNumberError, setPartNumberError] = useState<string | null>(null);

  const handleKeywordSubmit = async (data: Record<string, string | number>) => {
    setKeywordLoading(true);
    setKeywordError(null);
    setKeywordResult(null);

    try {
      const response = await fetch("/api/vendor/mouser/search/keyword", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search");
      }

      const result = await response.json();
      setKeywordResult(result);
    } catch (error) {
      setKeywordError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setKeywordLoading(false);
    }
  };

  const handlePartNumberSubmit = async (
    data: Record<string, string | number>
  ) => {
    setPartNumberLoading(true);
    setPartNumberError(null);
    setPartNumberResult(null);

    try {
      const response = await fetch("/api/vendor/mouser/search/partnumber", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to search");
      }

      const result = await response.json();
      setPartNumberResult(result);
    } catch (error) {
      setPartNumberError(
        error instanceof Error ? error.message : "Unknown error occurred"
      );
    } finally {
      setPartNumberLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mouser API</h1>
        <p className="mt-2 text-muted-foreground">
          Mouser SearchApiのエンドポイントを実行して結果を確認できます
        </p>
      </div>

      <Tabs defaultValue="keyword" className="space-y-4">
        <TabsList>
          <TabsTrigger value="keyword">Keyword Search</TabsTrigger>
          <TabsTrigger value="partnumber">Part Number Search</TabsTrigger>
        </TabsList>

        <TabsContent value="keyword" className="space-y-4">
          <ApiForm
            endpoint="Search by Keyword"
            fields={[
              {
                name: "keyword",
                label: "Keyword",
                placeholder: "例: LM358",
                required: true,
              },
              {
                name: "records",
                label: "Records (optional)",
                type: "number",
                placeholder: "10",
              },
              {
                name: "startingRecord",
                label: "Starting Record (optional)",
                type: "number",
                placeholder: "0",
              },
            ]}
            onSubmit={handleKeywordSubmit}
            isLoading={keywordLoading}
          />

          {keywordError && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-destructive">
                  <strong>Error:</strong> {keywordError}
                </div>
              </CardContent>
            </Card>
          )}

          {keywordResult && (
            <JsonViewer data={keywordResult} title="Keyword Search Result" />
          )}
        </TabsContent>

        <TabsContent value="partnumber" className="space-y-4">
          <ApiForm
            endpoint="Search by Part Number"
            fields={[
              {
                name: "partNumber",
                label: "Part Number",
                placeholder: "例: 595-LM358N",
                required: true,
              },
              {
                name: "partSearchOptions",
                label: "Part Search Options (optional)",
                placeholder: "",
              },
            ]}
            onSubmit={handlePartNumberSubmit}
            isLoading={partNumberLoading}
          />

          {partNumberError && (
            <Card>
              <CardContent className="p-4">
                <div className="text-sm text-destructive">
                  <strong>Error:</strong> {partNumberError}
                </div>
              </CardContent>
            </Card>
          )}

          {partNumberResult && (
            <JsonViewer
              data={partNumberResult}
              title="Part Number Search Result"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
