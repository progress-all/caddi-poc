"use client";

import { useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CandidateDetailedInfo } from "../_lib/types";

interface SimilarityScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetProduct: CandidateDetailedInfo;
  candidate: CandidateDetailedInfo;
}

/**
 * 類似度スコア内訳モーダル
 * TargetとCandidate部品の各パラメータを比較し、スコア内訳を表示
 */
export function SimilarityScoreModal({
  open,
  onOpenChange,
  targetProduct,
  candidate,
}: SimilarityScoreModalProps) {
  const breakdown = candidate.similarityBreakdown || [];
  const totalScore = candidate.similarityScore ?? 0;

  // 件数サマリーを計算
  const summary = useMemo(() => {
    const total = breakdown.length;
    const highScore = breakdown.filter((item) => item.score >= 80).length;
    const mediumScore = breakdown.filter((item) => item.score >= 50 && item.score < 80).length;
    const lowScore = breakdown.filter((item) => item.score < 50).length;

    return { total, highScore, mediumScore, lowScore };
  }, [breakdown]);

  // スコアに応じた色を決定
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBgColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getResultBadge = (matched: boolean, score: number) => {
    if (matched) {
      return { variant: "default" as const, text: "OK" };
    }
    if (score >= 50) {
      return { variant: "secondary" as const, text: "部分一致" };
    }
    return { variant: "destructive" as const, text: "NG" };
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>類似度スコア内訳</DialogTitle>
        </DialogHeader>

        {/* 固定領域: 製品情報とスコア */}
        <div className="space-y-4 flex-shrink-0 pb-4">
          {/* 製品情報ヘッダー */}
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">
                  Target
                </div>
                <div className="text-base font-semibold">
                  {targetProduct.manufacturerProductNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {targetProduct.manufacturerName}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">
                  Candidate
                </div>
                <div className="text-base font-semibold">
                  {candidate.manufacturerProductNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {candidate.manufacturerName}
                </div>
              </div>
            </div>
          </div>

          {/* トータルスコア */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Score</span>
              <span
                className={`text-lg font-bold ${getScoreColor(totalScore)}`}
              >
                {totalScore} / 100
              </span>
            </div>
            <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${getScoreBgColor(totalScore)}`}
                style={{ width: `${totalScore}%` }}
              />
            </div>
            {/* 件数サマリー */}
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>
                総数: <span className="font-medium">{summary.total}</span>
              </span>
              <span>
                高スコア(80以上): <span className="font-medium">{summary.highScore}</span>
              </span>
              <span>
                中スコア(50-79): <span className="font-medium">{summary.mediumScore}</span>
              </span>
              <span>
                低スコア(50未満): <span className="font-medium">{summary.lowScore}</span>
              </span>
            </div>
          </div>
        </div>

        {/* スクロール領域: テーブル */}
        {breakdown.length > 0 ? (
          <div className="flex-1 overflow-auto border rounded-lg min-h-0">
            <div className="text-sm font-medium px-4 py-2 border-b bg-muted/30">
              パラメータ比較
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium bg-muted/50">
                      Parameter
                    </th>
                    <th className="px-4 py-2 text-left font-medium bg-muted/50">
                      Target
                    </th>
                    <th className="px-4 py-2 text-left font-medium bg-muted/50">
                      Candidate
                    </th>
                    <th className="px-4 py-2 text-center font-medium w-48 bg-muted/50">
                      Result
                    </th>
                    <th className="px-4 py-2 text-center font-medium w-24 bg-muted/50">
                      Score
                    </th>
                    <th className="px-4 py-2 text-left font-medium bg-muted/50">
                      Reason
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {breakdown.map((item, index) => {
                    // parameterIdから元のパラメータIDを抽出
                    const paramId = item.parameterId.includes(":")
                      ? item.parameterId.split(":")[1]
                      : item.parameterId;
                    const resultBadge = getResultBadge(item.matched, item.score);
                    return (
                      <tr
                        key={item.parameterId}
                        className={`border-t ${
                          index % 2 === 0 ? "bg-background" : "bg-muted/10"
                        }`}
                      >
                        <td className="px-4 py-2">
                          <div className="space-y-0.5">
                            <div className="font-medium">{paramId}</div>
                            <div className="text-xs text-muted-foreground font-normal leading-tight">
                              {item.displayName}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2">
                          {item.targetValue ?? "-"}
                        </td>
                        <td className="px-4 py-2">
                          {item.candidateValue ?? "-"}
                        </td>
                        <td className="px-4 py-2 text-center">
                          <Badge
                            variant={resultBadge.variant}
                            className="text-xs"
                          >
                            {resultBadge.text}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <span
                            className={`font-medium ${getScoreColor(
                              item.score
                            )}`}
                          >
                            {item.score}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {item.reason ?? "-"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>スコア内訳データがありません</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
