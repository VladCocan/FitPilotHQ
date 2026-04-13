import type { Prisma, PrismaClient } from "@prisma/client";

import { getSkillTrainingAttributes } from "@/lib/fits/skill-attributes";
import type { ItemAliasEntry, ItemDefinitionEntry, SkillCatalogEntry } from "@/lib/fits/types";
import { hasPrismaDelegate } from "@/lib/reference-data/prisma-recovery-support";

type SkillCatalogRow = Prisma.SkillCatalogGetPayload<Record<string, never>>;
type SkillPrerequisiteRow = Prisma.SkillPrerequisiteGetPayload<{
  include: {
    skill: true;
    prerequisiteSkill: true;
  };
}>;
type ItemDefinitionRow = Prisma.ItemDefinitionGetPayload<{
  include: {
    requirementSkills: true;
  };
}>;
type ItemAliasRow = Prisma.ItemAliasGetPayload<Record<string, never>>;

type AnalysisReferencePrismaClient = Pick<
  PrismaClient,
  "skillCatalog" | "skillPrerequisite" | "itemDefinition" | "itemAlias"
>;

export async function loadAnalysisReferenceData(prismaClient: AnalysisReferencePrismaClient) {
  const loadAliases = hasPrismaDelegate(prismaClient, "itemAlias")
    ? prismaClient.itemAlias.findMany({
      where: {
        reviewStatus: "ACCEPTED",
      },
      orderBy: { aliasNormalized: "asc" },
    })
    : Promise.resolve([] as ItemAliasRow[]);

  const [skillCatalogRows, prerequisiteRows, itemRows, aliasRows] = await Promise.all([
    prismaClient.skillCatalog.findMany({
      orderBy: { typeId: "asc" },
    }),
    prismaClient.skillPrerequisite.findMany({
      include: {
        skill: true,
        prerequisiteSkill: true,
      },
      orderBy: [
        { skill: { typeId: "asc" } },
        { prerequisiteSkill: { typeId: "asc" } },
      ],
    }),
    prismaClient.itemDefinition.findMany({
      include: {
        requirementSkills: {
          orderBy: { skillTypeId: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    loadAliases,
  ]);

  const skillCatalog: SkillCatalogEntry[] = skillCatalogRows.map((skill: SkillCatalogRow) => ({
    typeId: skill.typeId,
    name: skill.name,
    rank: skill.rank ?? 1,
    description: skill.description,
    trainingAttributes: getSkillTrainingAttributes(skill),
  }));

  const itemDefinitions: ItemDefinitionEntry[] = itemRows.map((item: ItemDefinitionRow) => ({
    typeId: item.typeId,
    name: item.name,
    normalizedName: item.normalizedName,
    groupName: item.groupName,
    categoryName: item.categoryName,
    published: item.published,
    source: "generated",
    requirementSkills: item.requirementSkills.map((requirement: ItemDefinitionRow["requirementSkills"][number]) => ({
      skillTypeId: requirement.skillTypeId,
      requiredLevel: requirement.requiredLevel,
      source: requirement.source,
    })),
  }));
  const itemTypeIds = new Set(itemDefinitions.map((item) => item.typeId));
  const itemAliases: ItemAliasEntry[] = aliasRows
    .filter((alias: ItemAliasRow) => itemTypeIds.has(alias.canonicalTypeId))
    .map((alias: ItemAliasRow) => ({
      aliasNormalized: alias.aliasNormalized,
      canonicalTypeId: alias.canonicalTypeId,
      canonicalName: alias.canonicalName,
      source: alias.source === "AUTO_ESI"
        ? "auto-esi"
        : alias.source === "AUTO_SDE"
          ? "auto-sde"
          : "manual",
      confidenceScore: alias.confidenceScore,
    }));

  const prerequisiteEdges = prerequisiteRows.map((prerequisite: SkillPrerequisiteRow) => ({
    skillTypeId: prerequisite.skill.typeId,
    prerequisiteTypeId: prerequisite.prerequisiteSkill.typeId,
    requiredLevel: prerequisite.requiredLevel,
  }));

  return {
    skillCatalog,
    prerequisiteEdges,
    itemDefinitions,
    itemAliases,
  };
}