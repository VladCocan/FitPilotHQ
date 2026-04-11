import { resolveFitRequirements } from "@/lib/fits/fit-requirements";
import { calculateSkillGaps } from "@/lib/fits/gaps";
import { parseEft } from "@/lib/fits/parser";
import { scoreReadiness } from "@/lib/fits/readiness";
import { buildTrainingPlan } from "@/lib/fits/training-plan";
import { suggestUnknownItems } from "@/lib/fits/unknown-item-suggestions";
import type {
  CharacterAnalysisInput,
  FitAnalysisResult,
  ItemDefinitionEntry,
  SkillCatalogEntry,
  SkillDependency,
} from "@/lib/fits/types";

type AnalyzeFitInput = {
  fitText: string;
  character: CharacterAnalysisInput;
  itemDefinitions: ItemDefinitionEntry[];
  skillCatalog: SkillCatalogEntry[];
  prerequisiteEdges: Array<{
    skillTypeId: number;
    prerequisiteTypeId: number;
    requiredLevel: number;
  }>;
  includeDebug?: boolean;
};

export function analyzeFit({
  fitText,
  character,
  itemDefinitions,
  skillCatalog,
  prerequisiteEdges,
  includeDebug,
}: AnalyzeFitInput): FitAnalysisResult {
  const parsedFit = parseEft(fitText);
  const skillCatalogById = new Map<number, SkillCatalogEntry>(
    skillCatalog.map((skill) => [skill.typeId, skill]),
  );
  const prerequisitesBySkillId = new Map<number, SkillDependency[]>();

  for (const edge of prerequisiteEdges) {
    const prerequisites = prerequisitesBySkillId.get(edge.skillTypeId) ?? [];
    prerequisites.push({
      skillTypeId: edge.prerequisiteTypeId,
      requiredLevel: edge.requiredLevel,
    });
    prerequisitesBySkillId.set(edge.skillTypeId, prerequisites);
  }

  for (const [skillTypeId, prerequisites] of prerequisitesBySkillId.entries()) {
    prerequisitesBySkillId.set(
      skillTypeId,
      [...prerequisites].sort((left, right) => left.skillTypeId - right.skillTypeId),
    );
  }

  const requirementResolution = resolveFitRequirements(
    parsedFit,
    itemDefinitions,
    skillCatalogById,
    prerequisitesBySkillId,
  );
  const gapAnalysis = calculateSkillGaps(
    requirementResolution.totalRequirements,
    character,
    skillCatalogById,
  );
  const trainingPlan = buildTrainingPlan(
    gapAnalysis.missingRequirements,
    prerequisitesBySkillId,
  );
  const readiness = scoreReadiness(
    gapAnalysis.assessments,
    gapAnalysis.missingRequirements,
    requirementResolution.unknownItems,
    skillCatalogById,
  );
  const unknownItemSuggestions = suggestUnknownItems(
    requirementResolution.unknownItems,
    itemDefinitions,
  );

  return {
    parsedFit,
    resolvedItems: requirementResolution.resolvedItems,
    directRequirements: requirementResolution.directRequirements,
    totalRequirements: requirementResolution.totalRequirements,
    requirementAssessments: gapAnalysis.assessments,
    missingRequirements: gapAnalysis.missingRequirements,
    trainingPlan,
    readiness,
    unknownItems: requirementResolution.unknownItems,
    unknownItemSuggestions,
    debug: includeDebug
      ? {
          parsedWarnings: parsedFit.warnings,
          resolvedItemCount: requirementResolution.resolvedItems.length,
          unknownItemCount: requirementResolution.unknownItems.length,
          directRequirementCount: requirementResolution.directRequirements.length,
          totalRequirementCount: requirementResolution.totalRequirements.length,
          missingRequirementCount: gapAnalysis.missingRequirements.length,
          readinessBreakdown: readiness.breakdown,
        }
      : undefined,
  };
}