"use client";

import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RiskIndicator } from "../_components/risk-indicator";
import { PartCard } from "../_components/part-card";
import type { DigiKeyProduct } from "@/app/_lib/vendor/digikey/types";
import type {
  NormalizedCompliance,
  RiskLevel,
  DifficultyLevel,
  ScoreBreakdownDetail,
} from "../_lib/types";

// モック: 類似品候補データ（DigiKeyProduct形式に変換）
interface MockAlternative {
  product: DigiKeyProduct;
  compliance: NormalizedCompliance;
  riskLevel: RiskLevel;
  similarityScore: number;
  difficultyLevel: DifficultyLevel;
  scoreBreakdown: {
    specMatch: number;
    complianceSafety: number;
    availability: number;
  };
  scoreBreakdownDetail: ScoreBreakdownDetail;
}

// モックデータをDigiKeyProduct形式に変換するヘルパー
function createMockProduct(
  mpn: string,
  manufacturer: string,
  description: string,
  rohsStatus: string,
  reachStatus: string,
  quantityAvailable: number
): DigiKeyProduct {
  return {
    ManufacturerProductNumber: mpn,
    Manufacturer: { Id: 0, Name: manufacturer },
    Description: {
      ProductDescription: description,
      DetailedDescription: description,
    },
    Classifications: {
      RohsStatus: rohsStatus,
      ReachStatus: reachStatus,
      MoistureSensitivityLevel: "",
      ExportControlClassNumber: "",
      HtsusCode: "",
    },
    Category: { CategoryId: 0, ParentId: 0, Name: "", ChildCategories: [] },
    Parameters: [],
    QuantityAvailable: quantityAvailable,
    ProductStatus: { Id: 0, Status: "Active" },
    EndOfLife: false,
    Discontinued: false,
    UnitPrice: null,
    ProductVariations: [],
    ProductUrl: "",
    DatasheetUrl: null,
    PhotoUrl: null,
  };
}

// モック対象部品（実際にはURLパラメータから作成）
function createTargetProduct(
  mpn: string,
  manufacturer: string
): DigiKeyProduct {
  return {
    ManufacturerProductNumber: mpn,
    Manufacturer: { Id: 0, Name: manufacturer },
    Description: {
      ProductDescription: "IC OPAMP GP 2 CIRCUIT 8TSSOP",
      DetailedDescription: "IC OPAMP GP 2 CIRCUIT 8TSSOP",
    },
    Classifications: {
      RohsStatus: "ROHS3 Compliant",
      ReachStatus: "REACH Unaffected",
      MoistureSensitivityLevel: "",
      ExportControlClassNumber: "",
      HtsusCode: "",
    },
    Category: { CategoryId: 0, ParentId: 0, Name: "", ChildCategories: [] },
    Parameters: [
      {
        ParameterId: 1,
        ParameterText: "Package / Case",
        ParameterType: "Package",
        ValueId: "1",
        ValueText: "8-TSSOP (0.173\", 4.40mm Width)",
      },
      {
        ParameterId: 2,
        ParameterText: "Voltage - Supply Span (Min)",
        ParameterType: "Voltage",
        ValueId: "2",
        ValueText: "3 V",
      },
      {
        ParameterId: 3,
        ParameterText: "Voltage - Supply Span (Max)",
        ParameterType: "Voltage",
        ValueId: "3",
        ValueText: "36 V",
      },
      {
        ParameterId: 4,
        ParameterText: "Mounting Type",
        ParameterType: "Mounting",
        ValueId: "4",
        ValueText: "Surface Mount",
      },
    ],
    QuantityAvailable: 0,
    ProductStatus: { Id: 0, Status: "Active" },
    EndOfLife: false,
    Discontinued: false,
    UnitPrice: null,
    ProductVariations: [],
    ProductUrl: "",
    DatasheetUrl: null,
    PhotoUrl: null,
  };
}

