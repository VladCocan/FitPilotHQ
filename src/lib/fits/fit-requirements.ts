import { resolveManualItemAliasTarget, resolveManualItemOverride } from "@/lib/fits/manual-overrides";
import { normalizeEveName } from "@/lib/fits/normalize";
import { expandSkillPrerequisites } from "@/lib/fits/prerequisites";
import type {
  AutoResolvedAliasUse,
  DataWarning,
  FitRequirement,
  ItemAliasEntry,
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
    definitionsByName.set(definition.normalizedName ?? normalizeEveName(definition.name), definition);
  }

  return definitionsByName;
}

function buildDefinitionTypeMap(itemDefinitions: ItemDefinitionEntry[]) {
  return new Map(itemDefinitions.map((definition) => [definition.typeId, definition]));
}

export function resolveFitRequirements(
  parsedFit: ParsedFit,
  itemDefinitions: ItemDefinitionEntry[],
  itemAliases: ItemAliasEntry[],
  skillCatalogById: Map<number, SkillCatalogEntry>,
  prerequisitesBySkillId: Map<number, SkillDependency[]>,
) {
  const definitionsByName = buildDefinitionMap(itemDefinitions);
  const definitionsByTypeId = buildDefinitionTypeMap(itemDefinitions);
  const aliasesByNormalized = new Map(itemAliases.map((alias) => [alias.aliasNormalized, alias]));
  const directRequirements = new Map<number, FitRequirement>();
  const resolvedItems: ResolvedFitItem[] = [];
  const unknownItems: UnknownFitItem[] = [];
  const autoResolvedAliasesUsed = new Map<string, AutoResolvedAliasUse>();
  const dataWarnings: DataWarning[] = [];

  for (const entry of parsedFit.entries) {
    const exactDefinition = definitionsByName.get(entry.normalizedName);
    const acceptedAlias = aliasesByNormalized.get(entry.normalizedName);
    const aliasDefinition = acceptedAlias
      ? definitionsByTypeId.get(acceptedAlias.canonicalTypeId) ?? null
      : null;
    const manualAliasTarget = resolveManualItemAliasTarget(entry.name);
    const manualAliasDefinition = manualAliasTarget
      ? definitionsByName.get(manualAliasTarget) ?? null
      : null;
    const manualOverride = resolveManualItemOverride(entry.name);

    let definition: ItemDefinitionEntry | null = null;
    let resolutionSource: ResolvedFitItem["resolutionSource"] | null = null;
    let matchedName = entry.normalizedName;
    let aliasNormalized: string | null = null;

    if (exactDefinition) {
      definition = exactDefinition;
      resolutionSource = "exact";
      matchedName = exactDefinition.normalizedName;
    } else if (acceptedAlias && aliasDefinition) {
      definition = aliasDefinition;
      resolutionSource = "alias";
      matchedName = aliasDefinition.normalizedName;
      aliasNormalized = acceptedAlias.aliasNormalized;

      if (acceptedAlias.source !== "manual") {
        autoResolvedAliasesUsed.set(`${acceptedAlias.aliasNormalized}:${acceptedAlias.canonicalTypeId}`, {
          originalName: entry.name,
          aliasNormalized: acceptedAlias.aliasNormalized,
          canonicalTypeId: acceptedAlias.canonicalTypeId,
          canonicalName: acceptedAlias.canonicalName,
          source: acceptedAlias.source,
          confidenceScore: acceptedAlias.confidenceScore,
        });
      }
    } else if (acceptedAlias && !aliasDefinition) {
      dataWarnings.push({
        code: "accepted_alias_missing_definition",
        message: `Accepted alias ${acceptedAlias.aliasNormalized} points to missing type ${acceptedAlias.canonicalTypeId}.`,
      });
    } else if (manualAliasDefinition) {
      definition = manualAliasDefinition;
      resolutionSource = "manual";
      matchedName = manualAliasDefinition.normalizedName;
    } else if (manualOverride) {
      definition = manualOverride;
      resolutionSource = "manual";
      matchedName = manualOverride.normalizedName;
    }

    if (!definition) {
      unknownItems.push({
        name: entry.name,
        kind: entry.kind,
        quantity: entry.quantity,
        reason: "No DB-backed item definition, accepted alias, or manual fallback was found.",
      });
      continue;
    }

    resolvedItems.push({
      entry,
      definition,
      resolutionSource: resolutionSource ?? "exact",
      matchedName,
      aliasNormalized,
    });

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
    autoResolvedAliasesUsed: [...autoResolvedAliasesUsed.values()].sort((left, right) => left.originalName.localeCompare(right.originalName)),
    dataWarnings,
  };
}