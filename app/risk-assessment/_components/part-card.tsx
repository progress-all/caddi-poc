"use client";

import { useState, useCallback } from "react";
import useSWR from "swr";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, ChevronDown, ChevronUp, HelpCircle, Info } from "lucide-react";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type {
  NormalizedCompliance,
  RiskLevel,
  DifficultyLevel,
  ScoreBreakdownDetail,
  RiskEvidence,
} from "../_lib/types";
import { cn } from "@/app/_lib/utils";
import { DifficultyBadge } from "./difficulty-badge";
import { ScoreDetailSection } from "./score-detail-section";
import { getSubstitutions } from "@/app/_lib/vendor/digikey/api";
import { getRiskLevel, getPartRiskClassification, getContributingReasons } from "../_lib/compliance-utils";
import { buildRiskEvidenceFromProduct } from "../_lib/risk-evidence";

interface PartCardProps {
  product: DigiKeyProduct;
  compliance: NormalizedCompliance;
  riskLevel: RiskLevel;
  isSelected?: boolean;
  onSelect?: (product: DigiKeyProduct) => void;
  showSimilarSearchButton?: boolean;
  onSimilarSearch?: (product: DigiKeyProduct, e: React.MouseEvent) => void;
  // 類似品固有の情報（オプション）
  similarityScore?: number;
  difficultyLevel?: DifficultyLevel;
  scoreBreakdown?: {
    specMatch: number;
    complianceSafety: number;
    availability: number;
  };
  // 詳細スコア情報（オプション）
  scoreBreakdownDetail?: ScoreBreakdownDetail;
  targetProduct?: DigiKeyProduct;
  /** 判断根拠（未指定時は product + compliance から構築。PDF 根拠は任意で渡す） */
  riskEvidence?: RiskEvidence;
}

// カード左端の細いインジケータ用（一覧で一目で分かる色分け）
const riskLevelBorderClass: Record<RiskLevel, string> = {
  Low: "border-l-slate-400 dark:border-l-slate-500",
  Medium: "border-l-stone-500 dark:border-l-stone-400",
  High: "border-l-red-700 dark:border-l-red-600",
};

// 右上リスクバッジ用（先方フィードバックで残す・クリック不可のためホバー時も色変化なし）
const riskLevelBadgeConfig: Record<
  RiskLevel,
  { label: string; className: string; icon: string }
> = {
  Low: {
    label: "Low",
    className: "bg-green-500 text-white border-green-600 hover:bg-green-500 hover:opacity-100 cursor-default",
    icon: "✅",
  },
  Medium: {
    label: "Medium",
    className: "bg-yellow-500 text-white border-yellow-600 hover:bg-yellow-500 hover:opacity-100 cursor-default",
    icon: "⚠️",
  },
  High: {
    label: "High",
    className: "bg-red-500 text-white border-red-600 hover:bg-red-500 hover:opacity-100 cursor-default",
    icon: "❌",
  },
};

// 規制ステータス設定
const complianceStatusConfig: Record<
  NormalizedCompliance["rohs"] | NormalizedCompliance["reach"],
  { label: string; icon: string }
> = {
  Compliant: { label: "Compliant", icon: "✅" },
  NonCompliant: { label: "Non-Compliant", icon: "❌" },
  Unknown: { label: "Unknown", icon: "⚠️" },
};

// 製品ステータス設定
const getProductStatusConfig = (status?: string): { label: string; icon: string } => {
  if (!status) {
    return { label: "Unknown", icon: "⚠️" };
  }
  const statusLower = status.toLowerCase();
  if (statusLower === "active") {
    return { label: status, icon: "✅" };
  }
  if (
    statusLower.includes("obsolete") ||
    statusLower.includes("discontinued")
  ) {
    return { label: status, icon: "❌" };
  }
  if (
    statusLower.includes("last time buy") ||
    statusLower.includes("not for new designs")
  ) {
    return { label: status, icon: "⚠️" };
  }
  // その他のステータス（Preliminaryなど）
  return { label: status, icon: "⚠️" };
};

