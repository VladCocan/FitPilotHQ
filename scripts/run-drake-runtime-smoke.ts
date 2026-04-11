import { PrismaClient } from "@prisma/client";

import { analyzeFit } from "@/lib/fits/analyze-fit";
import { loadAnalysisReferenceData } from "@/lib/fits/analysis-reference-data";
import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { phaseFourSampleFit } from "@/lib/fits/sample-fit";

const prisma = new PrismaClient();

const specialist = benchmarkCharacters.specialist;

if (!specialist) {
  throw new Error("Specialist benchmark character is not available.");
}

const runId = Date.now();
const eveCharacterId = BigInt(runId);

async function main() {
  const referenceData = await loadAnalysisReferenceData(prisma);
  const user = await prisma.user.create({
    data: {
      displayName: "Drake Smoke User",
    },
  });

  try {
    const character = await prisma.character.create({
      data: {
        userId: user.id,
        eveCharacterId,
        name: `Drake Smoke ${runId}`,
        lastSyncedAt: new Date(),
        totalSkillPoints: specialist.skills.reduce((total, skill) => total + skill.skillpoints, 0),
        unallocatedSkillPoints: 0,
      },
    });

    await prisma.characterAttributes.create({
      data: {
        characterId: character.id,
        ...specialist.attributes,
      },
    });

    await prisma.characterSkill.createMany({
      data: specialist.skills.map((skill) => ({
        characterId: character.id,
        skillTypeId: skill.skillTypeId,
        activeLevel: skill.trainedLevel,
        trainedLevel: skill.trainedLevel,
        skillpoints: skill.skillpoints,
      })),
    });

    const result = analyzeFit({
      fitText: phaseFourSampleFit,
      character: {
        id: character.id,
        name: character.name,
        attributes: specialist.attributes,
        skills: specialist.skills,
      },
      ...referenceData,
    });

    if (result.unknownItems.length > 0) {
      throw new Error(
        `Runtime Drake sample still has ${result.unknownItems.length} unknown item(s): ${result.unknownItems.map((item) => item.name).join(", ")}`,
      );
    }

    if (result.directRequirements.length === 0 || result.totalRequirements.length === 0) {
      throw new Error("Runtime Drake sample resolved no requirements.");
    }

    console.log(
      JSON.stringify(
        {
          fit: "drake-sample-runtime",
          character: character.name,
          label: result.readiness.label,
          score: result.readiness.score,
          unknownItems: result.unknownItems.length,
          missingRequirements: result.missingRequirements.length,
          directRequirements: result.directRequirements.length,
          totalRequirements: result.totalRequirements.length,
          trainingSeconds: result.trainingPlan.totalTrainingSeconds,
          summary: result.readiness.summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.user.delete({
      where: { id: user.id },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });