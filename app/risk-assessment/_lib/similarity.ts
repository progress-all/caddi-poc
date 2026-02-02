/**
 * 類似度スコア計算ロジック
 * 
 * 対象部品と候補部品の各パラメータを比較し、値の種類に応じた一致度を計算します。
 */

import {
  getAllComparisonParameters,
  getComparisonParametersBySource,
  getComparisonParameter,
  DEFAULT_CONFIG,
  type ComparisonParameter,
} from "./similarity-config";

/**
 * 値マッチャーの計算結果
 */
export interface MatchResult {
  /** スコア (0-100) */
  score: number;
  /** 一致したかどうか */
  matched: boolean;
  /** デバッグ用の詳細説明 */
  details?: string;
}

/**
 * パラメータごとのスコア内訳
 */
export interface ParameterScore {
  /** パラメータ識別子（DigiKey: name, Datasheet: id） */
  parameterId: string;
  /** 表示名 */
  displayName: string;
  /** スコア (0-100) - 比較不可の場合は0 */
  score: number;
  /** 一致したかどうか - 比較不可の場合はfalse */
  matched: boolean;
  /** 対象値 */
  targetValue: string | null;
  /** 候補値 */
  candidateValue: string | null;
  /** 比較状態 */
  status: "compared" | "target_only" | "candidate_only" | "both_missing" | "excluded";
  /** 対象外とする理由（status === "excluded" の場合） */
  excludeReason?: string;
}

/**
 * 類似度計算結果
 */
export interface SimilarityResult {
  /** 総合スコア (0-100) */
  totalScore: number;
  /** パラメータごとのスコア内訳 */
  breakdown: ParameterScore[];
}

/**
 * 値マッチャーのインターフェース
 */
export interface ValueMatcher {
  match(target: string | null, candidate: string | null): MatchResult;
}

/**
 * 完全一致マッチャー
 * 文字列が完全に一致する場合のみ100点、それ以外は0点
 */
export function createExactMatcher(): ValueMatcher {
  return {
    match(target: string | null, candidate: string | null): MatchResult {
      // どちらかがnull/undefinedの場合は0点
      if (!target || !candidate) {
        return {
          score: 0,
          matched: false,
          details: `Missing value: target=${target ?? "null"}, candidate=${candidate ?? "null"}`,
        };
      }

      // 正規化: 空白を除去して比較
      const normalizedTarget = target.trim().toLowerCase();
      const normalizedCandidate = candidate.trim().toLowerCase();

      if (normalizedTarget === normalizedCandidate) {
        return {
          score: 100,
          matched: true,
          details: `Exact match: "${target}" = "${candidate}"`,
        };
      }

      return {
        score: 0,
        matched: false,
        details: `No match: "${target}" ≠ "${candidate}"`,
      };
    },
  };
}

/**
 * 数値近接マッチャー
 * 数値の比率に基づいてスコアを計算
 * 
 * @param tolerance 許容誤差（デフォルト: 0.2 = 20%）
 */
export function createNumericMatcher(tolerance: number = 0.2): ValueMatcher {
  return {
    match(target: string | null, candidate: string | null): MatchResult {
      if (!target || !candidate) {
        return {
          score: 0,
          matched: false,
          details: `Missing value: target=${target ?? "null"}, candidate=${candidate ?? "null"}`,
        };
      }

      // 数値を抽出（単位を除去）
      const targetNum = extractNumber(target);
      const candidateNum = extractNumber(candidate);

      if (targetNum === null || candidateNum === null) {
        return {
          score: 0,
          matched: false,
          details: `Not numeric: target="${target}", candidate="${candidate}"`,
        };
      }

      // 比率を計算
      const ratio = candidateNum / targetNum;

      // 許容範囲内の場合
      if (ratio >= 1 - tolerance && ratio <= 1 + tolerance) {
        // 距離に応じて100〜80点
        const distance = Math.abs(1 - ratio);
        const score = Math.max(80, 100 - (distance / tolerance) * 20);
        return {
          score: Math.round(score),
          matched: true,
          details: `Numeric match: ${targetNum} ≈ ${candidateNum} (ratio: ${ratio.toFixed(3)})`,
        };
      }

      // 許容範囲外の場合、比率に応じて減衰
      const score = Math.max(0, 100 - Math.abs(1 - ratio) * 100);
      return {
        score: Math.round(score),
        matched: score >= 50, // 50点以上でmatchedとする
        details: `Numeric mismatch: ${targetNum} vs ${candidateNum} (ratio: ${ratio.toFixed(3)})`,
      };
    },
  };
}

/**
 * 許容度マッチャー（候補が対象以上なら100点）
 * 定格電圧など、候補が対象以上であれば問題ない場合に使用
 */
