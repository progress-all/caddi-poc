"use client";

import { useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, ChevronDown, ChevronUp, HelpCircle } from "lucide-react";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type {
  NormalizedCompliance,
  RiskLevel,
  DifficultyLevel,
  ScoreBreakdownDetail,
} from "../_lib/types";
import { cn } from "@/app/_lib/utils";
import { DifficultyBadge } from "./difficulty-badge";
import { ScoreDetailSection } from "./score-detail-section";

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
}

// リスクレベル設定
const riskLevelConfig: Record<
  RiskLevel,
  { label: string; className: string; icon: string }
> = {
  Low: {
    label: "Low",
    className: "bg-green-500 text-white border-green-600",
    icon: "✅",
  },
  Medium: {
    label: "Medium",
    className: "bg-yellow-500 text-white border-yellow-600",
    icon: "⚠️",
  },
  High: {
    label: "High",
    className: "bg-red-500 text-white border-red-600",
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

  const riskConfig = riskLevelConfig[riskLevel];
  const rohsConfig = complianceStatusConfig[compliance.rohs];
  const reachConfig = complianceStatusConfig[compliance.reach];
  const statusConfig = getProductStatusConfig(product.ProductStatus?.Status);

  // DigiKey Product Number を取得（最初のバリエーションから）
  const digiKeyProductNumber =
    product.ProductVariations?.[0]?.DigiKeyProductNumber;

  return (
    <Card
      className={cn(
        "transition-colors flex flex-col relative",
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
      <CardContent className="p-3 flex flex-col flex-1 space-y-2">
        {/* ヘッダー: 画像 + MPN + メーカー + リスクバッジ（右上） */}
        <div className="flex items-start gap-2">
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
          {/* 右側: リスクバッジ + 説明ボタン */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Badge className={cn("text-sm px-3 py-1 h-7", riskConfig.className)}>
              {riskConfig.icon} {riskConfig.label}
            </Badge>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                <div className="space-y-2 text-sm">
                  <h4 className="font-medium">リスク評価基準</h4>
                  <div className="space-y-1.5">
                    <div className="flex items-start gap-2">
                      <Badge className="bg-red-500 text-white flex-shrink-0">
                        High
                      </Badge>
                      <span>
                        RoHS/REACHがNonCompliant、またはステータスがObsolete/Discontinued
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-yellow-500 text-white flex-shrink-0">
                        Medium
                      </Badge>
                      <span>
                        RoHS/REACHがUnknown、またはステータスがLast Time Buy/Not For New
                        Designs
                      </span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Badge className="bg-green-500 text-white flex-shrink-0">
                        Low
                      </Badge>
                      <span>
                        RoHS/REACHが両方Compliant、かつステータスがActive
                      </span>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
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
          {/* 代替難易度バッジ（類似品の場合のみ） */}
          {difficultyLevel && (
            <div className="flex items-center justify-between text-xs pt-1">
              <span className="text-muted-foreground">代替難易度:</span>
              <DifficultyBadge level={difficultyLevel} />
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
