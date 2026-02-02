import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { SimilarityResultSchema, type SimilarityResult, type ParameterEvaluation } from "@/app/_lib/datasheet/similarity-schema";

const SIMILARITY_RESULTS_DIR = join(process.cwd(), "app/_lib/datasheet/similarity-results");

/**
 * 総合スコアを算出する
 * 全パラメータのスコアの単純平均を計算
 */
function calculateTotalScore(parameters: ParameterEvaluation[]): number {
  if (parameters.length === 0) {
    return 0;
  }
  const sum = parameters.reduce((acc, p) => acc + p.score, 0);
  return Math.round(sum / parameters.length);
}

/**
 * APIレスポンス用の型（totalScoreを含む）
 */
interface SimilarityResultWithScore extends SimilarityResult {
  totalScore: number;
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

    const targetDirCandidates = [targetId, toDatasheetTargetId(targetId)].filter(
      (v, i, a) => a.indexOf(v) === i
    );

    let targetDir: string = "";
    let candidateFiles: string[] = [];

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

          const totalScore = calculateTotalScore(validatedData.parameters);

          const candidateIdFromFile = file.replace(/\.json$/, "");
          const responseKeys = toResponseCandidateKeys(candidateIdFromFile);

          const parametersWithPrefix = validatedData.parameters.map((p) => ({
            ...p,
            parameterId: p.parameterId.startsWith("datasheet:")
              ? p.parameterId
              : `datasheet:${p.parameterId}`,
          }));

          const resultEntry = {
            ...validatedData,
            parameters: parametersWithPrefix,
            totalScore,
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
