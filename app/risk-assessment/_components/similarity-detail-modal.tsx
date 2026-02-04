"use client";

import { useCallback, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { CandidateDetailedInfo } from "../_lib/types";
import { DigiKeySimilarityPanel, DatasheetSimilarityPanel } from "./similarity-detail-panels";

export type SimilarityDetailTab = "digikey" | "datasheet";

export interface SimilarityDetailModalContext {
  targetProduct: CandidateDetailedInfo;
  candidate: CandidateDetailedInfo;
  /** 選択された行がTargetかCandidateか */
  selectedRowType: "target" | "candidate";
  /** スコアクリック時に指定したタブ（該当タブをアクティブで開く） */
  preferredTab?: SimilarityDetailTab;
}

interface SimilarityDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: SimilarityDetailModalContext | null;
  defaultTab?: SimilarityDetailTab;
  activeTab?: SimilarityDetailTab;
  onTabChange?: (tab: SimilarityDetailTab) => void;
  /** 候補一覧（前・次ボタン用）。渡すと前/次ボタンを表示 */
  candidates?: CandidateDetailedInfo[];
  /** 前・次で別の候補に切り替えたときに呼ぶ */
  onSelectCandidate?: (candidate: CandidateDetailedInfo) => void;
}

function sameCandidate(a: CandidateDetailedInfo, b: CandidateDetailedInfo): boolean {
  const keyA = a.digiKeyProductNumber || a.manufacturerProductNumber || "";
  const keyB = b.digiKeyProductNumber || b.manufacturerProductNumber || "";
  return keyA === keyB && keyA !== "";
}

function hasDigiKeyData(candidate: CandidateDetailedInfo, isTarget: boolean): boolean {
  if (isTarget) {
    return (candidate.parameters?.length ?? 0) > 0;
  }
  return (
    (candidate.similarityBreakdownDigiKey?.length ?? 0) > 0 ||
    (candidate.parameters?.length ?? 0) > 0
  );
}

/**
 * DigiKey+Datasheet タブに表示するデータがあるか。
 * 候補の場合は similarityBreakdown（類似度結果API）に datasheet 由来の項目が含まれるときのみ true。
 * DigiKeyのみのデータのときは false にし、「データがありません」を表示する。
 */
function hasDatasheetData(candidate: CandidateDetailedInfo, isTarget: boolean): boolean {
  if (isTarget) {
    return (
      (Object.keys(candidate.datasheetParameters ?? {}).length > 0) ||
      (candidate.parameters?.length ?? 0) > 0
    );
  }
  const breakdown = candidate.similarityBreakdown ?? [];
  const hasDatasheetParams = breakdown.some((p) =>
    p.parameterId.startsWith("datasheet:")
  );
  return breakdown.length > 0 && hasDatasheetParams;
}

/**
 * 統合モーダル: 行クリックで開き、DigiKey/Datasheetタブで切替
 */
