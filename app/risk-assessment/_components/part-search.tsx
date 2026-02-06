"use client";

import { useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const keywordParam = searchParams.get("keyword");
  const [keyword, setKeyword] = useState(keywordParam || "GRM188R60J105KA01");
  const [manufacturer, setManufacturer] = useState("");

  // クエリパラメータが変更されたときにkeywordを更新
  useEffect(() => {
    if (keywordParam) {
      setKeyword(keywordParam);
    }
  }, [keywordParam]);

  // URLにkeywordがある場合、自動で検索を実行（別タブから開いたときなど）
  useEffect(() => {
    if (!keywordParam?.trim()) return;

    const keywords = manufacturer.trim()
      ? `${keywordParam.trim()} ${manufacturer.trim()}`
      : keywordParam.trim();

    resetSearch();
    executeSearch({ keywords, limit: 25, offset: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keywordParam変更時のみ実行
  }, [keywordParam]);

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

      const keywords = manufacturer.trim()
        ? `${keyword.trim()} ${manufacturer.trim()}`
        : keyword.trim();

      resetSearch();
      await executeSearch({
        keywords,
        limit: 25,
        offset: 0,
      });
    },
    [keyword, manufacturer, executeSearch, resetSearch]
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
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* 検索フォーム＋説明＋エラー（固定） */}
      <div className="flex-shrink-0 space-y-4">
        <div className="max-w-2xl space-y-1.5">
          <form onSubmit={handleSubmit} className="flex gap-4 flex-wrap items-end">
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label htmlFor="keyword">
                キーワード
              </Label>
              <Input
                id="keyword"
                type="text"
                placeholder="例: 296-1395-5-ND, LM358P, Capacitors"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                disabled={isSearching}
                className="h-9"
              />
            </div>
            <div className="flex-1 min-w-[200px] space-y-1.5">
              <Label htmlFor="manufacturer">
                メーカー名（任意）
              </Label>
              <Input
                id="manufacturer"
                type="text"
                placeholder="例: Texas Instruments"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                disabled={isSearching}
                className="h-9"
              />
            </div>
            <Button type="submit" disabled={isSearching || !keyword.trim()} className="flex-shrink-0 h-9">
              {isSearching ? "検索中..." : "検索"}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground">
            キーワードは部品番号・型番・説明文・カテゴリ名で検索できます
          </p>
        </div>

        {searchError && (
          <div className="text-sm text-destructive">
            <strong>エラー:</strong> {searchError.message}
          </div>
        )}
      </div>

      {/* 検索結果エリア（内側スクロールのみ） */}
      <div className="flex-1 min-h-0 overflow-auto">
        {products.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              検索結果 ({products.length}件)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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

        {searchResults && products.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            検索結果が見つかりませんでした
          </div>
        )}
      </div>
    </div>
  );
}