export function createToleranceMatcher(): ValueMatcher {
  return {
    match(target: string | null, candidate: string | null): MatchResult {
      if (!target || !candidate) {
        return {
          score: 0,
          matched: false,
          details: `Missing value: target=${target ?? "null"}, candidate=${candidate ?? "null"}`,
        };
      }

      const targetNum = extractNumber(target);
      const candidateNum = extractNumber(candidate);

      if (targetNum === null || candidateNum === null) {
        return {
          score: 0,
          matched: false,
          details: `Not numeric: target="${target}", candidate="${candidate}"`,
        };
      }

      // 候補が対象以上なら100点
      if (candidateNum >= targetNum) {
        return {
          score: 100,
          matched: true,
          details: `Tolerance match: ${candidateNum} ≥ ${targetNum}`,
        };
      }

      // 下回る場合は比率でスコア
      const score = Math.round((candidateNum / targetNum) * 100);
      return {
        score,
        matched: false,
        details: `Tolerance mismatch: ${candidateNum} < ${targetNum}`,
      };
    },
  };
}

/**
 * 範囲重複マッチャー
 * 範囲（例: "-55 to 85 °C"）の重複率を計算
 */
export function createRangeMatcher(): ValueMatcher {
  return {
    match(target: string | null, candidate: string | null): MatchResult {
      if (!target || !candidate) {
        return {
          score: 0,
          matched: false,
          details: `Missing value: target=${target ?? "null"}, candidate=${candidate ?? "null"}`,
        };
      }

      const targetRange = parseRange(target);
      const candidateRange = parseRange(candidate);

      if (!targetRange || !candidateRange) {
        return {
          score: 0,
          matched: false,
          details: `Not a range: target="${target}", candidate="${candidate}"`,
        };
      }

      const [targetMin, targetMax] = targetRange;
      const [candidateMin, candidateMax] = candidateRange;

      // 重複範囲を計算
      const overlapStart = Math.max(targetMin, candidateMin);
      const overlapEnd = Math.min(targetMax, candidateMax);

      // 重複がない場合
      if (overlapStart >= overlapEnd) {
        return {
          score: 0,
          matched: false,
          details: `No overlap: target=[${targetMin}, ${targetMax}], candidate=[${candidateMin}, ${candidateMax}]`,
        };
      }

      // 重複率を計算（対象範囲に対する割合）
      const targetRangeSize = targetMax - targetMin;
      const overlapSize = overlapEnd - overlapStart;
      const overlapPercent = (overlapSize / targetRangeSize) * 100;

      return {
        score: Math.round(overlapPercent),
        matched: overlapPercent >= 50, // 50%以上でmatchedとする
        details: `Range overlap: ${overlapPercent.toFixed(1)}% (overlap: [${overlapStart}, ${overlapEnd}])`,
      };
    },
  };
}

type SimilarityInput = {
  parameters?: Array<{ name: string; value: string }>;
  datasheetParameters?: Record<string, { value: string | null }>;
};

/**
 * 指定した比較パラメータリストで類似度を計算（内部共通ロジック）
 */
