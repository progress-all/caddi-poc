"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrossReferenceTableView } from "../_components/cross-reference-table-view";
import type {
  CandidateDetailedInfo,
} from "../_lib/types";
import { searchSimilarProducts } from "../_lib/api";

function SimilarSearchContent() {
  const searchParams = useSearchParams();
  const mpn = searchParams.get("mpn");
  const digiKeyProductNumber = searchParams.get("digiKeyProductNumber");

  // 自動検索: mpnが存在すれば検索を実行
  const {
    data: searchResult,
    error: searchError,
    isLoading,
  } = useSWR(
    mpn ? ["similar-search", mpn, digiKeyProductNumber] : null,
    () =>
      searchSimilarProducts({
        mpn: mpn!,
        digiKeyProductNumber: digiKeyProductNumber || undefined,
      }),
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
    }
  );

  if (!mpn) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">部品情報が指定されていません</p>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col min-h-0">
      {/* 検索結果 */}
      <Card className="flex-1 flex flex-col min-h-0 overflow-hidden">
        <CardHeader className="shrink-0">
          <CardTitle className="text-base">類似品検索結果</CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col min-h-0 overflow-hidden pt-0">
          {/* ローディング状態 */}
          {isLoading && (
            <div className="flex items-center justify-center py-8 shrink-0">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              <span className="ml-3 text-muted-foreground">検索中...</span>
            </div>
          )}

          {/* エラー状態 */}
          {searchError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700 shrink-0">
              <p className="font-medium">検索エラー</p>
              <p>{searchError.message}</p>
            </div>
          )}

          {/* 検索結果テーブル領域（枠・スクロールをここに閉じる） */}
          {searchResult && !isLoading && (
            <>
              {searchResult.candidates.length > 0 ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="h-full min-h-0">
                    <CrossReferenceTableView
                      candidates={searchResult.candidates as CandidateDetailedInfo[]}
                      targetProduct={searchResult.targetProduct}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground shrink-0">
                  <p>候補が見つかりませんでした</p>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function SimilarSearchPage() {
  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden">
      <div className="mb-4 shrink-0">
        <h1 className="text-2xl font-bold mb-2">類似品検索</h1>
        <p className="text-sm text-muted-foreground">
          選択した部品に対して類似品を検索し、代替候補を提案します
        </p>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        <Suspense
          fallback={
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">読み込み中...</p>
            </div>
          }
        >
          <SimilarSearchContent />
        </Suspense>
      </div>
    </div>
  );
}
