import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workspaceRoot = path.resolve(__dirname, "..");

function normalizeName(value) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

async function loadJson(relativePath) {
  const fullPath = path.join(workspaceRoot, relativePath);
  return JSON.parse(await readFile(fullPath, "utf8"));
}

async function main() {
  const skills = await loadJson("data/source/skills.catalog.json");
  const prerequisites = await loadJson("data/source/skill-prerequisites.json");
  const generatedItems = await loadJson("data/generated/item-requirements.generated.json");

  for (const skill of skills) {
    await prisma.skillCatalog.upsert({
      where: { typeId: skill.typeId },
      update: {
        name: skill.name,
        rank: skill.rank ?? null,
        description: skill.description ?? null,
      },
      create: {
        typeId: skill.typeId,
        name: skill.name,
        rank: skill.rank ?? null,
        description: skill.description ?? null,
      },
    });
  }

  const persistedSkills = await prisma.skillCatalog.findMany({
    where: {
      typeId: {
        in: skills.map((skill) => skill.typeId),
      },
    },
  });

  const skillIdByTypeId = new Map(
    persistedSkills.map((skill) => [skill.typeId, skill.id]),
  );

  await prisma.skillPrerequisite.deleteMany({});

  if (prerequisites.length > 0) {
    await prisma.skillPrerequisite.createMany({
      data: prerequisites.map((prerequisite) => ({
        skillId: skillIdByTypeId.get(prerequisite.skillTypeId),
        prerequisiteSkillId: skillIdByTypeId.get(prerequisite.prerequisiteTypeId),
        requiredLevel: prerequisite.requiredLevel,
      })),
    });
  }

  for (const item of generatedItems) {
    const persistedItem = await prisma.itemDefinition.upsert({
      where: { typeId: item.typeId },
      update: {
        name: item.name,
        normalizedName: item.normalizedName ?? normalizeName(item.name),
        groupName: item.groupName,
        categoryName: item.categoryName,
        published: item.published,
      },
      create: {
        typeId: item.typeId,
        name: item.name,
        normalizedName: item.normalizedName ?? normalizeName(item.name),
        groupName: item.groupName,
        categoryName: item.categoryName,
        published: item.published,
      },
    });

    await prisma.itemRequirementSkill.deleteMany({
      where: { itemId: persistedItem.id },
    });

    if (item.requirementSkills.length > 0) {
      await prisma.itemRequirementSkill.createMany({
        data: item.requirementSkills.map((requirement) => ({
          itemId: persistedItem.id,
          skillTypeId: requirement.skillTypeId,
          requiredLevel: requirement.requiredLevel,
          source: requirement.source ?? "generated",
        })),
      });
    }
  }

  console.log(
    `Seeded ${skills.length} skills, ${prerequisites.length} prerequisites, and ${generatedItems.length} item definitions.`,
  );
}

try {
  await main();
} finally {
  await prisma.$disconnect();
}
