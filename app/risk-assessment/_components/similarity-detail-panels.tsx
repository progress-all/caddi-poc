"use client";

import { Badge } from "@/components/ui/badge";
import type { CandidateDetailedInfo } from "../_lib/types";
import { getScoreDisplay } from "@/app/_lib/similarity-score-color";

export type BreakdownItem = {
  parameterId: string;
  displayName: string;
  score: number;
  matched: boolean;
  targetValue: string | null;
  candidateValue: string | null;
  status?: "compared" | "target_only" | "candidate_only" | "both_missing" | "excluded";
  excludeReason?: string;
  reason?: string;
  isComparable?: boolean;
};

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
  if (score >= 80) return { variant: "default" as const, text: "OK" };
  if (score >= 50) return { variant: "secondary" as const, text: "部分一致" };
  return { variant: "destructive" as const, text: "NG" };
}

function BreakdownTable({
  breakdown,
  sectionTitle,
  showReason = false,
  /** タブで既に表示しているため、表の上の見出し行を非表示にする */
  hideSectionTitle = false,
}: {
  breakdown: BreakdownItem[];
  sectionTitle: string;
  showReason?: boolean;
  hideSectionTitle?: boolean;
}) {
  if (breakdown.length === 0) {
    return (
      <div className="text-sm text-muted-foreground py-2">
        {sectionTitle}: スコア内訳データがありません
      </div>
    );
  }
  const hasReason = showReason || breakdown.some((item) => item.reason);
  // 列幅は合計100%にし、th/td に同じ幅を指定してヘッダと中身のずれを防ぐ
  const colWidths = hasReason
    ? ["20%", "18%", "18%", "12%", "8%", "24%"] // 6列: 100%
    : ["26%", "22%", "22%", "16%", "14%"]; // 5列: 100%

  const [wParam, wTarget, wCandidate, wResult, wScore, wReason] = hasReason
    ? colWidths
    : [...colWidths, undefined];

  return (
    <div className="rounded-lg flex flex-col min-w-0 border border-border overflow-hidden">
      <div className="sticky top-0 z-20 shrink-0 bg-muted">
        {!hideSectionTitle && (
          <div className="text-sm font-medium px-4 py-2 border-b bg-muted">
            {sectionTitle}
          </div>
        )}
        <div className="overflow-x-auto">
          <table
            className="w-full text-sm border-collapse table-fixed"
            style={{ minWidth: 640 }}
          >
            <colgroup>
              {colWidths.map((w, i) => (
                <col key={`col-${i}-${w}`} style={{ width: w }} />
              ))}
            </colgroup>
            <thead className="bg-muted">
              <tr>
                <th className="px-4 py-2 text-left font-medium min-w-0 bg-muted" style={{ width: wParam }}>Parameter</th>
                <th className="px-4 py-2 text-left font-medium min-w-0 bg-muted" style={{ width: wTarget }}>Target</th>
                <th className="px-4 py-2 text-left font-medium min-w-0 bg-muted" style={{ width: wCandidate }}>Candidate</th>
                <th className="px-4 py-2 text-center font-medium min-w-0 bg-muted" style={{ width: wResult }}>Result</th>
                <th className="px-4 py-2 text-center font-medium min-w-0 bg-muted" style={{ width: wScore }}>Score</th>
                {hasReason && (
                  <th className="px-4 py-2 text-left font-medium min-w-0 bg-muted" style={{ width: wReason }}>Reason (LLM)</th>
                )}
              </tr>
            </thead>
          </table>
        </div>
      </div>
      <div className="overflow-auto max-h-[50vh] min-w-0">
        <table
          className="w-full text-sm border-collapse table-fixed"
          style={{ minWidth: 640 }}
        >
          <colgroup>
            {colWidths.map((w, i) => (
              <col key={`col-body-${i}-${w}`} style={{ width: w }} />
            ))}
          </colgroup>
          <tbody>
            {breakdown.map((item, index) => {
              const paramId = item.parameterId.includes(":")
                ? item.parameterId.split(":")[1]
                : item.parameterId;
              const status = item.status ?? "compared";
              const isExcluded = status === "excluded" || item.isComparable === false;
              const resultBadge = getResultBadge(
                status,
                item.matched,
                item.score,
                item.excludeReason
              );
              const showScore = status === "compared";
              const reasonDisplay = isExcluded ? "-" : (item.reason ?? "-");
              return (
                <tr
                  key={item.parameterId}
                  className={`border-t border-border ${index % 2 === 0 ? "bg-background" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-2 text-left align-top min-w-0 overflow-hidden" style={{ width: wParam }}>
                    <div className="space-y-0.5 min-w-0 break-words">
                      <div className="font-medium">{paramId}</div>
                      <div className="text-xs text-muted-foreground font-normal leading-tight">
                        {item.displayName}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-left align-middle min-w-0 break-words" style={{ width: wTarget }}>{item.targetValue ?? "-"}</td>
                  <td className="px-4 py-2 text-left align-middle min-w-0 break-words" style={{ width: wCandidate }}>{item.candidateValue ?? "-"}</td>
                  <td className="px-4 py-2 text-center align-middle min-w-0" style={{ width: wResult }}>
                    <Badge variant={resultBadge.variant} className="text-xs">
                      {resultBadge.text}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-center align-middle min-w-0" style={{ width: wScore }}>
                    {showScore ? (
                      (() => {
                        const d = getScoreDisplay(item.score);
                        return (
                          <span className={`font-medium ${d.textClassName}`}>
                            {d.label}
                          </span>
                        );
                      })()
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </td>
                  {hasReason && (
                    <td className="px-4 py-2 text-left text-xs text-muted-foreground align-middle min-w-0 break-words" style={{ width: wReason }}>
                      {reasonDisplay}
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
 * Targetの自己比較用の breakdown を生成
 */
function buildSelfComparisonBreakdown(
  product: CandidateDetailedInfo
): BreakdownItem[] {
  const items: BreakdownItem[] = [];

  if (product.parameters) {
    for (const p of product.parameters) {
      const val = p.value ?? "";
      items.push({
        parameterId: String(p.parameterId ?? p.name),
        displayName: p.name || "",
        score: 100,
        matched: true,
        targetValue: val,
        candidateValue: val,
        status: "compared",
        isComparable: true,
      });
    }
  }

  if (product.datasheetParameters) {
    for (const [paramId, param] of Object.entries(product.datasheetParameters)) {
      const val = param.value ?? "";
      items.push({
        parameterId: `datasheet:${paramId}`,
        displayName: param.description || paramId,
        score: 100,
        matched: true,
        targetValue: val,
        candidateValue: val,
        status: "compared",
        isComparable: true,
      });
    }
  }

  return items;
}

interface DigiKeySimilarityPanelProps {
  targetProduct: CandidateDetailedInfo;
  candidate: CandidateDetailedInfo;
}

/**
 * DigiKeyタブ用パネル: DigiKeyパラメータのみの類似度内訳
 */
export function DigiKeySimilarityPanel({
  targetProduct,
  candidate,
}: DigiKeySimilarityPanelProps) {
  const isSelf = targetProduct.digiKeyProductNumber === candidate.digiKeyProductNumber
    || (targetProduct.manufacturerProductNumber === candidate.manufacturerProductNumber
      && !candidate.digiKeyProductNumber);

  const breakdownDigiKey = isSelf
    ? buildSelfComparisonBreakdown(targetProduct).filter((b) => !b.parameterId.startsWith("datasheet:"))
    : (candidate.similarityBreakdownDigiKey || []) as BreakdownItem[];

  const score = candidate.similarityScoreDigiKey ?? (isSelf ? 100 : undefined);
  const confidence = candidate.similarityConfidenceDigiKey;

  const scoreDisplay = getScoreDisplay(score);
  const comparableItems = breakdownDigiKey.filter(
    (item) => item.status === "compared" || item.isComparable !== false
  );
  const excludedItems = breakdownDigiKey.filter(
    (item) => item.status === "excluded" || item.isComparable === false
  );
  const scoreBreakdown = {
    total: comparableItems.length,
    high: comparableItems.filter((item) => item.score >= 80).length,
    mid: comparableItems.filter((item) => item.score >= 50 && item.score < 80).length,
    low: comparableItems.filter((item) => item.score < 50).length,
    excluded: excludedItems.length,
  };

  return (
    <div className="flex flex-col min-w-0 space-y-2 w-full">
      <div className="text-xs font-medium text-muted-foreground shrink-0">
        使用した情報ソース: DigiKeyのみ
      </div>
      <div className="flex items-center justify-between gap-2 shrink-0">
        <span className="text-sm font-medium shrink-0">スコア</span>
        <span className={`text-lg font-bold shrink-0 ${scoreDisplay.textClassName}`}>
          {scoreDisplay.hasScore ? `${scoreDisplay.label} / 100` : scoreDisplay.label}
        </span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
          <div
            className={`h-full transition-all ${scoreDisplay.barClassName}`}
            style={{ width: scoreDisplay.hasScore ? `${scoreDisplay.label}%` : "0%" }}
          />
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 space-y-2">
        <div>
          総数: {scoreBreakdown.total}
          高スコア(80以上): {scoreBreakdown.high}
          中スコア(50-79): {scoreBreakdown.mid}
          低スコア(50未満): {scoreBreakdown.low}
          対象外: {scoreBreakdown.excluded}
        </div>
        {confidence && (
          <div>
            信頼度: {confidence.comparableParams} / {confidence.totalParams} ({Math.round(confidence.confidenceRatioPercent)}%)
          </div>
        )}
      </div>
      <div className="min-w-0">
        <BreakdownTable
          breakdown={breakdownDigiKey}
          sectionTitle="DigiKeyのみ パラメータ比較"
          showReason={true}
          hideSectionTitle={true}
        />
      </div>
    </div>
  );
}

interface DatasheetSimilarityPanelProps {
  targetProduct: CandidateDetailedInfo;
  candidate: CandidateDetailedInfo;
}

/**
 * Datasheetタブ用パネル: DigiKey+Datasheet パラメータの類似度内訳
 */
export function DatasheetSimilarityPanel({
  targetProduct,
  candidate,
}: DatasheetSimilarityPanelProps) {
  const isSelf = targetProduct.digiKeyProductNumber === candidate.digiKeyProductNumber
    || (targetProduct.manufacturerProductNumber === candidate.manufacturerProductNumber
      && !candidate.digiKeyProductNumber);

  const breakdownDigiKey = (candidate.similarityBreakdownDigiKey || []) as BreakdownItem[];
  const breakdownCombined = (candidate.similarityBreakdown || []) as BreakdownItem[];
  const breakdownMerged: BreakdownItem[] = isSelf
    ? buildSelfComparisonBreakdown(targetProduct)
    : [
      ...breakdownDigiKey,
      ...breakdownCombined.filter((p) => p.parameterId.startsWith("datasheet:")),
    ];

  const score = candidate.similarityScore ?? (isSelf ? 100 : undefined);
  const confidence = candidate.similarityConfidence;

  const scoreDisplay = getScoreDisplay(score);
  const comparableItems = breakdownMerged.filter(
    (item) => item.status === "compared" || item.isComparable !== false
  );
  const excludedItems = breakdownMerged.filter(
    (item) => item.status === "excluded" || item.isComparable === false
  );
  const scoreBreakdown = {
    total: comparableItems.length,
    high: comparableItems.filter((item) => item.score >= 80).length,
    mid: comparableItems.filter((item) => item.score >= 50 && item.score < 80).length,
    low: comparableItems.filter((item) => item.score < 50).length,
    excluded: excludedItems.length,
  };

  return (
    <div className="flex flex-col min-w-0 space-y-2 w-full">
      <div className="text-xs font-medium text-muted-foreground shrink-0">
        使用した情報ソース: DigiKey+Datasheet
      </div>
      <div className="flex items-center justify-between gap-2 shrink-0">
        <span className="text-sm font-medium shrink-0">スコア</span>
        <span className={`text-lg font-bold shrink-0 ${scoreDisplay.textClassName}`}>
          {scoreDisplay.hasScore ? `${scoreDisplay.label} / 100` : scoreDisplay.label}
        </span>
        <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden min-w-0">
          <div
            className={`h-full transition-all ${scoreDisplay.barClassName}`}
            style={{ width: scoreDisplay.hasScore ? `${scoreDisplay.label}%` : "0%" }}
          />
        </div>
      </div>
      <div className="text-xs text-muted-foreground shrink-0 space-y-2">
        <div>
          総数: {scoreBreakdown.total}
          高スコア(80以上): {scoreBreakdown.high}
          中スコア(50-79): {scoreBreakdown.mid}
          低スコア(50未満): {scoreBreakdown.low}
          対象外: {scoreBreakdown.excluded}
        </div>
        {confidence && (
          <div>
            信頼度: {confidence.comparableParams} / {confidence.totalParams} ({Math.round(confidence.confidenceRatioPercent)}%)
          </div>
        )}
      </div>
      <div className="min-w-0">
        <BreakdownTable
          breakdown={breakdownMerged}
          sectionTitle="DigiKey+Datasheet パラメータ比較"
          showReason={true}
          hideSectionTitle={true}
        />
      </div>
    </div>
  );
}
