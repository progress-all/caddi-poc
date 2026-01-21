"use client";

import { CheckCircle2, XCircle } from "lucide-react";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/components/ui/tabs";
import type {
  ScoreBreakdownDetail,
  ComplianceStatus,
  RiskLevel,
} from "../_lib/types";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";

interface ScoreDetailSectionProps {
  scoreBreakdownDetail: ScoreBreakdownDetail;
  targetProduct: DigiKeyProduct;
  candidateProduct: DigiKeyProduct;
  candidateCompliance: { rohs: ComplianceStatus; reach: ComplianceStatus };
  candidateRiskLevel: RiskLevel;
}

export function ScoreDetailSection({
  scoreBreakdownDetail,
  targetProduct,
  candidateProduct,
  candidateCompliance,
  candidateRiskLevel,
}: ScoreDetailSectionProps) {
  const { specMatch, complianceSafety, availability } = scoreBreakdownDetail;

  // 対象部品の仕様を抽出（簡易版）
  const getTargetPackage = () => {
    const packageParam = targetProduct.Parameters?.find(
      (p) =>
        p.ParameterText === "Package / Case" ||
        p.ParameterText === "Supplier Device Package"
    );
    return packageParam?.ValueText || null;
  };

  const getTargetVoltage = (): [number | null, number | null] => {
    const minParam = targetProduct.Parameters?.find(
      (p) => p.ParameterText === "Voltage - Supply Span (Min)"
    );
    const maxParam = targetProduct.Parameters?.find(
      (p) => p.ParameterText === "Voltage - Supply Span (Max)"
    );
    const min = minParam?.ValueText
      ? parseFloat(minParam.ValueText.replace(/[^0-9.]/g, ""))
      : null;
    const max = maxParam?.ValueText
      ? parseFloat(maxParam.ValueText.replace(/[^0-9.]/g, ""))
      : null;
    return [min, max];
  };

  const getTargetMountingType = () => {
    const param = targetProduct.Parameters?.find(
      (p) => p.ParameterText === "Mounting Type"
    );
    return param?.ValueText || null;
  };

  const getCandidatePackage = () => {
    const packageParam = candidateProduct.Parameters?.find(
      (p) =>
        p.ParameterText === "Package / Case" ||
        p.ParameterText === "Supplier Device Package"
    );
    return packageParam?.ValueText || specMatch.packageMatch.candidate;
  };

  const getCandidateVoltage = (): [number | null, number | null] => {
    const minParam = candidateProduct.Parameters?.find(
      (p) => p.ParameterText === "Voltage - Supply Span (Min)"
    );
    const maxParam = candidateProduct.Parameters?.find(
      (p) => p.ParameterText === "Voltage - Supply Span (Max)"
    );
    if (minParam && maxParam) {
      const min = parseFloat(minParam.ValueText.replace(/[^0-9.]/g, ""));
      const max = parseFloat(maxParam.ValueText.replace(/[^0-9.]/g, ""));
      return [min, max];
    }
    return specMatch.voltageRangeOverlap.candidate;
  };

  const getCandidateMountingType = () => {
    const param = candidateProduct.Parameters?.find(
      (p) => p.ParameterText === "Mounting Type"
    );
    return param?.ValueText || specMatch.mountingTypeMatch.candidate;
  };

  const formatVoltage = (voltage: [number | null, number | null]) => {
    if (voltage[0] === null && voltage[1] === null) return "情報なし";
    if (voltage[0] === null) return `${voltage[1]}V以下`;
    if (voltage[1] === null) return `${voltage[0]}V以上`;
    return `${voltage[0]}V-${voltage[1]}V`;
  };

  return (
    <div className="pt-2 border-t">
      <Tabs defaultValue="specMatch" className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-8">
          <TabsTrigger value="specMatch" className="text-xs">
            仕様一致: {specMatch.total}
          </TabsTrigger>
          <TabsTrigger value="complianceSafety" className="text-xs">
            規制安全: {complianceSafety.total}
          </TabsTrigger>
          <TabsTrigger value="availability" className="text-xs">
            入手性: {availability.total}
          </TabsTrigger>
        </TabsList>

        {/* 仕様一致タブ */}
        <TabsContent value="specMatch" className="mt-2 space-y-2">
          <div className="px-2 pb-2 space-y-2">
            {/* パッケージ比較 */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="font-medium">項目</div>
              <div className="font-medium">対象部品</div>
              <div className="font-medium">候補部品</div>
              <div className="text-muted-foreground">Package</div>
              <div>{getTargetPackage() || "情報なし"}</div>
              <div className="flex items-center gap-1">
                {getCandidatePackage() || "情報なし"}
                {specMatch.packageMatch.matched ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
              <div className="text-muted-foreground">電圧範囲</div>
              <div>{formatVoltage(getTargetVoltage())}</div>
              <div className="flex items-center gap-1">
                {formatVoltage(getCandidateVoltage())}
                {specMatch.voltageRangeOverlap.overlapPercent > 0 ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
              <div className="text-muted-foreground">実装タイプ</div>
              <div>{getTargetMountingType() || "情報なし"}</div>
              <div className="flex items-center gap-1">
                {getCandidateMountingType() || "情報なし"}
                {specMatch.mountingTypeMatch.matched ? (
                  <CheckCircle2 className="w-3 h-3 text-green-500" />
                ) : (
                  <XCircle className="w-3 h-3 text-red-500" />
                )}
              </div>
            </div>
            <div className="pt-1 border-t text-xs space-y-0.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">パッケージ一致:</span>
                <span>
                  {specMatch.packageMatch.matched ? "✅" : "❌"}{" "}
                  {specMatch.packageMatch.score}点
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">電圧範囲重複:</span>
                <span>
                  {specMatch.voltageRangeOverlap.overlapPercent > 0
                    ? "✅"
                    : "❌"}{" "}
                  {specMatch.voltageRangeOverlap.score}点
                  {specMatch.voltageRangeOverlap.overlapPercent > 0 && (
                    <span className="text-muted-foreground ml-1">
                      ({Math.round(specMatch.voltageRangeOverlap.overlapPercent)}%重複)
                    </span>
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">実装タイプ一致:</span>
                <span>
                  {specMatch.mountingTypeMatch.matched ? "✅" : "❌"}{" "}
                  {specMatch.mountingTypeMatch.score}点
                </span>
              </div>
              <div className="flex justify-between pt-1 border-t font-medium">
                <span>合計:</span>
                <span>{specMatch.total}/50点</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 規制安全タブ */}
        <TabsContent value="complianceSafety" className="mt-2 space-y-2">
          <div className="px-2 pb-2 space-y-2">
            <div className="text-xs space-y-1.5">
              <div>
                <span className="text-muted-foreground">リスクレベル:</span>{" "}
                <span className="font-medium">{candidateRiskLevel}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">RoHS:</span>
                  <span>
                    {candidateCompliance.rohs === "Compliant"
                      ? "✅ Compliant"
                      : candidateCompliance.rohs === "NonCompliant"
                      ? "❌ Non-Compliant"
                      : "⚠️ Unknown"}{" "}
                    ({complianceSafety.rohs.score}点)
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">REACH:</span>
                  <span>
                    {candidateCompliance.reach === "Compliant"
                      ? "✅ Compliant"
                      : candidateCompliance.reach === "NonCompliant"
                      ? "❌ Non-Compliant"
                      : "⚠️ Unknown"}{" "}
                    ({complianceSafety.reach.score}点)
                  </span>
                </div>
              </div>
              <div className="pt-1 border-t text-xs">
                <div className="text-muted-foreground mb-1">スコア算出ロジック:</div>
                <div className="pl-2 space-y-0.5 text-xs">
                  <div>Low = 30点</div>
                  <div>Medium = 15点</div>
                  <div>High = 0点</div>
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t font-medium">
                <span>合計:</span>
                <span>{complianceSafety.total}/30点</span>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* 入手性タブ */}
        <TabsContent value="availability" className="mt-2 space-y-2">
          <div className="px-2 pb-2 space-y-2">
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-muted-foreground">在庫数:</span>
                <span className="font-medium">
                  {availability.quantityAvailable.toLocaleString()}個
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">在庫状況:</span>
                <span>
                  {availability.hasStock ? "✅ 在庫あり" : "❌ 在庫なし"}
                </span>
              </div>
              <div className="pt-1 border-t text-xs">
                <div className="text-muted-foreground mb-1">スコア算出ロジック:</div>
                <div className="pl-2 space-y-0.5 text-xs">
                  <div>在庫あり (&gt;0個) = 20点</div>
                  <div>在庫なし (0個) = 0点</div>
                </div>
              </div>
              <div className="flex justify-between pt-1 border-t font-medium">
                <span>合計:</span>
                <span>{availability.total}/20点</span>
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
