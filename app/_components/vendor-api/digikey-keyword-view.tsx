"use client";

import { DataTable } from "@/components/ui/data-table";
import {
  createDynamicColumns,
  EmptyState,
} from "./digikey-table-utils";
import type {
  DigiKeyKeywordResponse,
  DigiKeyProduct,
} from "@/app/_lib/vendor/digikey/types";

interface DigiKeyKeywordViewProps {
  data: DigiKeyKeywordResponse;
}

export function DigiKeyKeywordView({ data }: DigiKeyKeywordViewProps) {
  const products = data?.Products;

  if (!products || products.length === 0) {
    return <EmptyState />;
  }

  // 優先キーの定義（Keyword Search特有）
  const priorityKeys = [
    "ManufacturerProductNumber",
    "Description",
    "Manufacturer",
    "QuantityAvailable",
    "UnitPrice",
    "ProductStatus",
    "ProductVariations",
    "Parameters",
    "Category",
  ];

  const columns = createDynamicColumns<DigiKeyProduct>(products, priorityKeys);

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
