"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import useSWRMutation from "swr/mutation";
import { searchByKeyword } from "@/app/_lib/vendor/digikey/api";
import type { KeywordSearchInput } from "@/app/_lib/vendor/digikey/types";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import { getComplianceFromProduct, getRiskLevel } from "../_lib/compliance-utils";
import { PartCard } from "./part-card";

interface PartSearchProps {
  onPartSelect?: (product: DigiKeyProduct) => void;
  selectedPart?: DigiKeyProduct | null;
}

export function PartSearch({ onPartSelect, selectedPart }: PartSearchProps) {
  const [keyword, setKeyword] = useState("296-1395-5-ND");

  const {
    data: searchResults,
    error: searchError,
    isMutating: isSearching,
    trigger: executeSearch,
    reset: resetSearch,
  } = useSWRMutation(
    ["digikey", "keyword", "risk-assessment"],
    (_key, { arg }: { arg: KeywordSearchInput }) => searchByKeyword(arg)
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!keyword.trim()) return;

      resetSearch();
      await executeSearch({
        keywords: keyword.trim(),
        limit: 25,
        offset: 0,
      });
    },
    [keyword, executeSearch, resetSearch]
  );

  const handlePartClick = useCallback(
    (product: DigiKeyProduct) => {
      onPartSelect?.(product);
    },
    [onPartSelect]
  );

  // 類似品検索ページを新しいタブで開く
  const handleSimilarSearch = useCallback(
    (product: DigiKeyProduct, e: React.MouseEvent) => {
      e.stopPropagation(); // カード選択を防ぐ
      const compliance = getComplianceFromProduct(product);
      const riskLevel = getRiskLevel(
        compliance,
        product.ProductStatus?.Status
      );

      // DigiKey Product Number を取得（最初のバリエーションから）
      const digiKeyProductNumber =
        product.ProductVariations?.[0]?.DigiKeyProductNumber;

      const params = new URLSearchParams({
        mpn: product.ManufacturerProductNumber || "",
        digiKeyProductNumber: digiKeyProductNumber || "",
        manufacturer: product.Manufacturer?.Name || "",
        category: product.Category?.Name || "",
        rohs: compliance.rohs,
        reach: compliance.reach,
        riskLevel: riskLevel,
      });

      window.open(`/risk-assessment/similar-search?${params.toString()}`, "_blank");
    },
    []
  );

  const products = searchResults?.Products ?? [];

  return (
    <div className="space-y-4">
      {/* 検索フォーム */}
      <form onSubmit={handleSubmit} className="flex gap-2 max-w-2xl">
        <div className="flex-1 min-w-0">
          <Label htmlFor="keyword" className="sr-only">
            キーワード検索
          </Label>
          <Input
            id="keyword"
            type="text"
            placeholder="例: 296-1395-5-ND, LM358P, オペアンプ"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            disabled={isSearching}
            className="h-9"
          />
        </div>
        <Button type="submit" disabled={isSearching || !keyword.trim()} className="flex-shrink-0">
          {isSearching ? "検索中..." : "検索"}
        </Button>
      </form>

      {/* エラー表示 */}
      {searchError && (
        <div className="text-sm text-destructive">
          <strong>エラー:</strong> {searchError.message}
        </div>
      )}

      {/* 検索結果 */}
      {products.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            検索結果 ({products.length}件)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto">
            {products.map((product, index) => {
              const isSelected =
                selectedPart?.ManufacturerProductNumber ===
                product.ManufacturerProductNumber;
              const compliance = getComplianceFromProduct(product);
              const riskLevel = getRiskLevel(
                compliance,
                product.ProductStatus?.Status
              );

              return (
                <PartCard
                  key={index}
                  product={product}
                  compliance={compliance}
                  riskLevel={riskLevel}
                  isSelected={isSelected}
                  onSelect={handlePartClick}
                  showSimilarSearchButton={true}
                  onSimilarSearch={handleSimilarSearch}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* 検索結果が0件の場合 */}
      {searchResults && products.length === 0 && (
        <div className="text-sm text-muted-foreground text-center py-8">
          検索結果が見つかりませんでした
        </div>
      )}
    </div>
  );
}