export function SimilarityDetailModal({
  open,
  onOpenChange,
  context,
  defaultTab = "digikey",
  activeTab,
  onTabChange,
  candidates = [],
  onSelectCandidate,
}: SimilarityDetailModalProps) {
  const hasDigiKey = context ? hasDigiKeyData(context.candidate, context.selectedRowType === "target") : false;
  const hasDatasheet = context ? hasDatasheetData(context.candidate, context.selectedRowType === "target") : false;

  const { prevCandidate, nextCandidate } = useMemo(() => {
    if (!context || context.selectedRowType !== "candidate" || candidates.length === 0) {
      return { prevCandidate: null, nextCandidate: null };
    }
    const idx = candidates.findIndex((c) => sameCandidate(c, context.candidate));
    if (idx < 0) return { prevCandidate: null, nextCandidate: null };
    return {
      prevCandidate: idx > 0 ? candidates[idx - 1] ?? null : null,
      nextCandidate: idx < candidates.length - 1 ? candidates[idx + 1] ?? null : null,
    };
  }, [context, candidates]);

  const resolveEffectiveTab = useCallback((): SimilarityDetailTab => {
    if (!context) return defaultTab;
    const preferred = activeTab ?? context.preferredTab ?? defaultTab;
    if (preferred === "digikey" && hasDigiKey) return "digikey";
    if (preferred === "datasheet" && hasDatasheet) return "datasheet";
    if (hasDigiKey) return "digikey";
    if (hasDatasheet) return "datasheet";
    return defaultTab;
  }, [context, activeTab, defaultTab, hasDigiKey, hasDatasheet]);

  const effectiveTab = resolveEffectiveTab();

  if (!context) return null;

  const { targetProduct, candidate, selectedRowType } = context;
  const selectedLabel = selectedRowType === "target" ? "Target（選択中）" : "Candidate（選択中）";
  const bothEmpty = !hasDigiKey && !hasDatasheet;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {bothEmpty ? (
            <>
              <div className="sticky top-0 z-20 bg-background shrink-0 pb-2">
                <DialogHeader className="pr-10">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="min-w-0 flex-1 truncate">
                      類似度スコア内訳 — {candidate.manufacturerProductNumber}
                    </DialogTitle>
                    {onSelectCandidate && (prevCandidate ?? nextCandidate) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!prevCandidate}
                          onClick={() => prevCandidate && onSelectCandidate(prevCandidate)}
                          aria-label="前の候補"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          前
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!nextCandidate}
                          onClick={() => nextCandidate && onSelectCandidate(nextCandidate)}
                          aria-label="次の候補"
                        >
                          次
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Target</div>
                      <div className={`text-base font-semibold ${selectedRowType === "target" ? "text-primary" : ""}`}>
                        {targetProduct.manufacturerProductNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {targetProduct.manufacturerName}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Candidate</div>
                      <div className={`text-base font-semibold ${selectedRowType === "candidate" ? "text-primary" : ""}`}>
                        {candidate.manufacturerProductNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.manufacturerName}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex-1 flex items-center justify-center py-12 text-muted-foreground">
                表示できるデータがありません
              </div>
            </>
          ) : (
            <Tabs
              value={effectiveTab}
              onValueChange={(v) => onTabChange?.(v as SimilarityDetailTab)}
              className="flex flex-col flex-1 min-h-0 min-w-0"
            >
              <div className="sticky top-0 z-20 bg-background shrink-0 pb-2">
                <DialogHeader className="pr-10">
                  <div className="flex items-center justify-between gap-2">
                    <DialogTitle className="min-w-0 flex-1 truncate">
                      類似度スコア内訳 — {candidate.manufacturerProductNumber}
                    </DialogTitle>
                    {onSelectCandidate && (prevCandidate ?? nextCandidate) && (
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!prevCandidate}
                          onClick={() => prevCandidate && onSelectCandidate(prevCandidate)}
                          aria-label="前の候補"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          前
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!nextCandidate}
                          onClick={() => nextCandidate && onSelectCandidate(nextCandidate)}
                          aria-label="次の候補"
                        >
                          次
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </DialogHeader>
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Target</div>
                      <div className={`text-base font-semibold ${selectedRowType === "target" ? "text-primary" : ""}`}>
                        {targetProduct.manufacturerProductNumber}
                        {selectedRowType === "target" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {selectedLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {targetProduct.manufacturerName}
                      </div>
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-muted-foreground">Candidate</div>
                      <div className={`text-base font-semibold ${selectedRowType === "candidate" ? "text-primary" : ""}`}>
                        {candidate.manufacturerProductNumber}
                        {selectedRowType === "candidate" && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            {selectedLabel}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {candidate.manufacturerName}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="border border-border rounded-lg overflow-hidden mt-2">
                  <div className="flex shrink-0 w-full border-b border-border bg-muted/20 px-3 pt-2 pb-0">
                    <TabsList className="h-10 w-auto inline-flex gap-0 bg-transparent p-0">
                      <TabsTrigger
                        value="digikey"
                        disabled={!hasDigiKey}
                        className="h-10 px-5 text-sm rounded-none border-b-2 border-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-transparent -mb-px cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        DigiKey
                      </TabsTrigger>
                      <TabsTrigger
                        value="datasheet"
                        disabled={!hasDatasheet}
                        className="h-10 px-5 text-sm rounded-none border-b-2 border-transparent shadow-none focus-visible:ring-0 focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-muted data-[state=active]:font-medium data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground data-[state=inactive]:bg-transparent data-[state=inactive]:hover:bg-transparent -mb-px cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        DigiKey+Datasheet
                      </TabsTrigger>
                    </TabsList>
                  </div>
                  <div className="flex-1 min-h-[200px] flex flex-col w-full bg-background min-w-0 overflow-hidden">
                    <TabsContent
                      value="digikey"
                      className="flex-1 min-h-0 min-w-0 m-0 p-3 data-[state=inactive]:hidden flex flex-col overflow-hidden"
                    >
                      {hasDigiKey ? (
                        <DigiKeySimilarityPanel
                          targetProduct={targetProduct}
                          candidate={candidate}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">データなし</div>
                      )}
                    </TabsContent>
                    <TabsContent
                      value="datasheet"
                      className="flex-1 min-h-0 min-w-0 m-0 p-3 data-[state=inactive]:hidden flex flex-col overflow-hidden"
                    >
                      {hasDatasheet ? (
                        <DatasheetSimilarityPanel
                          targetProduct={targetProduct}
                          candidate={candidate}
                        />
                      ) : (
                        <div className="text-sm text-muted-foreground py-4">データなし</div>
                      )}
                    </TabsContent>
                  </div>
                </div>
              </div>
            </Tabs>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
