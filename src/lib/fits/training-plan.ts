import type {
  MissingSkillRequirement,
  SkillDependency,
  TrainingPlanStep,
} from "@/lib/fits/types";

function orderMissingRequirements(
  missingRequirements: MissingSkillRequirement[],
  prerequisitesBySkillId: Map<number, SkillDependency[]>,
) {
  const missingBySkillId = new Map(
    missingRequirements.map((requirement) => [requirement.skillTypeId, requirement]),
  );
  const ordered: MissingSkillRequirement[] = [];
  const visited = new Set<number>();
  const visiting = new Set<number>();

  function visit(skillTypeId: number) {
    if (visited.has(skillTypeId) || visiting.has(skillTypeId)) {
      return;
    }

    visiting.add(skillTypeId);

    for (const prerequisite of prerequisitesBySkillId.get(skillTypeId) ?? []) {
      if (missingBySkillId.has(prerequisite.skillTypeId)) {
        visit(prerequisite.skillTypeId);
      }
    }

    visiting.delete(skillTypeId);
    visited.add(skillTypeId);

    const requirement = missingBySkillId.get(skillTypeId);

    if (requirement) {
      ordered.push(requirement);
    }
  }

  for (const requirement of [...missingRequirements].sort((left, right) => left.skillName.localeCompare(right.skillName))) {
    visit(requirement.skillTypeId);
  }

  return ordered;
}

export function buildTrainingPlan(
  missingRequirements: MissingSkillRequirement[],
  prerequisitesBySkillId: Map<number, SkillDependency[]>,
) {
  const orderedRequirements = orderMissingRequirements(
    missingRequirements,
    prerequisitesBySkillId,
  );

  const steps: TrainingPlanStep[] = orderedRequirements.map((requirement, index) => ({
    position: index + 1,
    skillTypeId: requirement.skillTypeId,
    skillName: requirement.skillName,
    rank: requirement.rank,
    fromLevel: requirement.currentLevel,
    toLevel: requirement.requiredLevel,
    requiredSkillpoints: requirement.requiredSkillpoints,
    remainingSkillpoints: requirement.remainingSkillpoints,
    trainingRatePerMinute: requirement.trainingRatePerMinute,
    trainingSeconds: requirement.trainingSeconds,
    primaryAttribute: requirement.trainingAttributes.primaryAttribute,
    secondaryAttribute: requirement.trainingAttributes.secondaryAttribute,
  }));

  return {
    steps,
    totalTrainingSeconds: steps.reduce((total, step) => total + step.trainingSeconds, 0),
  };
}