const mockAlternatives: MockAlternative[] = [
  {
    product: createMockProduct(
      "LM358ADR",
      "Texas Instruments",
      "IC OPAMP GP 2 CIRCUIT 8SOIC",
      "ROHS3 Compliant",
      "REACH Unaffected",
      45000
    ),
    compliance: { rohs: "Compliant", reach: "Compliant" },
    riskLevel: "Low",
    similarityScore: 92,
    difficultyLevel: "Low",
    scoreBreakdown: { specMatch: 48, complianceSafety: 30, availability: 14 },
    scoreBreakdownDetail: {
      specMatch: {
        packageMatch: {
          target: "8-TSSOP",
          candidate: "8-SOIC",
          matched: false,
          score: 18, // 部分的に一致（8ピンで似ているが完全一致ではない）
        },
        voltageRangeOverlap: {
          target: [3, 36],
          candidate: [3, 36],
          overlapPercent: 100,
          score: 20,
        },
        mountingTypeMatch: {
          target: "Surface Mount",
          candidate: "Surface Mount",
          matched: true,
          score: 10,
        },
        total: 48,
      },
      complianceSafety: {
        rohs: { status: "Compliant", score: 15 },
        reach: { status: "Compliant", score: 15 },
        riskLevel: "Low",
        total: 30,
      },
      availability: {
        quantityAvailable: 45000,
        hasStock: true,
        total: 14,
      },
    },
  },
  {
    product: createMockProduct(
      "LM358BIDR",
      "Texas Instruments",
      "IC OPAMP GP 2 CIRCUIT 8SOIC",
      "ROHS3 Compliant",
      "REACH Unaffected",
      28000
    ),
    compliance: { rohs: "Compliant", reach: "Compliant" },
    riskLevel: "Low",
    similarityScore: 88,
    difficultyLevel: "Low",
    scoreBreakdown: { specMatch: 45, complianceSafety: 30, availability: 13 },
    scoreBreakdownDetail: {
      specMatch: {
        packageMatch: {
          target: "8-TSSOP",
          candidate: "8-SOIC",
          matched: false,
          score: 15, // 部分的に一致
        },
        voltageRangeOverlap: {
          target: [3, 36],
          candidate: [3, 30],
          overlapPercent: 85,
          score: 17,
        },
        mountingTypeMatch: {
          target: "Surface Mount",
          candidate: "Surface Mount",
          matched: true,
          score: 10,
        },
        total: 45,
      },
      complianceSafety: {
        rohs: { status: "Compliant", score: 15 },
        reach: { status: "Compliant", score: 15 },
        riskLevel: "Low",
        total: 30,
      },
      availability: {
        quantityAvailable: 28000,
        hasStock: true,
        total: 13,
      },
    },
  },
  {
    product: createMockProduct(
      "MC33078DR",
      "Texas Instruments",
      "IC OPAMP GP 2 CIRCUIT 8SOIC",
      "ROHS3 Compliant",
      "",
      12000
    ),
    compliance: { rohs: "Compliant", reach: "Unknown" },
    riskLevel: "Medium",
    similarityScore: 75,
    difficultyLevel: "Medium",
    scoreBreakdown: { specMatch: 40, complianceSafety: 15, availability: 20 },
    scoreBreakdownDetail: {
      specMatch: {
        packageMatch: {
          target: "8-TSSOP",
          candidate: "8-SOIC",
          matched: false,
          score: 12, // 部分的に一致
        },
        voltageRangeOverlap: {
          target: [3, 36],
          candidate: [4, 36],
          overlapPercent: 91,
          score: 18,
        },
        mountingTypeMatch: {
          target: "Surface Mount",
          candidate: "Surface Mount",
          matched: true,
          score: 10,
        },
        total: 40,
      },
      complianceSafety: {
        rohs: { status: "Compliant", score: 15 },
        reach: { status: "Unknown", score: 0 },
        riskLevel: "Medium",
        total: 15,
      },
      availability: {
        quantityAvailable: 12000,
        hasStock: true,
        total: 20,
      },
    },
  },
  {
    product: createMockProduct(
      "OPA2340PA",
      "Texas Instruments",
      "IC OPAMP GP 2 CIRCUIT 8DIP",
      "ROHS3 Compliant",
      "REACH Unaffected",
      5000
    ),
    compliance: { rohs: "Compliant", reach: "Compliant" },
    riskLevel: "Low",
    similarityScore: 65,
    difficultyLevel: "High",
    scoreBreakdown: { specMatch: 25, complianceSafety: 30, availability: 10 },
    scoreBreakdownDetail: {
      specMatch: {
        packageMatch: {
          target: "8-TSSOP",
          candidate: "8-DIP",
          matched: false,
          score: 5, // 8ピンは一致するが形状が大きく異なる
        },
        voltageRangeOverlap: {
          target: [3, 36],
          candidate: [2.7, 5.5],
          overlapPercent: 8,
          score: 2,
        },
        mountingTypeMatch: {
          target: "Surface Mount",
          candidate: "Through Hole",
          matched: false,
          score: 0,
        },
        total: 25,
      },
      complianceSafety: {
        rohs: { status: "Compliant", score: 15 },
        reach: { status: "Compliant", score: 15 },
        riskLevel: "Low",
        total: 30,
      },
      availability: {
        quantityAvailable: 5000,
        hasStock: true,
        total: 10,
      },
    },
  },
];

