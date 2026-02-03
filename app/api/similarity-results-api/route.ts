import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
import { SimilarityResultSchema, type SimilarityResult } from "@/app/_lib/datasheet/similarity-schema";
import { computeAverageScore, computeConfidence } from "@/app/_lib/datasheet/similarity-score";

const SIMILARITY_RESULTS_API_DIR = join(process.cwd(), "app/_lib/datasheet/similarity-results-api");

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

/**
 * DigiKey API基準 類似度結果取得API
 * GET /api/similarity-results-api?targetId=XXX
 *
 * 指定されたTargetIDのディレクトリ配下にある全Candidate結果を返却
 * レスポンス: Record<string, SimilarityResult> (candidateId -> result)
 * targetId/candidateId は digiKeyProductNumber または manufacturerProductNumber
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

    const targetDir = join(SIMILARITY_RESULTS_API_DIR, targetId);

    let candidateFiles: string[] = [];
    try {
      candidateFiles = await readdir(targetDir);
    } catch {
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

          results[validatedData.candidateId] = {
            ...validatedData,
            totalScore,
            confidence: {
              comparableParams: confidence.comparableParams,
              totalParams: confidence.totalParams,
              confidenceRatioPercent: confidence.confidenceRatioPercent,
            },
          };
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
