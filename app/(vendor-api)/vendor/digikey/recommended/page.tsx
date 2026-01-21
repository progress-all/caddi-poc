"use client";

import { useCallback } from "react";
import useSWRMutation from "swr/mutation";
import { ApiForm } from "@/app/_components/vendor-api/api-form";
import { ResultViewer } from "@/app/_components/vendor-api/json-viewer";
import { DigiKeyRecommendedView } from "@/app/_components/vendor-api/digikey-recommended-view";
import { ApiPageLayout } from "@/app/_components/vendor-api/api-page-layout";
import { getRecommendedProducts } from "@/app/_lib/vendor/digikey/api";
import type { RecommendedProductsInput } from "@/app/_lib/vendor/digikey/types";

export default function DigiKeyRecommendedPage() {
  const {
    data: recommendedResult,
    error: recommendedError,
    isMutating: recommendedLoading,
    trigger: executeRecommendedSearch,
    reset: resetRecommended,
  } = useSWRMutation(
    ["digikey", "recommended"],
    (_key, { arg }: { arg: RecommendedProductsInput }) =>
      getRecommendedProducts(arg)
  );

  const handleRecommendedSubmit = useCallback(
    async (data: Record<string, string | number>) => {
      resetRecommended();
      // excludeMarketPlaceProductsをbooleanに変換（1ならtrue、それ以外はfalse）
      const input: RecommendedProductsInput = {
        productNumber: String(data.productNumber),
        limit:
          data.limit !== undefined && data.limit !== ""
            ? Number(data.limit)
            : undefined,
        searchOptionList:
          data.searchOptionList && String(data.searchOptionList).trim()
            ? String(data.searchOptionList)
            : undefined,
        excludeMarketPlaceProducts:
          data.excludeMarketPlaceProducts !== undefined
            ? Number(data.excludeMarketPlaceProducts) === 1
            : undefined,
      };
      await executeRecommendedSearch(input);
    },
    [executeRecommendedSearch, resetRecommended]
  );

  const form = (
    <ApiForm
      endpoint="Recommended Products"
      fields={[
        {
          name: "productNumber",
          label: "Product Number",
          placeholder: "例: 296-1395-5-ND",
          required: true,
          defaultValue: "296-1395-5-ND",
        },
        {
          name: "limit",
          label: "Limit (optional)",
          type: "number",
          placeholder: "25",
        },
        {
          name: "searchOptionList",
          label: "Search Option List (optional)",
          placeholder: "カンマ区切り、例: LeadFree,RoHSCompliant",
        },
        {
          name: "excludeMarketPlaceProducts",
          label: "Exclude MarketPlace Products (optional)",
          type: "number",
          placeholder: "0 (false) or 1 (true)",
        },
      ]}
      onSubmit={handleRecommendedSubmit}
      isLoading={recommendedLoading}
    />
  );

  const result =
    recommendedResult != null ? (
      <ResultViewer
        data={recommendedResult}
        customView={<DigiKeyRecommendedView data={recommendedResult} />}
        className="h-full"
      />
    ) : null;

  return (
    <ApiPageLayout
      form={form}
      result={result}
      isLoading={recommendedLoading}
      error={recommendedError}
    />
  );
}
