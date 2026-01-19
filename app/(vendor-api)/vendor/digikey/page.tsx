"use client";

import { useCallback } from "react";
import useSWRMutation from "swr/mutation";
import { ApiForm } from "@/app/_components/vendor-api/api-form";
import { ResultViewer } from "@/app/_components/vendor-api/json-viewer";
import { DigiKeyCustomView } from "@/app/_components/vendor-api/digikey-custom-view";
import { Card, CardContent } from "@/components/ui/card";
import { searchByKeyword } from "@/app/_lib/vendor/digikey/api";
import type { KeywordSearchInput } from "@/app/_lib/vendor/digikey/types";

export default function DigiKeyPage() {
  const {
    data: keywordResult,
    error: keywordError,
    isMutating: keywordLoading,
    trigger: executeKeywordSearch,
    reset: resetKeyword,
  } = useSWRMutation(
    ["digikey", "keyword"],
    (_key, { arg }: { arg: KeywordSearchInput }) => searchByKeyword(arg)
  );

  const handleKeywordSubmit = useCallback(
    async (data: Record<string, string | number>) => {
      resetKeyword();
      await executeKeywordSearch(data as unknown as KeywordSearchInput);
    },
    [executeKeywordSearch, resetKeyword]
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">DigiKey API</h1>
        <p className="mt-2 text-muted-foreground">
          DigiKey Product Information v4 APIのKeywordSearchエンドポイントを実行して結果を確認できます
        </p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <ApiForm
            endpoint="Keyword Search"
            fields={[
              {
                name: "keywords",
                label: "Keywords",
                placeholder: "例: LM358",
                required: true,
                defaultValue: "LM358",
              },
              {
                name: "limit",
                label: "Limit (optional)",
                type: "number",
                placeholder: "25",
                defaultValue: 25,
              },
              {
                name: "offset",
                label: "Offset (optional)",
                type: "number",
                placeholder: "0",
                defaultValue: 0,
              },
              {
                name: "sortField",
                label: "Sort Field (optional)",
                type: "select",
                placeholder: "未指定",
                options: [
                  { value: "None", label: "None" },
                  { value: "DigiKeyProductNumber", label: "DigiKey Product Number" },
                  { value: "ManufacturerProductNumber", label: "Manufacturer Product Number" },
                  { value: "Manufacturer", label: "Manufacturer" },
                  { value: "MinimumQuantity", label: "Minimum Quantity" },
                  { value: "QuantityAvailable", label: "Quantity Available" },
                  { value: "Price", label: "Price" },
                  { value: "Packaging", label: "Packaging" },
                  { value: "ProductStatus", label: "Product Status" },
                  { value: "Supplier", label: "Supplier" },
                  { value: "PriceManufacturerStandardPackage", label: "Price (Manufacturer Standard Package)" },
                ],
              },
              {
                name: "sortOrder",
                label: "Sort Order (optional)",
                type: "select",
                placeholder: "未指定",
                options: [
                  { value: "Ascending", label: "Ascending" },
                  { value: "Descending", label: "Descending" },
                ],
              },
              {
                name: "manufacturerIds",
                label: "Manufacturer IDs (optional)",
                placeholder: "カンマ区切り、例: 123,456",
              },
              {
                name: "categoryIds",
                label: "Category IDs (optional)",
                placeholder: "カンマ区切り、例: 123,456",
              },
              {
                name: "statusIds",
                label: "Status IDs (optional)",
                placeholder: "カンマ区切り、例: 123,456",
              },
              {
                name: "minimumQuantityAvailable",
                label: "Minimum Quantity Available (optional)",
                type: "number",
                placeholder: "例: 100",
              },
            ]}
            onSubmit={handleKeywordSubmit}
            isLoading={keywordLoading}
          />

          {keywordError ? (
            <div className="text-sm text-destructive pt-2">
              <strong>Error:</strong> {keywordError.message}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {keywordResult != null ? (
        <div className="h-[calc(100vh-280px)] min-h-[500px]">
          <ResultViewer
            data={keywordResult}
            title="Keyword Search Result"
            customView={<DigiKeyCustomView data={keywordResult} />}
            className="h-full"
          />
        </div>
      ) : null}
    </div>
  );
}
