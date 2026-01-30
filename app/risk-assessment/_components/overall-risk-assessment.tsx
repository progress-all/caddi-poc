"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { HelpCircle } from "lucide-react";
import type { RiskLevel, PartRiskClassification } from "../_lib/types";
import { cn } from "@/app/_lib/utils";

/** 総合リスクの表示ラベル（低/中/高） */
const riskLevelLabel: Record<RiskLevel, string> = {
  Low: "低",
  Medium: "中",
  High: "高",
};

/**
 * 左カラーバー＋テキスト用の色（補助情報・彩度控えめ）
 * Low=グレー/緑系、Medium=薄いオレンジ系、High=赤系
 */
const barColorByLevel: Record<
  RiskLevel,
  string
> = {
  Low:
    "bg-slate-400 dark:bg-slate-500",
  Medium:
    "bg-stone-500 dark:bg-stone-400",
  High:
    "bg-red-700 dark:bg-red-600",
};

export interface OverallRiskAssessmentProps {
  /** 総合リスクレベル（RoHS/REACH/ステータス/代替候補を総合した結果） */
  riskLevel: RiskLevel;
  /** 顕在・将来リスクの有無（説明的ラベル用） */
  classification: PartRiskClassification;
  /** テーブルセルなどコンパクト表示 */
  compact?: boolean;
  /** 説明ポップオーバーを表示するか（カード用） */
  showHelp?: boolean;
  className?: string;
}

/**
 * 総合リスク評価セクション
 * RoHS / REACH / ステータス / 代替候補の4要素を総合した結果を、
 * テキスト＋細いカラーバーで表示。顕在・将来リスクは説明的ラベルとして補足。
 */
export function OverallRiskAssessment({
  riskLevel,
  classification,
  compact = false,
  showHelp = false,
  className,
}: OverallRiskAssessmentProps) {
  const levelLabel = riskLevelLabel[riskLevel];
  const hasDetail =
    classification.current || classification.future;
  const detailParts: string[] = [];
  if (classification.current) detailParts.push("顕在リスク");
  if (classification.future) detailParts.push("将来リスク");
  const detailText = detailParts.length > 0 ? `（${detailParts.join("、")}）` : "";

  const content = (
    <div
      className={cn(
        "flex items-center gap-2 min-w-0",
        !compact && "py-1.5",
        className
      )}
    >
      {/* 細いカラーバー（補助） */}
      <div
        className={cn(
          "flex-shrink-0 rounded-sm",
          barColorByLevel[riskLevel],
          compact ? "w-1 h-4" : "w-1 h-5"
        )}
        aria-hidden
      />
      <div className="flex-1 min-w-0 text-xs">
        <span className="text-foreground font-medium">
          総合リスク：{levelLabel}
        </span>
        {hasDetail && (
          <span className="text-muted-foreground ml-1">{detailText}</span>
        )}
      </div>
    </div>
  );

  if (showHelp) {
    return (
      <div className="flex items-center gap-1.5 w-full">
        <div className="flex-1 min-w-0">{content}</div>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex-shrink-0 text-muted-foreground hover:text-foreground p-0.5 rounded"
              onClick={(e) => e.stopPropagation()}
              aria-label="リスク評価の基準を表示"
            >
              <HelpCircle className="h-3.5 w-3.5" />
            </button>
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
              <p className="text-xs text-muted-foreground pt-1">
                顕在リスク＝既に問題がある状態、将来リスク＝今後注意が必要な状態を示します。
              </p>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  return content;
}
