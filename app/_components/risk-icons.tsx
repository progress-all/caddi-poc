"use client";

import {
  complianceIconConfig,
  lifecycleIconConfig,
  normalizeComplianceStatus,
  normalizeLifecycleStatus,
} from "@/app/_lib/risk-icon-config";

export interface RiskIconsProps {
  /** RoHS ステータス（API の文字列のまま可） */
  readonly rohs?: string | null;
  /** REACH ステータス（API の文字列のまま可） */
  readonly reach?: string | null;
  /** ライフサイクル / Part Status（API の文字列のまま可） */
  readonly lifecycle?: string | null;
  /** 追加クラス（レイアウト用） */
  readonly className?: string;
  /** アイコンサイズを小さくする（テーブルセル用） */
  readonly compact?: boolean;
}

/**
 * RoHS / REACH / Lifecycle のリスクをアイコンで表示する共通コンポーネント。
 * 部品詳細・BOM一覧・代替・類似候補で同じ見た目・判定を流用する。
 * 各アイコンに hover でツールチップ（例: "RoHS: NonCompliant"）を表示。
 */
export function RiskIcons({
  rohs,
  reach,
  lifecycle,
  className = "",
  compact = false,
}: RiskIconsProps) {
  const rohsStatus = normalizeComplianceStatus(rohs);
  const reachStatus = normalizeComplianceStatus(reach);
  const lifecycleStatus = normalizeLifecycleStatus(lifecycle);

  const rohsConfig = complianceIconConfig[rohsStatus];
  const reachConfig = complianceIconConfig[reachStatus];
  const lifecycleConfig = lifecycleIconConfig[lifecycleStatus];

  const sizeClass = compact ? "text-sm" : "text-base";
  const gapClass = compact ? "gap-1" : "gap-1.5";

  return (
    <div
      className={`flex items-center flex-wrap ${gapClass} ${sizeClass} ${className}`}
      aria-label="RoHS / REACH / Lifecycle status"
    >
      <span
        title={`RoHS: ${rohsConfig.label}`}
        className="inline-flex items-center shrink-0"
      >
        {rohsConfig.icon}
      </span>
      <span
        title={`REACH: ${reachConfig.label}`}
        className="inline-flex items-center shrink-0"
      >
        {reachConfig.icon}
      </span>
      <span
        title={`Lifecycle: ${lifecycleConfig.label}`}
        className="inline-flex items-center shrink-0"
      >
        {lifecycleConfig.icon}
      </span>
    </div>
  );
}
