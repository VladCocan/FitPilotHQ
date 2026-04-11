import type { FitRequirement, SkillCatalogEntry, SkillDependency } from "@/lib/fits/types";

export function expandSkillPrerequisites(
  directRequirements: FitRequirement[],
  prerequisitesBySkillId: Map<number, SkillDependency[]>,
  skillCatalogById: Map<number, SkillCatalogEntry>,
) {
  const aggregated = new Map<number, FitRequirement>();

  function visit(
    skillTypeId: number,
    sourceName: string,
    lineage: Set<number>,
  ) {
    if (lineage.has(skillTypeId)) {
      return;
    }

    const nextLineage = new Set(lineage);
    nextLineage.add(skillTypeId);

    for (const prerequisite of prerequisitesBySkillId.get(skillTypeId) ?? []) {
      const skill = skillCatalogById.get(prerequisite.skillTypeId);
      const existing = aggregated.get(prerequisite.skillTypeId);
      const sourceNames = new Set(existing?.sourceNames ?? []);
      sourceNames.add(sourceName);

      aggregated.set(prerequisite.skillTypeId, {
        skillTypeId: prerequisite.skillTypeId,
        skillName: skill?.name ?? `Skill ${prerequisite.skillTypeId}`,
        requiredLevel: Math.max(existing?.requiredLevel ?? 0, prerequisite.requiredLevel),
        source: "prerequisite",
        sourceNames: [...sourceNames].sort((left, right) => left.localeCompare(right)),
      });

      visit(prerequisite.skillTypeId, skill?.name ?? `Skill ${prerequisite.skillTypeId}`, nextLineage);
    }
  }

  for (const requirement of directRequirements) {
    visit(requirement.skillTypeId, requirement.skillName, new Set());
  }

  return [...aggregated.values()].sort((left, right) => left.skillName.localeCompare(right.skillName));
}