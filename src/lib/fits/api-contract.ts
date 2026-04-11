import { z } from "zod";

import type { FitAnalysisResult, FitComparisonResult } from "@/lib/fits/types";

export const analyzeFitRequestSchema = z.object({
  characterId: z.string().min(1, "characterId is required."),
  fitText: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, {
      message: "fitText is required.",
    })
    .refine((value) => value.length <= 25000, {
      message: "fitText must be 25000 characters or fewer.",
    }),
  includeDebug: z.boolean().optional().default(false),
});

export const compareFitRequestSchema = z.object({
  characterIds: z.array(z.string().min(1)).min(1, "At least one character is required.").max(10),
  fitText: z
    .string()
    .transform((value) => value.trim())
    .refine((value) => value.length > 0, {
      message: "fitText is required.",
    })
    .refine((value) => value.length <= 25000, {
      message: "fitText must be 25000 characters or fewer.",
    }),
  includeDebug: z.boolean().optional().default(false),
});

export type AnalyzeFitRequest = z.infer<typeof analyzeFitRequestSchema>;
export type CompareFitRequest = z.infer<typeof compareFitRequestSchema>;

function createFitAnalysisPayload(result: FitAnalysisResult) {
  return {
    parsedFit: result.parsedFit,
    requirements: {
      direct: result.directRequirements,
      total: result.totalRequirements,
    },
    gapAnalysis: {
      assessments: result.requirementAssessments,
      missing: result.missingRequirements,
    },
    readiness: result.readiness,
    trainingPlan: result.trainingPlan,
    unknownItems: result.unknownItems,
    unknownItemSuggestions: result.unknownItemSuggestions,
    debug: result.debug,
  };
}

export function createAnalyzeFitResponse(result: FitAnalysisResult) {
  return createFitAnalysisPayload(result);
}

export function createCompareFitResponse(result: FitComparisonResult) {
  return {
    bestCharacter: result.best
      ? {
          characterId: result.best.characterId ?? null,
          characterName: result.best.characterName,
          rank: result.best.rank,
          readiness: result.best.analysis.readiness,
          trainingSeconds: result.best.analysis.trainingPlan.totalTrainingSeconds,
          missingRequirements: result.best.analysis.missingRequirements.length,
          unknownItems: result.best.analysis.unknownItems.length,
        }
      : null,
    comparisons: result.comparisons.map((entry) => ({
      rank: entry.rank,
      characterId: entry.characterId ?? null,
      characterName: entry.characterName,
      analysis: createFitAnalysisPayload(entry.analysis),
    })),
  };
}

export type AnalyzeFitResponse = ReturnType<typeof createAnalyzeFitResponse>;
export type CompareFitResponse = ReturnType<typeof createCompareFitResponse>;