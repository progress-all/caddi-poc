"use client";

import { useCallback } from "react";
import useSWRMutation from "swr/mutation";
import { ApiForm } from "@/app/_components/vendor-api/api-form";
import { ResultViewer } from "@/app/_components/vendor-api/json-viewer";
import { DigiKeySubstitutionsView } from "@/app/_components/vendor-api/digikey-substitutions-view";
import { ApiPageLayout } from "@/app/_components/vendor-api/api-page-layout";
import { getSubstitutions } from "@/app/_lib/vendor/digikey/api";
import type { SubstitutionsInput } from "@/app/_lib/vendor/digikey/types";

export default function DigiKeySubstitutionsPage() {
  const {
    data: substitutionsResult,
    error: substitutionsError,
    isMutating: substitutionsLoading,
    trigger: executeSubstitutionsSearch,
    reset: resetSubstitutions,
  } = useSWRMutation(
    ["digikey", "substitutions"],
    (_key, { arg }: { arg: SubstitutionsInput }) => getSubstitutions(arg)
  );

  const handleSubstitutionsSubmit = useCallback(
    async (data: Record<string, string | number>) => {
      resetSubstitutions();
      const input: SubstitutionsInput = {
        productNumber: String(data.productNumber),
        includes:
          data.includes && String(data.includes).trim()
            ? String(data.includes)
            : undefined,
      };
      await executeSubstitutionsSearch(input);
    },
    [executeSubstitutionsSearch, resetSubstitutions]
  );

  const form = (
    <ApiForm
      endpoint="Substitutions"
      fields={[
        {
          name: "productNumber",
          label: "Product Number",
          placeholder: "例: 296-1395-5-ND",
          required: true,
          defaultValue: "296-1395-5-ND",
        },
        {
          name: "includes",
          label: "Includes (optional)",
          placeholder: "追加情報のinclude指定",
        },
      ]}
      onSubmit={handleSubstitutionsSubmit}
      isLoading={substitutionsLoading}
    />
  );

  const result =
    substitutionsResult != null ? (
      <ResultViewer
        data={substitutionsResult}
        customView={<DigiKeySubstitutionsView data={substitutionsResult} />}
        className="h-full"
      />
    ) : null;

  return (
    <ApiPageLayout
      form={form}
      result={result}
      isLoading={substitutionsLoading}
      error={substitutionsError}
    />
  );
}
