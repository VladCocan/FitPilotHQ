import type {
  SkillCatalogEntry,
  SkillTrainingAttributes,
} from "@/lib/fits/types";

const PERCEPTION_WILLPOWER: SkillTrainingAttributes = {
  primaryAttribute: "perception",
  secondaryAttribute: "willpower",
};

const INTELLIGENCE_MEMORY: SkillTrainingAttributes = {
  primaryAttribute: "intelligence",
  secondaryAttribute: "memory",
};

const MEMORY_PERCEPTION: SkillTrainingAttributes = {
  primaryAttribute: "memory",
  secondaryAttribute: "perception",
};

const exactTrainingAttributes: Record<number, SkillTrainingAttributes> = {
  3300: PERCEPTION_WILLPOWER,
  3303: PERCEPTION_WILLPOWER,
  3318: PERCEPTION_WILLPOWER,
  3319: PERCEPTION_WILLPOWER,
  3320: PERCEPTION_WILLPOWER,
  3321: PERCEPTION_WILLPOWER,
  3322: PERCEPTION_WILLPOWER,
  3324: PERCEPTION_WILLPOWER,
  3327: PERCEPTION_WILLPOWER,
  3329: PERCEPTION_WILLPOWER,
  3330: PERCEPTION_WILLPOWER,
  3333: PERCEPTION_WILLPOWER,
  3334: PERCEPTION_WILLPOWER,
  3392: INTELLIGENCE_MEMORY,
  3393: INTELLIGENCE_MEMORY,
  3394: INTELLIGENCE_MEMORY,
  3402: INTELLIGENCE_MEMORY,
  3413: INTELLIGENCE_MEMORY,
  3416: INTELLIGENCE_MEMORY,
  3420: INTELLIGENCE_MEMORY,
  3422: INTELLIGENCE_MEMORY,
  3424: INTELLIGENCE_MEMORY,
  3425: INTELLIGENCE_MEMORY,
  3426: INTELLIGENCE_MEMORY,
  3449: INTELLIGENCE_MEMORY,
  3432: MEMORY_PERCEPTION,
  3433: INTELLIGENCE_MEMORY,
  3436: MEMORY_PERCEPTION,
  3450: INTELLIGENCE_MEMORY,
  12305: MEMORY_PERCEPTION,
  12487: MEMORY_PERCEPTION,
  20211: PERCEPTION_WILLPOWER,
  24241: MEMORY_PERCEPTION,
  33092: PERCEPTION_WILLPOWER,
  33094: PERCEPTION_WILLPOWER,
  33096: PERCEPTION_WILLPOWER,
};

export function getSkillTrainingAttributes(skill: Pick<SkillCatalogEntry, "typeId" | "name">): SkillTrainingAttributes {
  const exactMatch = exactTrainingAttributes[skill.typeId];

  if (exactMatch) {
    return exactMatch;
  }

  if (/drone/i.test(skill.name)) {
    return MEMORY_PERCEPTION;
  }

  if (/frigate|destroyer|cruiser|battlecruiser|spaceship|gunnery|missile|rocket|turret/i.test(skill.name)) {
    return PERCEPTION_WILLPOWER;
  }

  return INTELLIGENCE_MEMORY;
}