function calculateSimilarityWithParams(
  target: SimilarityInput,
  candidate: SimilarityInput,
  comparisonParams: ComparisonParameter[]
): SimilarityResult {
  const breakdown: ParameterScore[] = [];

  const targetDigiKeyMap = new Map<string, string>();
  if (target.parameters) {
    for (const param of target.parameters) {
      targetDigiKeyMap.set(param.name, param.value);
    }
  }

  const candidateDigiKeyMap = new Map<string, string>();
  if (candidate.parameters) {
    for (const param of candidate.parameters) {
      candidateDigiKeyMap.set(param.name, param.value);
    }
  }

  const targetDatasheetMap = new Map<string, string | null>();
  if (target.datasheetParameters) {
    for (const [id, param] of Object.entries(target.datasheetParameters)) {
      targetDatasheetMap.set(id, param.value);
    }
  }

  const candidateDatasheetMap = new Map<string, string | null>();
  if (candidate.datasheetParameters) {
    for (const [id, param] of Object.entries(candidate.datasheetParameters)) {
      candidateDatasheetMap.set(id, param.value);
    }
  }

  for (const paramConfig of comparisonParams) {
    let targetValue: string | null = null;
    let candidateValue: string | null = null;

    if (paramConfig.source === "digikey") {
      targetValue = targetDigiKeyMap.get(paramConfig.id) ?? null;
      candidateValue = candidateDigiKeyMap.get(paramConfig.id) ?? null;
    } else {
      targetValue = targetDatasheetMap.get(paramConfig.id) ?? null;
      candidateValue = candidateDatasheetMap.get(paramConfig.id) ?? null;
    }

    if (paramConfig.excluded) {
      breakdown.push({
        parameterId: `${paramConfig.source}:${paramConfig.id}`,
        displayName: paramConfig.displayName,
        score: 0,
        matched: false,
        targetValue,
        candidateValue,
        status: "excluded",
        excludeReason: paramConfig.excludeReason,
      });
      continue;
    }

    const hasTargetValue = targetValue !== null && targetValue !== undefined && targetValue !== "";
    const hasCandidateValue = candidateValue !== null && candidateValue !== undefined && candidateValue !== "";

    let status: ParameterScore["status"];
    let score = 0;
    let matched = false;

    if (hasTargetValue && hasCandidateValue) {
      status = "compared";
      const matcher = createMatcher(paramConfig);
      const result = matcher.match(targetValue, candidateValue);
      score = result.score;
      matched = result.matched;
    } else if (hasTargetValue && !hasCandidateValue) {
      status = "target_only";
    } else if (!hasTargetValue && hasCandidateValue) {
      status = "candidate_only";
    } else {
      status = "both_missing";
    }

    breakdown.push({
      parameterId: `${paramConfig.source}:${paramConfig.id}`,
      displayName: paramConfig.displayName,
      score,
      matched,
      targetValue,
      candidateValue,
      status,
    });
  }

  const comparedItems = breakdown.filter((item) => item.status === "compared");

  if (comparedItems.length === 0) {
    return {
      totalScore: 0,
      breakdown,
    };
  }

  let totalWeightedScore = 0;
  let totalWeight = 0;

  for (const item of comparedItems) {
    const paramConfig = getComparisonParameter(
      item.parameterId.startsWith("datasheet:") ? "datasheet" : "digikey",
      item.parameterId.split(":")[1]
    ) || DEFAULT_CONFIG;
    const weight = paramConfig.weight || 1;

    totalWeightedScore += item.score * weight;
    totalWeight += weight;
  }

  const totalScore = totalWeight > 0 ? totalWeightedScore / totalWeight : 0;

  return {
    totalScore: Math.round(totalScore),
    breakdown,
  };
}

/**
 * 類似度を計算（PDF含む：DigiKey + データシートパラメータ）
 *
 * @param target 対象部品
 * @param candidate 候補部品
 * @returns 類似度計算結果
 */
export function calculateSimilarity(
  target: SimilarityInput,
  candidate: SimilarityInput
): SimilarityResult {
  return calculateSimilarityWithParams(target, candidate, getAllComparisonParameters());
}

/**
 * DigiKeyパラメータのみで類似度を計算
 *
 * @param target 対象部品
 * @param candidate 候補部品
 * @returns 類似度計算結果
 */
export function calculateSimilarityDigiKeyOnly(
  target: SimilarityInput,
  candidate: SimilarityInput
): SimilarityResult {
  return calculateSimilarityWithParams(target, candidate, getComparisonParametersBySource("digikey"));
}

/**
 * 設定からマッチャーを作成
 */
function createMatcher(config: ComparisonParameter): ValueMatcher {
  switch (config.matcher) {
    case "exact":
      return createExactMatcher();
    case "numeric":
      return createNumericMatcher(config.tolerance);
    case "tolerance":
      return createToleranceMatcher();
    case "range":
      return createRangeMatcher();
    default:
      return createExactMatcher();
  }
}

/**
 * 文字列から数値を抽出
 * 例: "1 uF" → 1, "DC 6.3 V" → 6.3, "± 10 %" → 10
 */
function extractNumber(str: string): number | null {
  // 数値パターンを抽出（小数点、負の数、指数表記に対応）
  const match = str.match(/-?\d+\.?\d*(?:[eE][+-]?\d+)?/);
  if (!match) {
    return null;
  }
  const num = parseFloat(match[0]);
  return isNaN(num) ? null : num;
}

/**
 * 範囲文字列をパース
 * 例: "-55 to 85 °C" → [-55, 85], "0.2 to 0.5 mm" → [0.2, 0.5]
 */
function parseRange(str: string): [number, number] | null {
  // "X to Y" または "X - Y" パターンを検出
  const patterns = [
    /(-?\d+\.?\d*)\s+to\s+(-?\d+\.?\d*)/i,
    /(-?\d+\.?\d*)\s*-\s*(-?\d+\.?\d*)/,
  ];

  for (const pattern of patterns) {
    const match = str.match(pattern);
    if (match) {
      const min = parseFloat(match[1]);
      const max = parseFloat(match[2]);
      if (!isNaN(min) && !isNaN(max)) {
        return [min, max];
      }
    }
  }

  return null;
}
