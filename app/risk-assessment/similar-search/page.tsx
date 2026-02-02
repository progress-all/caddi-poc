"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CrossReferenceTableView } from "../_components/cross-reference-table-view";
import type {
  CandidateDetailedInfo,
} from "../_lib/types";
import { searchSimilarProducts, extractDatasheetId, fetchDatasheetParameters, fetchSimilarityResultsDigiKey, fetchSimilarityResults, fetchUnifiedProducts } from "../_lib/api";
import type { DatasheetData, UnifiedProduct } from "@/app/_lib/datasheet/types";
import type { SimilarityResult } from "@/app/_lib/datasheet/similarity-schema";

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

  // データシートパラメーターの取得
  const [datasheetData, setDatasheetData] = useState<Record<string, DatasheetData>>({});
  const [isLoadingDatasheet, setIsLoadingDatasheet] = useState(false);
  
  // 類似度結果の取得（DigiKeyのみ）
  const [similarityResultsDigiKey, setSimilarityResultsDigiKey] = useState<Record<string, SimilarityResult>>({});
  // 類似度結果の取得（DigiKey+Datasheet）
  const [similarityResultsCombined, setSimilarityResultsCombined] = useState<Record<string, SimilarityResult>>({});
  // 統合 product（DigiKey + Datasheet をローカルに保存したもの）
  const [unifiedProducts, setUnifiedProducts] = useState<Record<string, UnifiedProduct>>({});

  useEffect(() => {
    if (!searchResult) {
      return;
    }

    // 全候補からdatasheet_idを抽出（URLのファイル名 + MPNの両方でローカルJSONを参照）
    const datasheetIds: string[] = [];

    const addId = (id: string | null | undefined) => {
      if (id && id.length > 0 && !datasheetIds.includes(id)) {
        datasheetIds.push(id);
      }
    };

    // 対象部品のdatasheet_id（URL由来 + MPN）
    if (searchResult.targetProduct) {
      if (searchResult.targetProduct.datasheetUrl) {
        addId(extractDatasheetId(searchResult.targetProduct.datasheetUrl));
      }
      addId(searchResult.targetProduct.manufacturerProductNumber);
    }

    // 候補のdatasheet_id（URL由来 + MPN）
    for (const candidate of searchResult.candidates) {
      if (candidate.datasheetUrl) {
        addId(extractDatasheetId(candidate.datasheetUrl));
      }
      addId(candidate.manufacturerProductNumber);
    }

    if (datasheetIds.length === 0) {
      return;
    }

    // データシートデータを取得
    setIsLoadingDatasheet(true);
    fetchDatasheetParameters(datasheetIds)
      .then((data) => {
        setDatasheetData(data);
      })
      .catch((error) => {
        console.error("Failed to fetch datasheet parameters:", error);
      })
      .finally(() => {
        setIsLoadingDatasheet(false);
      });
  }, [searchResult]);

  // 統合 product の取得（Target + 全 Candidate の partId）
  useEffect(() => {
    if (!searchResult) return;
    const partIds: string[] = [];
    const add = (mpn: string | undefined, dkpn: string | undefined) => {
      const id = mpn || dkpn || "";
      if (id && !partIds.includes(id)) partIds.push(id);
    };
    if (searchResult.targetProduct) {
      add(
        searchResult.targetProduct.manufacturerProductNumber,
        searchResult.targetProduct.digiKeyProductNumber
      );
    }
    for (const c of searchResult.candidates) {
      add(c.manufacturerProductNumber, c.digiKeyProductNumber);
    }
    if (partIds.length === 0) return;
    fetchUnifiedProducts(partIds)
      .then(setUnifiedProducts)
      .catch((err) => console.error("Failed to fetch unified products:", err));
  }, [searchResult]);

  // データシートパラメーターをマージした対象部品データ（統合 product があればそれを優先）
  const enrichedTargetProduct = useMemo(() => {
    if (!searchResult?.targetProduct) {
      return undefined;
    }

    const target = searchResult.targetProduct;
    const partId = target.manufacturerProductNumber || target.digiKeyProductNumber || "";
    const unified = partId ? unifiedProducts[partId] : undefined;

    const enriched: CandidateDetailedInfo = { ...searchResult.targetProduct };

    if (unified) {
      enriched.parameters = unified.digiKeyParameters.map((p) => ({ name: p.name, value: p.value }));
      enriched.datasheetParameters = unified.datasheetParameters;
    } else {
      const idFromUrl = target.datasheetUrl ? extractDatasheetId(target.datasheetUrl) : null;
      const idFromMpn = target.manufacturerProductNumber || null;
      const datasheetId =
        (idFromUrl && datasheetData[idFromUrl] ? idFromUrl : null) ??
        (idFromMpn && datasheetData[idFromMpn] ? idFromMpn : null);
      if (datasheetId && datasheetData[datasheetId]) {
        enriched.datasheetParameters = datasheetData[datasheetId].parameters;
      }
    }

    return enriched;
  }, [searchResult, datasheetData, unifiedProducts]);

  // DigiKeyのみ 類似度結果の取得
  useEffect(() => {
    if (!enrichedTargetProduct) {
      return;
    }
    const targetIdDigiKey =
      enrichedTargetProduct.manufacturerProductNumber ||
      enrichedTargetProduct.digiKeyProductNumber ||
      "";
    if (!targetIdDigiKey) {
      return;
    }

    fetchSimilarityResultsDigiKey(targetIdDigiKey)
      .then((results) => {
        setSimilarityResultsDigiKey(results);
      })
      .catch((error) => {
        console.error("Failed to fetch DigiKey similarity results:", error);
      });
  }, [enrichedTargetProduct]);

  // データシート類似度結果の取得（similarity-results。targetId は DigiKey 品番で渡し、API 内で -01 にマッピング）
  useEffect(() => {
    if (!enrichedTargetProduct) {
      return;
    }
    const targetId =
      enrichedTargetProduct.manufacturerProductNumber ||
      enrichedTargetProduct.digiKeyProductNumber ||
      "";
    if (!targetId) {
      return;
    }

    fetchSimilarityResults(targetId)
      .then((results) => {
        setSimilarityResultsCombined(results);
      })
      .catch((error) => {
        console.error("Failed to fetch datasheet similarity results:", error);
      });
  }, [enrichedTargetProduct]);

  // データシートパラメーターをマージした候補データ（統合 product があればそれを優先）
  const enrichedCandidates = useMemo(() => {
    if (!searchResult) {
      return [];
    }

    return searchResult.candidates.map((candidate) => {
      const enriched: CandidateDetailedInfo = { ...candidate };
      const partId = candidate.manufacturerProductNumber || candidate.digiKeyProductNumber || "";
      const unified = partId ? unifiedProducts[partId] : undefined;

      if (unified) {
        enriched.parameters = unified.digiKeyParameters.map((p) => ({ name: p.name, value: p.value }));
        enriched.datasheetParameters = unified.datasheetParameters;
      } else {
        const idFromUrl = candidate.datasheetUrl
          ? extractDatasheetId(candidate.datasheetUrl)
          : null;
        const idFromMpn = candidate.manufacturerProductNumber || null;
        const datasheetId =
          (idFromUrl && datasheetData[idFromUrl] ? idFromUrl : null) ??
          (idFromMpn && datasheetData[idFromMpn] ? idFromMpn : null);
        if (datasheetId && datasheetData[datasheetId]) {
          enriched.datasheetParameters = datasheetData[datasheetId].parameters;
        }
      }

      // 類似度スコア（対象部品が存在する場合）
      const candidateId =
        candidate.manufacturerProductNumber || candidate.digiKeyProductNumber || "";
      if (enrichedTargetProduct) {
        // DigiKeyのみ: LLM結果があれば表示、なければ "-"（ルールベースフォールバックなし）
        const llmResultDigiKey = candidateId
          ? similarityResultsDigiKey[candidateId]
          : undefined;
        if (llmResultDigiKey && llmResultDigiKey.parameters.length > 0) {
          const totalScoreDigiKey = Math.round(
            llmResultDigiKey.parameters.reduce((s, p) => s + p.score, 0) /
              llmResultDigiKey.parameters.length
          );
          enriched.similarityScoreDigiKey = totalScoreDigiKey;
          enriched.similarityBreakdownDigiKey = llmResultDigiKey.parameters.map((param) => ({
            parameterId: param.parameterId,
            displayName: param.description,
            score: param.score,
            matched: param.score >= 80,
            targetValue: param.targetValue,
            candidateValue: param.candidateValue,
            status: "compared" as const,
            excludeReason: undefined,
            reason: param.reason,
          }));
        }
        // データシート類似度: similarity-results（API で -01⇔D マッピング済み、parameterId は datasheet: 付与済み）
        const llmResultCombined = candidateId
          ? similarityResultsCombined[candidateId]
          : undefined;
        if (llmResultCombined && llmResultCombined.parameters.length > 0) {
          const totalScore = Math.round(
            llmResultCombined.parameters.reduce((s, p) => s + p.score, 0) /
              llmResultCombined.parameters.length
          );
          enriched.similarityScore = totalScore;
          enriched.similaritySummary = llmResultCombined.summary;
          enriched.similarityBreakdown = llmResultCombined.parameters.map((param) => ({
            parameterId: param.parameterId,
            displayName: param.description,
            score: param.score,
            matched: param.score >= 80,
            targetValue: param.targetValue,
            candidateValue: param.candidateValue,
            status: "compared" as const,
            reason: param.reason,
          }));
        }
      }

      return enriched;
    });
  }, [searchResult, datasheetData, unifiedProducts, enrichedTargetProduct, similarityResultsDigiKey, similarityResultsCombined]);

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
                      candidates={enrichedCandidates}
                      targetProduct={enrichedTargetProduct}
                      isLoadingDatasheet={isLoadingDatasheet}
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
