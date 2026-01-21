"use client";

import { DataTable } from "@/components/ui/data-table";
import {
  createDynamicColumns,
  EmptyState,
} from "./digikey-table-utils";
import type {
  DigiKeyProductSubstitutesResponse,
  DigiKeyProductSubstitute,
} from "@/app/_lib/vendor/digikey/types";

interface DigiKeySubstitutionsViewProps {
  data: DigiKeyProductSubstitutesResponse;
}

export function DigiKeySubstitutionsView({
  data,
}: DigiKeySubstitutionsViewProps) {
  const substitutes = data?.ProductSubstitutes;

  if (!substitutes || substitutes.length === 0) {
    return <EmptyState />;
  }

  // 優先キーの定義（Substitutions特有）
  const priorityKeys = [
    "ManufacturerProductNumber",
    "Description",
    "Manufacturer",
    "QuantityAvailable",
    "UnitPrice",
    "DigiKeyProductNumber",
    "ProductUrl",
    "SubstituteType",
  ];

  const columns = createDynamicColumns<DigiKeyProductSubstitute>(
    substitutes,
    priorityKeys
  );

  return (
    <div className="h-full min-h-[500px] flex flex-col">
      <DataTable
        columns={columns}
        data={substitutes}
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
