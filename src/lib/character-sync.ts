import "server-only";

import type { Character } from "@prisma/client";

import {
  EsiRequestError,
  fetchCharacterAttributes,
  fetchCharacterSkillQueue,
  fetchCharacterSkills,
  refreshAccessToken,
} from "@/lib/esi";
import { prisma } from "@/lib/db";

const TOKEN_EXPIRY_BUFFER_MS = 60_000;

async function persistRefreshedToken(characterId: string, token: Awaited<ReturnType<typeof refreshAccessToken>>) {
  return prisma.character.update({
    where: { id: characterId },
    data: {
      esiAccessToken: token.access_token,
      esiRefreshToken: token.refresh_token,
      esiTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
    },
  });
}

async function ensureAccessToken(character: Character) {
  const hasValidToken =
    character.esiAccessToken &&
    character.esiTokenExpiresAt &&
    character.esiTokenExpiresAt.getTime() - Date.now() > TOKEN_EXPIRY_BUFFER_MS;

  if (hasValidToken) {
    return {
      character,
      accessToken: character.esiAccessToken!,
    };
  }

  if (!character.esiRefreshToken) {
    throw new Error("Character is missing a refresh token.");
  }

  const refreshedToken = await refreshAccessToken(character.esiRefreshToken);
  const updatedCharacter = await persistRefreshedToken(character.id, refreshedToken);

  return {
    character: updatedCharacter,
    accessToken: refreshedToken.access_token,
  };
}

async function loadCharacterOrThrow(characterId: string, userId?: string) {
  const character = await prisma.character.findUnique({
    where: { id: characterId },
  });

  if (!character) {
    throw new Error("Character not found.");
  }

  if (userId && character.userId !== userId) {
    throw new Error("Character does not belong to the current user.");
  }

  return character;
}

export async function syncCharacterSnapshot(characterId: string, userId?: string) {
  const initialCharacter = await loadCharacterOrThrow(characterId, userId);
  let { accessToken, character } = await ensureAccessToken(initialCharacter);

  const fetchSnapshot = async (token: string) => {
    return Promise.all([
      fetchCharacterSkills(character.eveCharacterId, token),
      fetchCharacterAttributes(character.eveCharacterId, token),
      fetchCharacterSkillQueue(character.eveCharacterId, token),
    ]);
  };

  let skills;
  let attributes;
  let queue;

  try {
    [skills, attributes, queue] = await fetchSnapshot(accessToken);
  } catch (error) {
    if (!(error instanceof EsiRequestError) || error.status !== 401) {
      throw error;
    }

    if (!character.esiRefreshToken) {
      throw error;
    }

    const refreshedToken = await refreshAccessToken(character.esiRefreshToken);
    character = await persistRefreshedToken(character.id, refreshedToken);
    accessToken = refreshedToken.access_token;
    [skills, attributes, queue] = await fetchSnapshot(accessToken);
  }

  await prisma.$transaction([
    prisma.characterSkill.deleteMany({ where: { characterId } }),
    prisma.characterSkillQueue.deleteMany({ where: { characterId } }),
    prisma.characterSkill.createMany({
      data: skills.skills.map((skill) => ({
        characterId,
        skillTypeId: skill.skill_id,
        activeLevel: skill.active_skill_level,
        trainedLevel: skill.trained_skill_level,
        skillpoints: skill.skillpoints_in_skill,
      })),
    }),
    prisma.characterSkillQueue.createMany({
      data: queue.map((entry) => ({
        characterId,
        queuePosition: entry.queue_position,
        skillTypeId: entry.skill_id,
        finishedLevel: entry.finished_level,
        trainingStartSp: entry.training_start_sp,
        levelEndSp: entry.level_end_sp,
        startDate: entry.start_date ? new Date(entry.start_date) : null,
        finishDate: entry.finish_date ? new Date(entry.finish_date) : null,
      })),
    }),
    prisma.characterAttributes.upsert({
      where: { characterId },
      update: {
        intelligence: attributes.intelligence,
        memory: attributes.memory,
        perception: attributes.perception,
        willpower: attributes.willpower,
        charisma: attributes.charisma,
        bonusRemaps: attributes.bonus_remaps,
        accruedRemapCooldownAt: attributes.accrued_remap_cooldown_date
          ? new Date(attributes.accrued_remap_cooldown_date)
          : null,
      },
      create: {
        characterId,
        intelligence: attributes.intelligence,
        memory: attributes.memory,
        perception: attributes.perception,
        willpower: attributes.willpower,
        charisma: attributes.charisma,
        bonusRemaps: attributes.bonus_remaps,
        accruedRemapCooldownAt: attributes.accrued_remap_cooldown_date
          ? new Date(attributes.accrued_remap_cooldown_date)
          : null,
      },
    }),
    prisma.character.update({
      where: { id: characterId },
      data: {
        lastSyncedAt: new Date(),
        totalSkillPoints: skills.total_sp,
        unallocatedSkillPoints: skills.unallocated_sp,
      },
    }),
  ]);

  return prisma.character.findUniqueOrThrow({
    where: { id: characterId },
    include: {
      attributes: true,
      _count: {
        select: {
          skills: true,
          skillQueue: true,
        },
      },
    },
  });
}
