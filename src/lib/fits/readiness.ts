import { cumulativeSkillpointsForLevel, normalizeCurrentSkillpoints } from "@/lib/fits/skillpoints";
import type {
  MissingSkillRequirement,
  ReadinessScore,
  SkillCatalogEntry,
  SkillRequirementAssessment,
  UnknownFitItem,
} from "@/lib/fits/types";

function labelForScore(score: number, hasUnknownItems: boolean) {
  if (hasUnknownItems && score >= 100) {
    return "Ready with Unknowns";
  }

  if (score >= 100) {
    return "Ready";
  }

  if (score >= 85) {
    return "Almost Ready";
  }

  if (score >= 60) {
    return "Training Required";
  }

  return "Not Ready";
}

export function scoreReadiness(
  assessments: SkillRequirementAssessment[],
  missingRequirements: MissingSkillRequirement[],
  unknownItems: UnknownFitItem[],
  skillCatalogById: Map<number, SkillCatalogEntry>,
): ReadinessScore {
  const emptyBreakdown = {
    directCoverage: 0,
    prerequisiteCoverage: 0,
    directCompletedSkillpoints: 0,
    directRequiredSkillpoints: 0,
    prerequisiteCompletedSkillpoints: 0,
    prerequisiteRequiredSkillpoints: 0,
    weightedCoverage: 0,
    unknownPenalty: 0,
  };

  if (assessments.length === 0) {
    return {
      score: 0,
      label: unknownItems.length > 0 ? "Unknown Coverage" : "No Requirements",
      isReady: false,
      summary: unknownItems.length > 0
        ? `${unknownItems.length} fit item(s) could not be resolved.`
        : "No fit requirements were resolved from the supplied EFT.",
      breakdown: emptyBreakdown,
    };
  }

  let directCompletedSkillpoints = 0;
  let directRequiredSkillpoints = 0;
  let prerequisiteCompletedSkillpoints = 0;
  let prerequisiteRequiredSkillpoints = 0;

  for (const assessment of assessments) {
    const skill = skillCatalogById.get(assessment.skillTypeId);
    const rank = skill?.rank ?? 1;
    const currentSkillpoints = normalizeCurrentSkillpoints(
      rank,
      assessment.currentLevel,
      assessment.currentSkillpoints,
    );
    const requiredSkillpoints = cumulativeSkillpointsForLevel(rank, assessment.requiredLevel);
    const completedSkillpoints = Math.min(currentSkillpoints, requiredSkillpoints);

    if (assessment.source === "direct") {
      directCompletedSkillpoints += completedSkillpoints;
      directRequiredSkillpoints += requiredSkillpoints;
    } else {
      prerequisiteCompletedSkillpoints += completedSkillpoints;
      prerequisiteRequiredSkillpoints += requiredSkillpoints;
    }
  }

  const directCoverage = directRequiredSkillpoints === 0
    ? 1
    : directCompletedSkillpoints / directRequiredSkillpoints;
  const prerequisiteCoverage = prerequisiteRequiredSkillpoints === 0
    ? 1
    : prerequisiteCompletedSkillpoints / prerequisiteRequiredSkillpoints;
  const directWeight = directRequiredSkillpoints > 0 ? 0.75 : 0;
  const prerequisiteWeight = prerequisiteRequiredSkillpoints > 0 ? 0.25 : 0;
  const totalWeight = directWeight + prerequisiteWeight || 1;
  const weightedCoverage = (
    directCoverage * directWeight +
    prerequisiteCoverage * prerequisiteWeight
  ) / totalWeight;
  const unknownPenalty = Math.min(20, unknownItems.length * 4);
  const score = Math.max(0, Math.min(100, Math.round(weightedCoverage * 100) - unknownPenalty));
  const hasUnknownItems = unknownItems.length > 0;
  const label = labelForScore(score, hasUnknownItems);
  const isReady = missingRequirements.length === 0 && !hasUnknownItems;
  const summaryParts = [`${assessments.length} total requirement(s)`];

  if (missingRequirements.length > 0) {
    summaryParts.push(`${missingRequirements.length} missing skill(s)`);
  }

  if (hasUnknownItems) {
    summaryParts.push(`${unknownItems.length} unknown item(s)`);
  }

  return {
    score,
    label,
    isReady,
    summary: summaryParts.join("; "),
    breakdown: {
      directCoverage,
      prerequisiteCoverage,
      directCompletedSkillpoints,
      directRequiredSkillpoints,
      prerequisiteCompletedSkillpoints,
      prerequisiteRequiredSkillpoints,
      weightedCoverage,
      unknownPenalty,
    },
  };
}