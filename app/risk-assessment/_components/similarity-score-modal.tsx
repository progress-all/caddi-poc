"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import type { CandidateDetailedInfo } from "../_lib/types";

type BreakdownItem = {
  parameterId: string;
  displayName: string;
  score: number;
  matched: boolean;
  targetValue: string | null;
  candidateValue: string | null;
  status?: "compared" | "target_only" | "candidate_only" | "both_missing" | "excluded";
  excludeReason?: string;
  /** LLMによる判定理由 */
  reason?: string;
};

export type SimilarityModalVariant = "digikey" | "datasheet";

interface SimilarityScoreModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetProduct: CandidateDetailedInfo;
  candidate: CandidateDetailedInfo;
  /** 表示する内訳: DigiKey基準 または データシート基準 */
  variant: SimilarityModalVariant;
}

function getScoreColor(score: number) {
  if (score >= 80) return "text-green-600 dark:text-green-400";
  if (score >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBgColor(score: number) {
  if (score >= 80) return "bg-green-500";
  if (score >= 60) return "bg-yellow-500";
  return "bg-red-500";
}

function getResultBadge(
  status: string,
  _matched: boolean,
  score: number,
  excludeReason?: string
) {
  if (status === "excluded") {
    return {
      variant: "outline" as const,
      text: excludeReason ? `対象外（${excludeReason}）` : "対象外",
    };
  }
  if (status === "both_missing") {
    return { variant: "outline" as const, text: "データなし" };
  }
  if (status === "target_only") {
    return { variant: "secondary" as const, text: "比較不可 (候補に値なし)" };
  }
  if (status === "candidate_only") {
    return { variant: "secondary" as const, text: "比較不可 (Targetに値なし)" };
  }
  // status === "compared": evaluate-similarity と同じ基準で OK/部分一致/NG を判定
  if (score >= 80) return { variant: "default" as const, text: "OK" };
  if (score >= 50) return { variant: "secondary" as const, text: "部分一致" };
  return { variant: "destructive" as const, text: "NG" };
}

function BreakdownTable({
  breakdown,
  sectionTitle,
  showReason = false,
}: {
  breakdown: BreakdownItem[];
  sectionTitle: string;
  showReason?: boolean;
}) {
  if (breakdown.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        {sectionTitle}: スコア内訳データがありません
      </div>
    );
  }
  const hasReason = showReason || breakdown.some((item) => item.reason);
  return (
    <div className="flex-1 overflow-auto border rounded-lg min-h-0">
      <div className="text-sm font-medium px-4 py-2 border-b bg-muted/30">
        {sectionTitle}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 sticky top-0 z-10">
            <tr>
              <th className="px-4 py-2 text-left font-medium bg-muted/50">Parameter</th>
              <th className="px-4 py-2 text-left font-medium bg-muted/50">Target</th>
              <th className="px-4 py-2 text-left font-medium bg-muted/50">Candidate</th>
              <th className="px-4 py-2 text-center font-medium w-48 bg-muted/50">Result</th>
              <th className="px-4 py-2 text-center font-medium w-24 bg-muted/50">Score</th>
              {hasReason && (
                <th className="px-4 py-2 text-left font-medium bg-muted/50">Reason (LLM)</th>
              )}
            </tr>
          </thead>
          <tbody>
            {breakdown.map((item, index) => {
              const paramId = item.parameterId.includes(":")
                ? item.parameterId.split(":")[1]
                : item.parameterId;
              const status = item.status ?? "compared";
              const resultBadge = getResultBadge(
                status,
                item.matched,
                item.score,
                item.excludeReason
              );
              const showScore = status === "compared";
              return (
                <tr
                  key={item.parameterId}
                  className={`border-t ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-2">
                    <div className="space-y-0.5">
                      <div className="font-medium">{paramId}</div>
                      <div className="text-xs text-muted-foreground font-normal leading-tight">
                        {item.displayName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2">{item.targetValue ?? "-"}</td>
                  <td className="px-4 py-2">{item.candidateValue ?? "-"}</td>
                  <td className="px-4 py-2 text-center">
                    <Badge variant={resultBadge.variant} className="text-xs">
                      {resultBadge.text}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center">
                    {showScore ? (
                      <span className={`font-medium ${getScoreColor(item.score)}`}>
                        {item.score}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {hasReason && (
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[300px]">
                      {item.reason ?? "-"}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * 類似度スコア内訳モーダル
 * variant に応じて DigiKey基準 または データシート基準 のスコアと内訳のみを表示
 */
export function SimilarityScoreModal({
  open,
  onOpenChange,
  targetProduct,
  candidate,
  variant,
}: SimilarityScoreModalProps) {
  const breakdownDigiKey = (candidate.similarityBreakdownDigiKey || []) as BreakdownItem[];
  const breakdownDatasheet = (candidate.similarityBreakdown || []) as BreakdownItem[];
  const scoreDigiKey = candidate.similarityScoreDigiKey ?? 0;
  const scoreDatasheet = candidate.similarityScore ?? 0;

  const isDigiKey = variant === "digikey";
  const score = isDigiKey ? scoreDigiKey : scoreDatasheet;
  const breakdown = isDigiKey ? breakdownDigiKey : breakdownDatasheet;
  const title = isDigiKey ? "類似度スコア内訳（DigiKey基準）" : "類似度スコア内訳（データシート基準）";
  const sectionTitle = isDigiKey ? "DigiKey基準 パラメータ比較" : "データシート基準 パラメータ比較";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-shrink-0 pb-4">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Target</div>
                <div className="text-base font-semibold">
                  {targetProduct.manufacturerProductNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {targetProduct.manufacturerName}
                </div>
              </div>
              <div className="flex-1">
                <div className="text-sm font-medium text-muted-foreground">Candidate</div>
                <div className="text-base font-semibold">
                  {candidate.manufacturerProductNumber}
                </div>
                <div className="text-xs text-muted-foreground">
                  {candidate.manufacturerName}
                </div>
              </div>
            </div>
          </div>

          {/* スコア */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm font-medium shrink-0">
                {isDigiKey ? "DigiKey基準" : "データシート基準"}
              </span>
              <span className={`text-lg font-bold shrink-0 ${getScoreColor(score)}`}>
                {score} / 100
              </span>
              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden min-w-0">
                <div
                  className={`h-full transition-all ${getScoreBgColor(score)}`}
                  style={{ width: `${score}%` }}
                />
              </div>
            </div>
            {/* 件数サマリー */}
            {breakdown.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <span>
                  総数: <span className="font-medium">{breakdown.length}</span>
                </span>
                <span>
                  高スコア(80以上): <span className="font-medium">{breakdown.filter((item) => item.score >= 80).length}</span>
                </span>
                <span>
                  中スコア(50-79): <span className="font-medium">{breakdown.filter((item) => item.score >= 50 && item.score < 80).length}</span>
                </span>
                <span>
                  低スコア(50未満): <span className="font-medium">{breakdown.filter((item) => item.score < 50).length}</span>
                </span>
              </div>
            )}
          </div>
        </div>

        {/* スクロール領域: テーブル（mainブランチと同じ構造） */}
        <BreakdownTable
          breakdown={breakdown}
          sectionTitle={sectionTitle}
          showReason={true}
        />
      </DialogContent>
    </Dialog>
  );
}
