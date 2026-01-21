"use client";

import { DataTable } from "@/components/ui/data-table";
import {
  createDynamicColumns,
  EmptyState,
} from "./digikey-table-utils";
import type {
  DigiKeyRecommendedProductsResponse,
  DigiKeyRecommendedProduct,
} from "@/app/_lib/vendor/digikey/types";

interface DigiKeyRecommendedViewProps {
  data: DigiKeyRecommendedProductsResponse;
}

export function DigiKeyRecommendedView({
  data,
}: DigiKeyRecommendedViewProps) {
  // Recommendationsからフラット化
  const products =
    data?.Recommendations?.flatMap(
      (r) => r.RecommendedProducts ?? []
    ) ?? [];

  if (products.length === 0) {
    return <EmptyState />;
  }

  // 優先キーの定義（Recommended特有）
  const priorityKeys = [
    "ManufacturerProductNumber",
    "QuantityAvailable",
    "UnitPrice",
    "DigiKeyProductNumber",
    "ManufacturerName",
    "OtherNames",
    "PrimaryPhoto",
    "ProductDescription",
    "ProductUrl",
  ];

  const columns = createDynamicColumns<DigiKeyRecommendedProduct>(
    products,
    priorityKeys
  );

  return (
    <div className="h-full min-h-[500px] flex flex-col">
      <DataTable
        columns={columns}
        data={products}
        searchKey="ManufacturerProductNumber"
        enableSorting={true}
        enableFiltering={true}
        enablePagination={true}
        enableColumnVisibility={true}
        pageSize={100}
      />
    </div>
  );
}
