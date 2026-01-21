// 正規化された規制ステータス
export type ComplianceStatus = "Compliant" | "NonCompliant" | "Unknown";

// リスクレベル
export type RiskLevel = "Low" | "Medium" | "High";

// 代替難易度
export type DifficultyLevel = "Low" | "Medium" | "High";

// 正規化された規制情報
export interface NormalizedCompliance {
  rohs: ComplianceStatus;
  reach: ComplianceStatus;
}

// 抽出された部品仕様
export interface ExtractedSpecs {
  category: string;
  categoryId: number;
  package: string | null;
  voltageMin: number | null; // V単位
  voltageMax: number | null; // V単位
  mountingType: string | null;
  operatingTempMin: number | null; // ℃単位
  operatingTempMax: number | null; // ℃単位
  // 将来拡張用
  [key: string]: unknown;
}

// 評価済み部品情報
export interface EvaluatedPart {
  // 元のDigiKey情報
  manufacturerPartNumber: string;
  manufacturer: string;
  description: string;
  productUrl: string;
  datasheetUrl: string | null;
  photoUrl: string | null;
  quantityAvailable: number;
  unitPrice: number | null;

  // 正規化・評価済み情報
  compliance: NormalizedCompliance;
  riskLevel: RiskLevel;
  specs: ExtractedSpecs;
}

// 代替候補
export interface AlternativeCandidate extends EvaluatedPart {
  similarityScore: number; // 0-100
  difficultyLevel: DifficultyLevel;
  // スコア内訳（デバッグ・説明用）
  scoreBreakdown: {
    specMatch: number; // 仕様一致度
    complianceSafety: number; // 規制安全度
    availability: number; // 入手性
  };
}

// 評価結果全体
export interface AssessmentResult {
  targetPart: EvaluatedPart;
  alternatives: AlternativeCandidate[];
  searchedAt: string; // ISO 8601
}

// 仕様一致スコアの詳細
export interface SpecMatchDetail {
  packageMatch: {
    target: string | null;
    candidate: string | null;
    matched: boolean;
    score: number;
  };
  voltageRangeOverlap: {
    target: [number | null, number | null];
    candidate: [number | null, number | null];
    overlapPercent: number;
    score: number;
  };
  mountingTypeMatch: {
    target: string | null;
    candidate: string | null;
    matched: boolean;
    score: number;
  };
  total: number;
}

// 規制安全スコアの詳細
export interface ComplianceSafetyDetail {
  rohs: { status: ComplianceStatus; score: number };
  reach: { status: ComplianceStatus; score: number };
  riskLevel: RiskLevel;
  total: number;
}

// 入手性スコアの詳細
export interface AvailabilityDetail {
  quantityAvailable: number;
  hasStock: boolean;
  total: number;
}

// 拡張されたスコア内訳
export interface ScoreBreakdownDetail {
  specMatch: SpecMatchDetail;
  complianceSafety: ComplianceSafetyDetail;
  availability: AvailabilityDetail;
}
