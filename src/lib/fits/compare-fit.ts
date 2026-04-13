import { analyzeFit } from "@/lib/fits/analyze-fit";
import type {
  CharacterAnalysisInput,
  FitComparisonResult,
  ItemAliasEntry,
  ItemDefinitionEntry,
  SkillCatalogEntry,
} from "@/lib/fits/types";

type CompareFitInput = {
  fitText: string;
  characters: CharacterAnalysisInput[];
  itemDefinitions: ItemDefinitionEntry[];
  itemAliases?: ItemAliasEntry[];
  skillCatalog: SkillCatalogEntry[];
  prerequisiteEdges: Array<{
    skillTypeId: number;
    prerequisiteTypeId: number;
    requiredLevel: number;
  }>;
  includeDebug?: boolean;
};

function compareEntries(left: FitComparisonResult["comparisons"][number], right: FitComparisonResult["comparisons"][number]) {
  if (left.analysis.readiness.isReady !== right.analysis.readiness.isReady) {
    return Number(right.analysis.readiness.isReady) - Number(left.analysis.readiness.isReady);
  }

  if (left.analysis.readiness.score !== right.analysis.readiness.score) {
    return right.analysis.readiness.score - left.analysis.readiness.score;
  }

  if (left.analysis.unknownItems.length !== right.analysis.unknownItems.length) {
    return left.analysis.unknownItems.length - right.analysis.unknownItems.length;
  }

  if (left.analysis.missingRequirements.length !== right.analysis.missingRequirements.length) {
    return left.analysis.missingRequirements.length - right.analysis.missingRequirements.length;
  }

  if (left.analysis.trainingPlan.totalTrainingSeconds !== right.analysis.trainingPlan.totalTrainingSeconds) {
    return left.analysis.trainingPlan.totalTrainingSeconds - right.analysis.trainingPlan.totalTrainingSeconds;
  }

  return left.characterName.localeCompare(right.characterName);
}

export function compareFit({
  fitText,
  characters,
  itemDefinitions,
  itemAliases,
  skillCatalog,
  prerequisiteEdges,
  includeDebug,
}: CompareFitInput): FitComparisonResult {
  const ranked = characters
    .map((character) => ({
      rank: 0,
      characterId: character.id,
      characterName: character.name,
      analysis: analyzeFit({
        fitText,
        character,
        itemDefinitions,
        itemAliases,
        skillCatalog,
        prerequisiteEdges,
        includeDebug,
      }),
    }))
    .sort(compareEntries)
    .map((entry, index) => ({
      ...entry,
      rank: index + 1,
    }));

  return {
    best: ranked[0] ?? null,
    comparisons: ranked,
  };
}