"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskIndicator } from "../_components/risk-indicator";
import type {
  NormalizedCompliance,
  RiskLevel,
  CandidateInfo,
  CandidateSource,
  SimilarSearchResponse,
} from "../_lib/types";
import { searchSimilarProducts } from "../_lib/api";

/**
 * ソースに対応するバッジの表示設定（日本語）
 */
const sourceLabels: Record<CandidateSource, { label: string; variant: "default" | "secondary" | "outline" }> = {
  substitutions: { label: "代替品", variant: "default" },
  custom: { label: "カスタム検索", variant: "outline" },
};

/**
 * 候補カード（ソースラベル付き、画像対応）
 */
function CandidateCard({ candidate }: { candidate: CandidateInfo }) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-3 flex flex-col space-y-2">
        {/* ヘッダー: 画像 + MPN + メーカー + ソースバッジ */}
        <div className="flex items-start gap-2">
          {/* 画像（あれば表示） */}
          {candidate.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={candidate.photoUrl}
              alt={candidate.manufacturerProductNumber}
              className="w-12 h-12 object-contain border rounded flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 bg-muted rounded flex-shrink-0 flex items-center justify-center">
              <span className="text-xs text-muted-foreground">No img</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1 mb-1">
              {candidate.sources.map((source) => (
                <Badge key={source} variant={sourceLabels[source].variant} className="text-xs">
                  {sourceLabels[source].label}
                </Badge>
              ))}
              {candidate.substituteType && (
                <Badge variant="outline" className="text-xs text-muted-foreground">
                  {candidate.substituteType}
                </Badge>
              )}
            </div>
            <div className="font-medium text-sm truncate">
              {candidate.manufacturerProductNumber}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {candidate.manufacturerName}
            </div>
          </div>
        </div>

        {/* 説明 */}
        <p className="text-xs text-muted-foreground line-clamp-2">
          {candidate.description}
        </p>

        {/* 在庫・価格 */}
        <div className="flex justify-between items-center text-xs pt-1 border-t">
          <span className="text-muted-foreground">
            在庫: {candidate.quantityAvailable.toLocaleString()}
          </span>
          <span className="font-medium">
            単価: {candidate.unitPrice != null ? `$${candidate.unitPrice}` : "不明"}
          </span>
        </div>

        {/* DigiKeyリンク */}
        {candidate.productUrl && (
          <a
            href={candidate.productUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline"
          >
            DigiKeyで見る →
          </a>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * ソースサマリの表示（日本語、エラー表示なし）
 */
function SourceSummary({ summary }: { summary: SimilarSearchResponse["sourceSummary"] }) {
  // カスタムは未実装なので非表示
  return (
    <div className="flex flex-wrap gap-4 text-sm">
      <div className="flex items-center gap-2">
        <Badge variant="default" className="text-xs">代替品</Badge>
        <span>{summary.substitutions.count}件</span>
      </div>
    </div>
  );
}

function SimilarSearchContent() {
  const searchParams = useSearchParams();
  const mpn = searchParams.get("mpn");
  const manufacturer = searchParams.get("manufacturer");
  const category = searchParams.get("category");
  const rohs = searchParams.get("rohs") as NormalizedCompliance["rohs"] | null;
  const reach = searchParams.get("reach") as NormalizedCompliance["reach"] | null;
  const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;

  // 自動検索: mpnが存在すれば検索を実行
  const {
    data: searchResult,
    error: searchError,
    isLoading,
  } = useSWR(
    mpn ? ["similar-search", mpn] : null,
    () => searchSimilarProducts({ mpn: mpn! }),
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

  const compliance: NormalizedCompliance = {
    rohs: rohs || "Unknown",
    reach: reach || "Unknown",
  };

  return (
    <div className="space-y-6">
      {/* 対象部品情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            対象部品
            <Badge variant="outline" className="font-normal">
              類似品検索対象
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">MPN:</span>
                <div className="font-medium">{mpn}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">メーカー:</span>
                <div className="font-medium">{manufacturer || "不明"}</div>
              </div>
              {category && (
                <div>
                  <span className="text-xs text-muted-foreground">カテゴリ:</span>
                  <div className="text-sm">{category}</div>
                </div>
              )}
            </div>
            <div>
              <RiskIndicator compliance={compliance} riskLevel={riskLevel || "Medium"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索結果 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">類似品検索結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* ローディング状態 */}
            {isLoading && (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="ml-3 text-muted-foreground">検索中...</span>
              </div>
            )}

            {/* エラー状態 */}
            {searchError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                <p className="font-medium">検索エラー</p>
                <p>{searchError.message}</p>
              </div>
            )}

            {/* 検索結果 */}
            {searchResult && !isLoading && (
              <>
                {/* ソースサマリ */}
                <div className="bg-muted/50 rounded-lg p-4">
                  <p className="text-sm font-medium mb-2">検索ソース別件数</p>
                  <SourceSummary summary={searchResult.sourceSummary} />
                  <p className="text-xs text-muted-foreground mt-2">
                    検索実行: {new Date(searchResult.searchedAt).toLocaleString("ja-JP")}
                  </p>
                </div>

                {/* 候補リスト */}
                {searchResult.candidates.length > 0 ? (
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      候補リスト（{searchResult.candidates.length}件）
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {searchResult.candidates.map((candidate, index) => (
                        <CandidateCard key={candidate.digiKeyProductNumber || index} candidate={candidate} />
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p>候補が見つかりませんでした</p>
                  </div>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SimilarSearchPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">類似品検索</h1>
        <p className="text-sm text-muted-foreground">
          選択した部品に対して類似品を検索し、代替候補を提案します
        </p>
      </div>

      <div className="flex-1 min-h-0">
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
