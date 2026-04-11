import type { Prisma, PrismaClient } from "@prisma/client";

import { getSkillTrainingAttributes } from "@/lib/fits/skill-attributes";
import type { ItemDefinitionEntry, SkillCatalogEntry } from "@/lib/fits/types";

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

type AnalysisReferencePrismaClient = Pick<
  PrismaClient,
  "skillCatalog" | "skillPrerequisite" | "itemDefinition"
>;

export async function loadAnalysisReferenceData(prismaClient: AnalysisReferencePrismaClient) {
  const [skillCatalogRows, prerequisiteRows, itemRows] = await Promise.all([
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

  const prerequisiteEdges = prerequisiteRows.map((prerequisite: SkillPrerequisiteRow) => ({
    skillTypeId: prerequisite.skill.typeId,
    prerequisiteTypeId: prerequisite.prerequisiteSkill.typeId,
    requiredLevel: prerequisite.requiredLevel,
  }));

  return {
    skillCatalog,
    prerequisiteEdges,
    itemDefinitions,
  };
}