import { z } from "zod";

/**
 * パラメータ評価結果のスキーマ
 */
export const ParameterEvaluationSchema = z.object({
  parameterId: z.string(),
  description: z.string(),
  targetValue: z.string().nullable(),
  candidateValue: z.string().nullable(),
  score: z.number().int().min(0).max(100),
  reason: z.string(),
});

/**
 * 類似度評価結果のスキーマ
 */
export const SimilarityResultSchema = z.object({
  targetId: z.string(),
  candidateId: z.string(),
  evaluatedAt: z.string().datetime(),
  summary: z.string(), // LLMが生成する比較結果の要約文
  parameters: z.array(ParameterEvaluationSchema),
});

/**
 * パラメータ評価結果の型
 */
export type ParameterEvaluation = z.infer<typeof ParameterEvaluationSchema>;

/**
 * 類似度評価結果の型
 */
export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;
