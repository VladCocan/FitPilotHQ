import itemInput from "../../../../data/source/item-input.json";
import skillPrerequisites from "../../../../data/source/skill-prerequisites.json";
import skillCatalog from "../../../../data/source/skills.catalog.json";

import { normalizeEveName } from "@/lib/fits/normalize";
import { getSkillTrainingAttributes } from "@/lib/fits/skill-attributes";
import type { ItemDefinitionEntry, SkillCatalogEntry } from "@/lib/fits/types";

type SourceItem = {
  typeId: number;
  name: string;
  groupName?: string;
  categoryName?: string;
  published: boolean;
  dogma?: {
    requiredSkills?: Array<{
      skillTypeId: number;
      requiredLevel: number;
    }>;
  };
};

type SourceSkill = {
  typeId: number;
  name: string;
  rank?: number;
  description?: string;
};

type SourceSkillPrerequisite = {
  skillTypeId: number;
  prerequisiteTypeId: number;
  requiredLevel: number;
};

export const benchmarkSkillCatalog: SkillCatalogEntry[] = (skillCatalog as SourceSkill[]).map((skill) => ({
  typeId: skill.typeId,
  name: skill.name,
  rank: skill.rank ?? 1,
  description: skill.description,
  trainingAttributes: getSkillTrainingAttributes(skill),
}));

export const benchmarkPrerequisiteEdges = (skillPrerequisites as SourceSkillPrerequisite[]).map((edge) => ({
  skillTypeId: edge.skillTypeId,
  prerequisiteTypeId: edge.prerequisiteTypeId,
  requiredLevel: edge.requiredLevel,
}));

export const benchmarkItemDefinitions: ItemDefinitionEntry[] = (itemInput as SourceItem[]).map((item) => ({
  typeId: item.typeId,
  name: item.name,
  normalizedName: normalizeEveName(item.name),
  groupName: item.groupName,
  categoryName: item.categoryName,
  published: item.published,
  source: "generated",
  requirementSkills: (item.dogma?.requiredSkills ?? []).map((requirement) => ({
    skillTypeId: requirement.skillTypeId,
    requiredLevel: requirement.requiredLevel,
    source: "generated",
  })),
}));