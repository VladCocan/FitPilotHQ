import { cumulativeSkillpointsForLevel, estimateTrainingSeconds, normalizeCurrentSkillpoints, trainingRatePerMinute } from "@/lib/fits/skillpoints";
import type {
  CharacterAnalysisInput,
  MissingSkillRequirement,
  SkillCatalogEntry,
  SkillRequirementAssessment,
  FitRequirement,
} from "@/lib/fits/types";

export function calculateSkillGaps(
  requirements: FitRequirement[],
  character: CharacterAnalysisInput,
  skillCatalogById: Map<number, SkillCatalogEntry>,
) {
  const characterSkillsById = new Map(
    character.skills.map((skill) => [skill.skillTypeId, skill]),
  );

  const assessments: SkillRequirementAssessment[] = requirements.map((requirement) => {
    const skill = characterSkillsById.get(requirement.skillTypeId);

    return {
      ...requirement,
      currentLevel: skill?.trainedLevel ?? 0,
      currentSkillpoints: skill?.skillpoints ?? 0,
      missingLevels: Math.max(0, requirement.requiredLevel - (skill?.trainedLevel ?? 0)),
    };
  });

  const missingRequirements: MissingSkillRequirement[] = assessments
    .filter((assessment) => assessment.missingLevels > 0)
    .map((assessment) => {
      const skill = skillCatalogById.get(assessment.skillTypeId);
      const rank = skill?.rank ?? 1;
      const trainingAttributes = skill?.trainingAttributes ?? {
        primaryAttribute: "intelligence",
        secondaryAttribute: "memory",
      };
      const currentSkillpoints = normalizeCurrentSkillpoints(
        rank,
        assessment.currentLevel,
        assessment.currentSkillpoints,
      );
      const requiredSkillpoints = cumulativeSkillpointsForLevel(rank, assessment.requiredLevel);
      const remainingSkillpoints = Math.max(0, requiredSkillpoints - currentSkillpoints);
      const trainingRate = trainingRatePerMinute(character.attributes, trainingAttributes);

      return {
        ...assessment,
        currentSkillpoints,
        rank,
        trainingAttributes,
        requiredSkillpoints,
        remainingSkillpoints,
        trainingRatePerMinute: trainingRate,
        trainingSeconds: estimateTrainingSeconds(remainingSkillpoints, trainingRate),
      };
    })
    .sort((left, right) => left.trainingSeconds - right.trainingSeconds || left.skillName.localeCompare(right.skillName));

  return {
    assessments,
    missingRequirements,
  };
}