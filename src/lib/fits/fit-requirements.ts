import { resolveManualItemAlias, resolveManualItemOverride } from "@/lib/fits/manual-overrides";
import { normalizeEveName } from "@/lib/fits/normalize";
import { expandSkillPrerequisites } from "@/lib/fits/prerequisites";
import type {
  FitRequirement,
  ItemDefinitionEntry,
  ParsedFit,
  ResolvedFitItem,
  SkillCatalogEntry,
  SkillDependency,
  UnknownFitItem,
} from "@/lib/fits/types";

function mergeRequirement(
  target: Map<number, FitRequirement>,
  next: FitRequirement,
) {
  const existing = target.get(next.skillTypeId);
  const sourceNames = new Set(existing?.sourceNames ?? []);

  for (const sourceName of next.sourceNames) {
    sourceNames.add(sourceName);
  }

  target.set(next.skillTypeId, {
    ...next,
    requiredLevel: Math.max(existing?.requiredLevel ?? 0, next.requiredLevel),
    sourceNames: [...sourceNames].sort((left, right) => left.localeCompare(right)),
  });
}

function buildDefinitionMap(itemDefinitions: ItemDefinitionEntry[]) {
  const definitionsByName = new Map<string, ItemDefinitionEntry>();

  for (const definition of itemDefinitions) {
    definitionsByName.set(normalizeEveName(definition.name), definition);
  }

  return definitionsByName;
}

export function resolveFitRequirements(
  parsedFit: ParsedFit,
  itemDefinitions: ItemDefinitionEntry[],
  skillCatalogById: Map<number, SkillCatalogEntry>,
  prerequisitesBySkillId: Map<number, SkillDependency[]>,
) {
  const definitionsByName = buildDefinitionMap(itemDefinitions);
  const directRequirements = new Map<number, FitRequirement>();
  const resolvedItems: ResolvedFitItem[] = [];
  const unknownItems: UnknownFitItem[] = [];

  for (const entry of parsedFit.entries) {
    const canonicalName = resolveManualItemAlias(entry.name);
    const definition =
      definitionsByName.get(canonicalName) ??
      resolveManualItemOverride(entry.name);

    if (!definition) {
      unknownItems.push({
        name: entry.name,
        kind: entry.kind,
        quantity: entry.quantity,
        reason: "No generated item requirement definition or manual override was found.",
      });
      continue;
    }

    resolvedItems.push({ entry, definition });

    for (const requirement of definition.requirementSkills) {
      const skill = skillCatalogById.get(requirement.skillTypeId);

      mergeRequirement(directRequirements, {
        skillTypeId: requirement.skillTypeId,
        skillName: skill?.name ?? `Skill ${requirement.skillTypeId}`,
        requiredLevel: requirement.requiredLevel,
        source: "direct",
        sourceNames: [definition.name],
      });
    }
  }

  const directRequirementList = [...directRequirements.values()].sort((left, right) => left.skillName.localeCompare(right.skillName));
  const prerequisiteRequirements = expandSkillPrerequisites(
    directRequirementList,
    prerequisitesBySkillId,
    skillCatalogById,
  );

  const totalRequirements = new Map<number, FitRequirement>();

  for (const requirement of directRequirementList) {
    mergeRequirement(totalRequirements, requirement);
  }

  for (const requirement of prerequisiteRequirements) {
    mergeRequirement(totalRequirements, requirement);
  }

  return {
    resolvedItems,
    directRequirements: directRequirementList,
    totalRequirements: [...totalRequirements.values()].sort((left, right) => left.skillName.localeCompare(right.skillName)),
    unknownItems,
  };
}