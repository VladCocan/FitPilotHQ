import "server-only";

import type { Prisma } from "@prisma/client";

import { analyzeFit } from "@/lib/fits/analyze-fit";
import { loadAnalysisReferenceData } from "@/lib/fits/analysis-reference-data";
import { compareFit } from "@/lib/fits/compare-fit";
import { phaseFourSampleFit } from "@/lib/fits/sample-fit";
import { observeUnknownFitItems } from "@/lib/reference-data/unknown-item-observations";
import type {
  CharacterAnalysisInput,
} from "@/lib/fits/types";
import { prisma } from "@/lib/db";

export class FitAnalysisServerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "FitAnalysisServerError";
  }
}

function mapCharacterInput(character: {
  id: string;
  name: string;
  attributes: {
    intelligence: number;
    memory: number;
    perception: number;
    willpower: number;
    charisma: number;
  } | null;
  skills: Array<{
    skillTypeId: number;
    trainedLevel: number;
    skillpoints: number;
  }>;
}): CharacterAnalysisInput {
  if (!character.attributes) {
    throw new Error(`Character ${character.name} does not have synced attributes yet.`);
  }

  return {
    id: character.id,
    name: character.name,
    attributes: character.attributes,
    skills: character.skills,
  };
}

function assertCharacterReadyForAnalysis(character: {
  name: string;
  attributes: CharacterAnalysisInput["attributes"] | null;
  skills: CharacterAnalysisInput["skills"];
}) {
  if (!character.attributes) {
    throw new FitAnalysisServerError(
      `Character ${character.name} does not have synced attributes yet.`,
      "character_attributes_missing",
      409,
    );
  }

  if (character.skills.length === 0) {
    throw new FitAnalysisServerError(
      `Character ${character.name} does not have synced skills yet.`,
      "character_skills_missing",
      409,
    );
  }
}

async function recordUnknownObservationsBestEffort(
  fitText: string,
  unknownItems: Array<{
    name: string;
    kind: "ship" | "item" | "drone" | "charge";
    quantity: number;
    reason: string;
  }>,
) {
  if (unknownItems.length === 0) {
    return;
  }

  try {
    await observeUnknownFitItems(prisma, {
      fitText,
      unknownItems,
    });
  } catch (error) {
    console.warn("Failed to persist unknown item observations.", error);
  }
}

export async function analyzeFitForCharacter(characterId: string, fitText: string) {
  const [referenceData, character] = await Promise.all([
    loadAnalysisReferenceData(prisma),
    prisma.character.findUnique({
      where: { id: characterId },
      include: {
        attributes: true,
        skills: {
          select: {
            skillTypeId: true,
            trainedLevel: true,
            skillpoints: true,
          },
          orderBy: { skillTypeId: "asc" },
        },
      },
    }),
  ]);

  if (!character) {
    throw new FitAnalysisServerError(
      `Character ${characterId} was not found.`,
      "character_not_found",
      404,
    );
  }

  assertCharacterReadyForAnalysis(character);

  const result = analyzeFit({
    fitText,
    character: mapCharacterInput(character),
    ...referenceData,
  });

  await recordUnknownObservationsBestEffort(fitText, result.unknownItems);

  return result;
}

export async function analyzeFitForUserCharacter(
  userId: string,
  characterId: string,
  fitText: string,
  options?: {
    includeDebug?: boolean;
  },
) {
  const [referenceData, character] = await Promise.all([
    loadAnalysisReferenceData(prisma),
    prisma.character.findFirst({
      where: {
        id: characterId,
        userId,
      },
      include: {
        attributes: true,
        skills: {
          select: {
            skillTypeId: true,
            trainedLevel: true,
            skillpoints: true,
          },
          orderBy: { skillTypeId: "asc" },
        },
      },
    }),
  ]);

  if (!character) {
    throw new FitAnalysisServerError(
      `Character ${characterId} was not found for the current user.`,
      "character_not_found",
      404,
    );
  }

  assertCharacterReadyForAnalysis(character);

  const result = analyzeFit({
    fitText,
    character: mapCharacterInput(character),
    ...referenceData,
    includeDebug: options?.includeDebug,
  });

  await recordUnknownObservationsBestEffort(fitText, result.unknownItems);

  return result;
}

export async function compareFitForUserCharacters(
  userId: string,
  characterIds: string[],
  fitText: string,
  options?: {
    includeDebug?: boolean;
  },
) {
  const [referenceData, characters] = await Promise.all([
    loadAnalysisReferenceData(prisma),
    prisma.character.findMany({
      where: {
        id: {
          in: characterIds,
        },
        userId,
      },
      include: {
        attributes: true,
        skills: {
          select: {
            skillTypeId: true,
            trainedLevel: true,
            skillpoints: true,
          },
          orderBy: { skillTypeId: "asc" },
        },
      },
    }),
  ]);

  if (characters.length !== characterIds.length) {
    throw new FitAnalysisServerError(
      "One or more characters were not found for the current user.",
      "character_not_found",
      404,
    );
  }

  const charactersById = new Map(characters.map((character) => [character.id, character]));
  const orderedCharacters = characterIds.map((characterId) => {
    const character = charactersById.get(characterId);

    if (!character) {
      throw new FitAnalysisServerError(
        `Character ${characterId} was not found for the current user.`,
        "character_not_found",
        404,
      );
    }

    assertCharacterReadyForAnalysis(character);
    return mapCharacterInput(character);
  });

  const result = compareFit({
    fitText,
    characters: orderedCharacters,
    ...referenceData,
    includeDebug: options?.includeDebug,
  });

  await recordUnknownObservationsBestEffort(
    fitText,
    result.comparisons[0]?.analysis.unknownItems ?? [],
  );

  return result;
}

export async function getPhaseFourAnalyzerPreview(userId: string) {
  const character = await prisma.character.findFirst({
    where: { userId },
    include: {
      attributes: true,
      skills: {
        select: {
          skillTypeId: true,
          trainedLevel: true,
          skillpoints: true,
        },
        orderBy: { skillTypeId: "asc" },
      },
    },
    orderBy: [
      { lastSyncedAt: "desc" },
      { name: "asc" },
    ],
  });

  if (!character || !character.attributes) {
    return null;
  }

  return {
    character,
    fitText: phaseFourSampleFit,
    analysis: await analyzeFitForCharacter(character.id, phaseFourSampleFit),
  };
}