function SimilarSearchContent() {
  const searchParams = useSearchParams();
  const mpn = searchParams.get("mpn");
  const manufacturer = searchParams.get("manufacturer");
  const category = searchParams.get("category");
  const rohs = searchParams.get("rohs") as NormalizedCompliance["rohs"] | null;
  const reach = searchParams.get("reach") as NormalizedCompliance["reach"] | null;
  const riskLevel = searchParams.get("riskLevel") as RiskLevel | null;

  if (!mpn) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">部品情報が指定されていません</p>
      </div>
    );
  }

  const compliance: NormalizedCompliance = {
    rohs: rohs || "Unknown",
    reach: reach || "Unknown",
  };

  // 対象部品を作成（モック）
  const targetProduct = createTargetProduct(mpn, manufacturer || "不明");

  return (
    <div className="space-y-6">
      {/* 対象部品情報 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            対象部品
            <Badge variant="outline" className="font-normal">
              類似品検索対象
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <div>
                <span className="text-xs text-muted-foreground">MPN:</span>
                <div className="font-medium">{mpn}</div>
              </div>
              <div>
                <span className="text-xs text-muted-foreground">メーカー:</span>
                <div className="font-medium">{manufacturer || "不明"}</div>
              </div>
              {category && (
                <div>
                  <span className="text-xs text-muted-foreground">カテゴリ:</span>
                  <div className="text-sm">{category}</div>
                </div>
              )}
            </div>
            <div>
              <RiskIndicator compliance={compliance} riskLevel={riskLevel || "Medium"} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 検索状態表示 */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">類似品検索結果</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* 検索中メッセージ（モック） */}
            <div className="bg-muted/50 rounded-lg p-4 text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-2">
                類似品検索ロジック（後続フェーズで実装予定）
              </p>
              <ul className="list-disc list-inside space-y-1">
                <li>同一カテゴリ内でキーワード検索</li>
                <li>パッケージ・電圧範囲でフィルタリング</li>
                <li>規制準拠状況・在庫でスコアリング</li>
                <li>類似度順にソートして表示</li>
              </ul>
            </div>

            {/* モック結果 */}
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                候補リスト（モックデータ）
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {mockAlternatives.map((alt, index) => (
                  <PartCard
                    key={index}
                    product={alt.product}
                    compliance={alt.compliance}
                    riskLevel={alt.riskLevel}
                    similarityScore={alt.similarityScore}
                    difficultyLevel={alt.difficultyLevel}
                    scoreBreakdown={alt.scoreBreakdown}
                    scoreBreakdownDetail={alt.scoreBreakdownDetail}
                    targetProduct={targetProduct}
                    showSimilarSearchButton={false}
                  />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function SimilarSearchPage() {
  return (
    <div className="h-full flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-2">類似品検索</h1>
        <p className="text-sm text-muted-foreground">
          選択した部品に対して類似品を検索し、代替候補を提案します
        </p>
      </div>

      <div className="flex-1 min-h-0">
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
