import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { SimilarityResultSchema, type SimilarityResult } from "@/app/_lib/datasheet/similarity-schema";
import { computeAverageScore, computeConfidence } from "@/app/_lib/datasheet/similarity-score";
import { getMfgMpnDatasheetId, MANUFACTURER_SHORT_NAMES } from "@/app/_lib/datasheet/manufacturer-short-names";

const SIMILARITY_RESULTS_DIR = join(process.cwd(), "app/_lib/datasheet/similarity-results");

/** 既知メーカー短縮名のユニーク一覧（長い順にソートし、最長一致で prefix を剥がす） */
const KNOWN_MFG_PREFIXES = [...new Set(Object.values(MANUFACTURER_SHORT_NAMES))]
  .sort((a, b) => b.length - a.length)
  .map((s) => s + "_");

/**
 * APIレスポンス用の型（totalScore・confidenceを含む）
 * 類似度スコアは比較成立したパラメータのみで算出。比較成立 0 件の場合は totalScore: null。
 */
interface SimilarityResultWithScore extends SimilarityResult {
  totalScore: number | null;
  confidence: {
    comparableParams: number;
    totalParams: number;
    confidenceRatioPercent: number;
  };
}

/** DigiKey品番（末尾D）を datasheet_id（-01）に変換 */
function toDatasheetTargetId(targetId: string): string {
  if (targetId.endsWith("D")) {
    return targetId.slice(0, -1) + "-01";
  }
  return targetId;
}

/**
 * ファイル名の candidateId に対応するレスポンス用キーを全て返す。
 * - -01 の候補: 同一データシートで DigiKey が D/J を付けるため [base+D, base+J] を返す。
 * - それ以外: DigiKey が D/J を付けた候補にもマッチするよう [id, id+D, id+J] を返す。
 */
function toResponseCandidateKeys(candidateId: string): string[] {
  if (candidateId.endsWith("-01")) {
    const base = candidateId.replace(/-01$/, "");
    return [base + "D", base + "J"];
  }
  return [candidateId, candidateId + "D", candidateId + "J"];
}

/**
 * データシート基準 類似度結果取得API
 * GET /api/similarity-results?targetId=GRM188R60J105KA01D または targetId=GRM188R60J105KA01-01
 *
 * targetId が DigiKey 品番（末尾 D）の場合は -01 のディレクトリを試す。
 * 返却キーは DigiKey 品番スタイル（-01 → D）に正規化し、クライアントの candidateId と一致させる。
 * レスポンスの parameters[].parameterId に datasheet: プレフィックスを付与する。
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const targetId = searchParams.get("targetId");

    if (!targetId) {
      return NextResponse.json(
        { error: "targetId query parameter is required" },
        { status: 400 }
      );
    }

    const manufacturer = searchParams.get("manufacturer") || undefined;

    // ディレクトリ名の候補を優先度順に組み立て
    const baseCandidates = [targetId, toDatasheetTargetId(targetId)].filter(
      (v, i, a) => a.indexOf(v) === i
    );
    // manufacturer 指定時は Manufacturer_MPN 形式を最優先
    const mfgMpnId = getMfgMpnDatasheetId(manufacturer, targetId);
    const targetDirCandidates = [
      ...(mfgMpnId ? [mfgMpnId] : []),
      ...baseCandidates,
    ].filter((v, i, a) => a.indexOf(v) === i);

    let targetDir: string = "";
    let candidateFiles: string[] = [];

    // 1) 完全一致で探す（Manufacturer_MPN → MPN → -01 の順）
    for (const dirId of targetDirCandidates) {
      const candidateDir = join(SIMILARITY_RESULTS_DIR, dirId);
      try {
        candidateFiles = await readdir(candidateDir);
        targetDir = candidateDir;
        break;
      } catch {
        continue;
      }
    }

    // 2) 見つからなければ、ディレクトリ一覧から *_<targetId> にマッチするものを探す
    if (!targetDir) {
      try {
        const allDirs = await readdir(SIMILARITY_RESULTS_DIR);
        for (const tId of baseCandidates) {
          const suffix = `_${tId}`;
          const match = allDirs.find((d) => d.endsWith(suffix) && d.length > suffix.length);
          if (match) {
            const candidateDir = join(SIMILARITY_RESULTS_DIR, match);
            try {
              candidateFiles = await readdir(candidateDir);
              targetDir = candidateDir;
              break;
            } catch {
              continue;
            }
          }
        }
      } catch {
        // SIMILARITY_RESULTS_DIR itself doesn't exist
      }
    }

    if (!targetDir || candidateFiles.length === 0) {
      return NextResponse.json({});
    }

    const jsonFiles = candidateFiles.filter((file) => file.endsWith(".json"));
    const results: Record<string, SimilarityResultWithScore> = {};

    await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = join(targetDir, file);
          const fileContent = await readFile(filePath, "utf-8");
          const jsonData = JSON.parse(fileContent);

          const validatedData = SimilarityResultSchema.parse(jsonData);

          const totalScore = computeAverageScore(validatedData.parameters);
          const confidence = computeConfidence(validatedData.parameters);

          const candidateIdFromFile = file.replace(/\.json$/, "");
          const responseKeys = toResponseCandidateKeys(candidateIdFromFile);
          // 候補ファイル名から既知メーカー prefix を剥がし、MPN 部分のキーも追加（UI は MPN で引くため）
          const candidateMfgPrefix = KNOWN_MFG_PREFIXES.find((p) => candidateIdFromFile.startsWith(p));
          if (candidateMfgPrefix) {
            const mpnPart = candidateIdFromFile.slice(candidateMfgPrefix.length);
            for (const k of toResponseCandidateKeys(mpnPart)) {
              if (!responseKeys.includes(k)) responseKeys.push(k);
            }
          }

          const parametersWithPrefix = validatedData.parameters.map((p) => ({
            ...p,
            parameterId: p.parameterId.startsWith("datasheet:")
              ? p.parameterId
              : `datasheet:${p.parameterId}`,
          }));

          const resultEntry: SimilarityResultWithScore = {
            ...validatedData,
            parameters: parametersWithPrefix,
            totalScore,
            confidence: {
              comparableParams: confidence.comparableParams,
              totalParams: confidence.totalParams,
              confidenceRatioPercent: confidence.confidenceRatioPercent,
            },
          };
          for (const key of responseKeys) {
            results[key] = resultEntry;
          }
        } catch (error) {
          console.warn(`Failed to load similarity result file ${file}:`, error);
        }
      })
    );

    return NextResponse.json(results);
  } catch (error) {
    console.error("Similarity results API error:", error);
    const errorMessage =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "Failed to fetch similarity results",
        details: errorMessage,
      },
      { status: 500 }
    );
  }
}
