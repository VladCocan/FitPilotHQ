import type {
  CharacterAttributesSnapshot,
  SkillTrainingAttributes,
} from "@/lib/fits/types";

const cumulativeSpByLevel = [0, 250, 1415, 8000, 45255, 256000] as const;

export function cumulativeSkillpointsForLevel(rank: number, level: number) {
  const clampedLevel = Math.max(0, Math.min(5, level));
  return cumulativeSpByLevel[clampedLevel] * rank;
}

export function normalizeCurrentSkillpoints(rank: number, currentLevel: number, currentSkillpoints: number) {
  return Math.max(cumulativeSkillpointsForLevel(rank, currentLevel), currentSkillpoints);
}

export function trainingRatePerMinute(
  attributes: CharacterAttributesSnapshot,
  trainingAttributes: SkillTrainingAttributes,
) {
  const primaryValue = attributes[trainingAttributes.primaryAttribute];
  const secondaryValue = attributes[trainingAttributes.secondaryAttribute];
  return Math.max(1, primaryValue + secondaryValue / 2);
}

export function estimateTrainingSeconds(remainingSkillpoints: number, skillpointsPerMinute: number) {
  return Math.ceil((remainingSkillpoints / Math.max(1, skillpointsPerMinute)) * 60);
}