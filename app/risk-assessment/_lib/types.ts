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

// ==============================================================
// 類似品検索API用の型定義
// ==============================================================

/**
 * 候補のソース（どのAPIから取得されたか）
 */
export type CandidateSource =
  | "substitutions" // DigiKey Substitutions API
  | "custom"; // カスタムロジック（将来実装）

/**
 * 検索候補の基本情報（各APIの共通部分）
 */
export interface CandidateInfo {
  digiKeyProductNumber: string;
  manufacturerProductNumber: string;
  manufacturerName: string;
  description: string;
  quantityAvailable: number;
  productUrl?: string;
  photoUrl?: string;
  unitPrice?: string;
  /** どのAPIから取得されたか（複数の場合は配列） */
  sources: CandidateSource[];
  /** Substitutions APIの場合のタイプ */
  substituteType?: string;
}

/**
 * 類似品検索APIへのリクエスト
 */
export interface SimilarSearchRequest {
  /** 対象部品のMPN */
  mpn: string;
  /** 対象部品のDigiKey PN（あれば優先使用） */
  digiKeyProductNumber?: string;
}

/**
 * 類似品検索APIからのレスポンス
 */
export interface SimilarSearchResponse {
  /** 対象部品のMPN */
  targetMpn: string;
  /** 候補リスト */
  candidates: CandidateInfo[];
  /** 検索実行時刻 */
  searchedAt: string;
  /** 各ソースの取得結果サマリ */
  sourceSummary: {
    substitutions: { count: number; error?: string };
    custom: { count: number; error?: string };
  };
}
