import { NextRequest, NextResponse } from "next/server";
import { readdir, readFile } from "fs/promises";
import { join } from "path";
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

/**
 * 類似度結果取得API
 * GET /api/similarity-results?targetId=GRM185R60J105KE26-01
 * 
 * 指定されたTargetIDのディレクトリ配下にある全Candidate結果を返却
 * レスポンス: Record<string, SimilarityResult> (candidateId -> result)
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

    // TargetIDのディレクトリパス
    const targetDir = join(SIMILARITY_RESULTS_DIR, targetId);

    // ディレクトリが存在しない場合は空オブジェクトを返却
    let candidateFiles: string[] = [];
    try {
      candidateFiles = await readdir(targetDir);
    } catch (error) {
      // ディレクトリが存在しない場合は空オブジェクトを返却
      return NextResponse.json({});
    }

    // JSONファイルのみをフィルタリング
    const jsonFiles = candidateFiles.filter((file) => file.endsWith(".json"));

    // 各JSONファイルを読み込んでバリデーション
    const results: Record<string, SimilarityResultWithScore> = {};

    await Promise.all(
      jsonFiles.map(async (file) => {
        try {
          const filePath = join(targetDir, file);
          const fileContent = await readFile(filePath, "utf-8");
          const jsonData = JSON.parse(fileContent);

          // Zodスキーマでバリデーション
          const validatedData = SimilarityResultSchema.parse(jsonData);
          
          // totalScoreを算出
          const totalScore = calculateTotalScore(validatedData.parameters);
          
          // candidateIdをキーとして格納（totalScoreを含む）
          results[validatedData.candidateId] = {
            ...validatedData,
            totalScore,
          };
        } catch (error) {
          // ファイルが存在しない、パースエラー、バリデーションエラーの場合は無視
          // 存在するデータのみを返却する
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