export function PartCard({
  product,
  compliance,
  riskLevel,
  isSelected = false,
  onSelect,
  showSimilarSearchButton = false,
  onSimilarSearch,
  similarityScore,
  difficultyLevel,
  scoreBreakdown,
  scoreBreakdownDetail,
  targetProduct,
  riskEvidence: riskEvidenceProp,
}: PartCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const handleClick = useCallback(() => {
    onSelect?.(product);
  }, [onSelect, product]);

  const handleSimilarSearchClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onSimilarSearch?.(product, e);
    },
    [onSimilarSearch, product]
  );

  // DigiKey Product Number を取得（最初のバリエーションから）
  const digiKeyProductNumber =
    product.ProductVariations?.[0]?.DigiKeyProductNumber;

  // 代替候補の件数を取得（DigiKey PNがあれば優先、なければMPNを使用）
  const productNumberForSubstitutions = digiKeyProductNumber || product.ManufacturerProductNumber;
  const {
    data: substitutionsData,
    error: substitutionsError,
    isLoading: isSubstitutionsLoading,
  } = useSWR(
    productNumberForSubstitutions
      ? ["substitutions-count", productNumberForSubstitutions]
      : null,
    async () => {
      if (!productNumberForSubstitutions) return null;
      try {
        const result = await getSubstitutions({
          productNumber: productNumberForSubstitutions,
        });
        return result;
      } catch (error) {
        // エラーをthrowせず、エラー状態として扱う
        console.error("Failed to get substitutions count:", error);
        throw error;
      }
    },
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: false,
      dedupingInterval: 60000, // 60秒間は同一キーで再取得しない
    }
  );

  // 代替候補の件数を計算
  const substitutionsCount =
    substitutionsData?.ProductSubstitutes?.length ?? 0;

  // リスクレベルを計算（代替候補件数を考慮）
  // エラー時や未取得時はnullを渡して既存判定を据え置く
  const computedRiskLevel = getRiskLevel(
    compliance,
    product.ProductStatus?.Status,
    substitutionsError ? null : substitutionsCount
  );

  const riskBorderClass = riskLevelBorderClass[computedRiskLevel];
  const riskBadgeConfig = riskLevelBadgeConfig[computedRiskLevel];
  const rohsConfig = complianceStatusConfig[compliance.rohs];
  const reachConfig = complianceStatusConfig[compliance.reach];
  const statusConfig = getProductStatusConfig(product.ProductStatus?.Status);

  // 顕在・将来リスクの分類（バッジ横の説明ポップオーバー用）
  const riskClassification = getPartRiskClassification(
    compliance,
    product.ProductStatus?.Status,
    substitutionsError ? null : substitutionsCount
  );

  // 判断根拠（未指定時は DigiKey 由来のみ構築）
  const riskEvidence: RiskEvidence =
    riskEvidenceProp ?? buildRiskEvidenceFromProduct(product, compliance);

  // リスクの原因になった項目だけ（全部は出さない）
  const { currentReasons, futureReasons } = getContributingReasons(
    compliance,
    product.ProductStatus?.Status,
    substitutionsError ? null : substitutionsCount,
    riskClassification
  );
  const hasAnyReason = currentReasons.length > 0 || futureReasons.length > 0;

  return (
    <Card
      className={cn(
        "transition-colors flex flex-col relative border-l-4",
        riskBorderClass,
        isSelected
          ? "border-primary bg-primary/5 cursor-pointer"
          : onSelect
            ? "cursor-pointer hover:bg-muted/50"
            : ""
      )}
      onClick={onSelect ? handleClick : undefined}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-3 flex flex-col flex-1 space-y-2 relative">
        {/* ヘッダー: 画像 + MPN + メーカー（バッジは右上に絶対配置で改行に影響させない） */}
        <div className="flex items-start gap-2 pr-24 min-w-0">
          {product.PhotoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.PhotoUrl}
              alt={product.ManufacturerProductNumber}
              className="w-12 h-12 object-contain border rounded flex-shrink-0"
            />
          )}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="font-medium text-sm truncate">
                MPN: {product.ManufacturerProductNumber}
              </div>
              {/* 類似度スコアバッジ（類似品の場合のみ） */}
              {similarityScore !== undefined && (
                <>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs flex-shrink-0",
                      similarityScore >= 80
                        ? "border-green-500 text-green-600"
                        : similarityScore >= 60
                          ? "border-yellow-500 text-yellow-600"
                          : "border-red-500 text-red-600"
                    )}
                  >
                    スコア: {similarityScore}
                  </Badge>
                  {/* スコア内訳（控えめに表示） */}
                  {(scoreBreakdown || scoreBreakdownDetail) && (
                    <span className="text-[10px] text-muted-foreground flex-shrink-0">
                      仕様一致:{" "}
                      {scoreBreakdownDetail?.specMatch.total ??
                        scoreBreakdown?.specMatch ??
                        0}{" "}
                      / 規制安全:{" "}
                      {scoreBreakdownDetail?.complianceSafety.total ??
                        scoreBreakdown?.complianceSafety ??
                        0}{" "}
                      / 入手性:{" "}
                      {scoreBreakdownDetail?.availability.total ??
                        scoreBreakdown?.availability ??
                        0}
                    </span>
                  )}
                </>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {product.Manufacturer?.Name}
            </div>
            {digiKeyProductNumber && (
              <div className="text-xs text-muted-foreground truncate">
                DigiKey P/N: {digiKeyProductNumber}
              </div>
            )}
          </div>
        </div>
        {/* 右上固定: リスク結果バッジ＋説明（判断根拠の改行に影響されない） */}
        <div className="absolute top-3 right-3 flex items-center gap-1 flex-shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "text-sm px-3 py-1 h-7 border",
              riskBadgeConfig.className
            )}
          >
            {riskBadgeConfig.icon} {riskBadgeConfig.label}
          </Badge>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 rounded-full shrink-0"
                onClick={(e) => e.stopPropagation()}
                aria-label="リスク評価の基準を表示"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">総合リスク評価の基準</h4>
                <p className="text-muted-foreground text-xs">
                  RoHS・REACH・ステータス（Active/NRND/EOL等）・代替・類似候補の有無を総合して評価しています。
                </p>
                <ul className="list-disc list-inside text-xs space-y-1 text-muted-foreground">
                  <li>高：規制不適合、または廃番・生産終了など</li>
                  <li>中：不明・NRND/Last Time Buy、または代替候補なし</li>
                  <li>低：規制適合かつアクティブ</li>
                </ul>
                {(riskClassification.current || riskClassification.future) && (
                  <p className="text-xs pt-1 border-t">
                    <span className="text-muted-foreground">この部品の該当：</span>
                    {[riskClassification.current && "顕在リスク", riskClassification.future && "将来リスク"]
                      .filter(Boolean)
                      .join("、")}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  顕在＝既に問題がある状態、将来＝今後注意が必要な状態です。
                </p>
              </div>
            </PopoverContent>
          </Popover>
        </div>

        {/* カテゴリ */}
        {product.Category?.Name && (
          <div className="text-xs text-muted-foreground">
            カテゴリ: {product.Category.Name}
          </div>
        )}

        {/* 説明 */}
        <div className="text-xs text-muted-foreground line-clamp-2 flex-1">
          {product.Description?.ProductDescription}
        </div>

        {/* 規制情報 */}
        <div className="space-y-1.5 pt-2 border-t">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">RoHS:</span>
            <div className="flex items-center gap-1">
              <span>{rohsConfig.icon}</span>
              <span>{rohsConfig.label}</span>
            </div>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">REACH:</span>
            <div className="flex items-center gap-1">
              <span>{reachConfig.icon}</span>
              <span>{reachConfig.label}</span>
            </div>
          </div>
          {product.ProductStatus?.Status && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">ステータス:</span>
              <div className="flex items-center gap-1">
                <span>{statusConfig.icon}</span>
                <span>{statusConfig.label}</span>
              </div>
            </div>
          )}
          {/* 代替・類似候補の有無 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">代替・類似候補:</span>
            <div className="flex items-center gap-1">
              {isSubstitutionsLoading ? (
                <span className="text-muted-foreground">判定中…</span>
              ) : substitutionsError ? (
                <span className="text-destructive">取得失敗</span>
              ) : substitutionsCount > 0 ? (
                <span className="text-foreground">あり（{substitutionsCount}件）</span>
              ) : (
                <span className="text-muted-foreground">なし</span>
              )}
            </div>
          </div>
          {/* 代替難易度バッジ（類似品の場合のみ） */}
          {difficultyLevel && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground">代替難易度:</span>
              <DifficultyBadge level={difficultyLevel} />
            </div>
          )}
          {/* 該当（上4つと同じラベル: 値の形式・該当: はグレー） */}
          <div className="border-t" />
          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-muted-foreground shrink-0">該当:</span>
            <div className="flex items-center gap-1 min-w-0 justify-end">
              {hasAnyReason ? (
                <span className="text-foreground shrink-0">
                  {[riskClassification.current && "顕在リスク", riskClassification.future && "将来リスク"]
                    .filter(Boolean)
                    .join("、")}
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
              <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 rounded-full"
                        onClick={(e) => e.stopPropagation()}
                        aria-label="判断根拠の詳細を表示"
                      >
                        <Info className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 max-h-[70vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                      <div className="space-y-3 text-sm">
                        <h4 className="font-medium">判断根拠（詳細）</h4>
                        {hasAnyReason ? (
                          <p className="text-xs text-muted-foreground">
                            以下の理由でリスクに該当しています。
                          </p>
                        ) : null}
                        <div>
                          <ul className="space-y-1.5 text-xs">
                            {currentReasons.length > 0 &&
                              currentReasons.map((s) => (
                                <li key={`current-${s.slice(0, 30)}`}>{s}</li>
                              ))}
                            {futureReasons.length > 0 &&
                              futureReasons.map((s) => (
                                <li key={`future-${s.slice(0, 30)}`}>{s}</li>
                              ))}
                            {!hasAnyReason && (
                              <li className="text-muted-foreground">該当なし</li>
                            )}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-muted-foreground mb-1.5">参考（API値）</p>
                          <ul className="space-y-1 text-xs text-muted-foreground">
                            {riskEvidence.digiKey.lifecycle != null && riskEvidence.digiKey.lifecycle !== "" && (
                              <li>Lifecycle: {riskEvidence.digiKey.lifecycle}</li>
                            )}
                            {riskEvidence.digiKey.rohs != null && riskEvidence.digiKey.rohs !== "" && (
                              <li>RoHS: {riskEvidence.digiKey.rohs}</li>
                            )}
                            {riskEvidence.digiKey.reach != null && riskEvidence.digiKey.reach !== "" && (
                              <li>REACH: {riskEvidence.digiKey.reach}</li>
                            )}
                            {(riskEvidence.digiKey.productUrl || riskEvidence.digiKey.datasheetUrl) && (
                              <li className="pt-1">
                                参照:{" "}
                                {riskEvidence.digiKey.productUrl && (
                                  <a
                                    href={riskEvidence.digiKey.productUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                  >
                                    Product URL
                                  </a>
                                )}
                                {riskEvidence.digiKey.productUrl && riskEvidence.digiKey.datasheetUrl && " / "}
                                {riskEvidence.digiKey.datasheetUrl && (
                                  <a
                                    href={riskEvidence.digiKey.datasheetUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary underline"
                                  >
                                    Datasheet URL
                                  </a>
                                )}
                              </li>
                            )}
                          </ul>
                        </div>
                        {riskEvidence.pdf?.items != null && riskEvidence.pdf.items.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1.5">PDF（抽出）</p>
                            <ul className="space-y-1 text-xs">
                              {riskEvidence.pdf.items.map((item, i) => (
                                <li key={`pdf-${i}-${item.text.slice(0, 30)}`}>
                                  &quot;{item.text}&quot;
                                  {item.page != null && <span className="text-muted-foreground"> （p.{item.page}）</span>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </PopoverContent>
              </Popover>
            </div>
          </div>
          {/* 根拠（該当の次行・左揃え・顕在と将来の両方あるときは改行、最大2行で省略、Popoverで全文） */}
          {hasAnyReason && (
            <div className="pt-1 space-y-0.5 min-w-0">
              <div className="flex items-start gap-1 text-xs min-w-0">
                <span className="text-muted-foreground shrink-0">根拠:</span>
                <div className="text-foreground text-right line-clamp-2 whitespace-pre-line min-w-0 flex-1">
                  {currentReasons.length > 0 && futureReasons.length > 0
                    ? `${currentReasons.join(" ")}\n${futureReasons.join(" ")}`
                    : [...currentReasons, ...futureReasons].join(" ")}
                </div>
              </div>
            </div>
          )}
          {riskEvidence.pdf?.items != null && riskEvidence.pdf.items.length > 0 && (
            <div className="text-xs pt-0.5 text-muted-foreground">
              PDF根拠：あり（Popoverで確認）
            </div>
          )}
        </div>

        {/* 在庫 */}
        {product.QuantityAvailable != null &&
          product.QuantityAvailable > 0 && (
            <div className="flex items-center justify-between text-xs pt-1 border-t">
              <span className="text-muted-foreground">
                在庫: {product.QuantityAvailable.toLocaleString()}個
              </span>
            </div>
          )}

        {/* 評価の詳細を開くボタン（類似品の場合のみ） */}
        {(scoreBreakdownDetail || scoreBreakdown) && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full h-8 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                setIsDetailOpen(!isDetailOpen);
              }}
            >
              {isDetailOpen ? "評価の詳細を閉じる" : "評価の詳細を開く"}
              {isDetailOpen ? (
                <ChevronUp className="w-3 h-3 ml-1.5" />
              ) : (
                <ChevronDown className="w-3 h-3 ml-1.5" />
              )}
            </Button>
          </div>
        )}

        {/* スコア詳細セクション（展開時のみ表示） */}
        {isDetailOpen && scoreBreakdownDetail && targetProduct && (
          <ScoreDetailSection
            scoreBreakdownDetail={scoreBreakdownDetail}
            targetProduct={targetProduct}
            candidateProduct={product}
            candidateCompliance={compliance}
            candidateRiskLevel={riskLevel}
          />
        )}

        {/* 類似品を探すボタン */}
        {showSimilarSearchButton && onSimilarSearch && (
          <div className="pt-2 border-t">
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "w-full h-8 text-xs transition-all",
                isHovered ? "opacity-100" : "opacity-60 hover:opacity-100"
              )}
              onClick={handleSimilarSearchClick}
            >
              <Search className="w-3 h-3 mr-1.5" />
              類似品を探す
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
