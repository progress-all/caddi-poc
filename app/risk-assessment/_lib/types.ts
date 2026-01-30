// 正規化された規制ステータス
export type ComplianceStatus = "Compliant" | "NonCompliant" | "Unknown";

// リスクレベル
export type RiskLevel = "Low" | "Medium" | "High";

/**
 * 部品リスク分類（可視化用・PoC）
 * - current: 顕在リスク（Lifecycle Obsolete/Discontinued、RoHS/REACH Non-compliant）
 * - future: 将来リスク（Lifecycle NRND/Last Time Buy、代替品・類似品0件）
 */
export type PartRiskClassificationKind = "current" | "future";

export interface PartRiskClassification {
  /** 顕在リスクに該当するか */
  current: boolean;
  /** 将来リスクに該当するか */
  future: boolean;
}

/**
 * リスク判断根拠（Issue #19）
 * DigiKey API 由来を必須、PDF 由来は任意（ある場合のみ表示）
 */
export interface RiskEvidenceDigiKey {
  /** Lifecycle（Active / NRND / Obsolete / Discontinued 等） */
  lifecycle?: string;
  /** RoHS（Compliant / NonCompliant / Unknown 等・APIの生値） */
  rohs?: string;
  /** REACH（Compliant / NonCompliant / Unknown 等・APIの生値） */
  reach?: string;
  /** 取得元: Product URL */
  productUrl?: string;
  /** 取得元: Datasheet URL */
  datasheetUrl?: string;
}

/** PDFから抽出した根拠（文字列＋ページ番号） */
export interface RiskEvidencePdfItem {
  /** 抽出できた文字列 */
  text: string;
  /** 該当ページ番号（あれば） */
  page?: number;
}

export interface RiskEvidence {
  digiKey: RiskEvidenceDigiKey;
  /** PDF由来の根拠（無い場合は省略・空配列は出さない） */
  pdf?: { items: RiskEvidencePdfItem[] };
}

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
 * DigiKey Substitutions API の代替品種別（SubstitutionType）
 * 
 * APIレスポンスで返される3種類の値:
 * - ManufacturerRecommended: メーカー推奨
 * - ParametricEquivalent: パラメトリック代替品
 * - Similar: 類似
 */
export type SubstituteType =
  | "ManufacturerRecommended"
  | "ParametricEquivalent"
  | "Similar";

/**
 * 代替品種別の優先順位（グルーピング時の表示順）
 */
export const substituteTypePriority: Record<SubstituteType, number> = {
  ManufacturerRecommended: 1,
  ParametricEquivalent: 2,
  Similar: 3,
};

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
  substituteType?: SubstituteType | string; // string は後方互換性のため
}

/**
 * 詳細情報を含む候補情報（Product Details APIから取得）
 */
export interface CandidateDetailedInfo extends CandidateInfo {
  // Product基本情報
  detailedDescription?: string;
  datasheetUrl?: string;
  
  // ステータス情報
  partStatus?: string;
  backOrderNotAllowed?: boolean;
  normallyStocking?: boolean;
  discontinued?: boolean;
  endOfLife?: boolean;
  ncnr?: boolean;
  
  // カテゴリ・シリーズ
  category?: { name?: string; categoryId?: number };
  series?: string;
  
  // 在庫・リードタイム
  manufacturerLeadWeeks?: string;
  manufacturerPublicQuantity?: number;
  
  // 規制情報
  classifications?: {
    rohs?: string;
    reach?: string;
    moisture?: string;
    exportControl?: string;
  };
  
  // バリエーション（パッケージタイプごとの在庫・価格）
  variations?: Array<{
    digiKeyProductNumber?: string;
    packageType?: string;
    quantityAvailable?: number;
    pricing?: Array<{ breakQuantity: number; unitPrice: number }>;
  }>;
  
  // 動的パラメータ（すべてのパラメータを格納）
  parameters?: Array<{
    name: string;      // ParameterText
    value: string;     // ValueText
    parameterId?: number;
  }>;
  
  // データシートパラメーター（PDFから抽出した詳細パラメーター）
  datasheetParameters?: Record<string, { description: string; value: string | null }>;
  
  /** 類似度スコア (0-100) */
  similarityScore?: number;
  
  /** スコア内訳（デバッグ・将来の詳細表示用） */
  similarityBreakdown?: {
    parameterId: string;
    displayName: string;
    score: number;
    matched: boolean;
    targetValue: string | null;
    candidateValue: string | null;
    status: "compared" | "target_only" | "candidate_only" | "both_missing" | "excluded";
    excludeReason?: string;
  }[];
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
  /** 対象部品の詳細情報 */
  targetProduct?: CandidateDetailedInfo;
  /** 候補リスト（詳細情報を含む） */
  candidates: CandidateDetailedInfo[];
  /** 検索実行時刻 */
  searchedAt: string;
  /** 各ソースの取得結果サマリ */
  sourceSummary: {
    substitutions: { count: number; error?: string };
    custom: { count: number; error?: string };
  };
}
