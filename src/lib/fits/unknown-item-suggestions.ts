import { normalizeEveName } from "@/lib/fits/normalize";
import { RECOVERY_THRESHOLDS } from "@/lib/reference-data/recovery-thresholds";
import type {
  ItemDefinitionEntry,
  ParsedFitEntryKind,
  UnknownFitItem,
  UnknownItemSuggestion,
  UnknownItemSuggestionSet,
} from "@/lib/fits/types";

function tokenize(value: string) {
  return normalizeEveName(value)
    .split(/[^a-z0-9]+/)
    .filter(Boolean);
}

function romanNumeralValue(token?: string) {
  switch (token) {
    case "i":
      return 1;
    case "ii":
      return 2;
    case "iii":
      return 3;
    case "iv":
      return 4;
    case "v":
      return 5;
    default:
      return null;
  }
}

function kindCategoryBonus(kind: ParsedFitEntryKind, definition: ItemDefinitionEntry) {
  if (kind === "charge" && /charge/i.test(definition.categoryName ?? "")) {
    return 6;
  }

  if (kind === "drone" && /drone/i.test(definition.categoryName ?? "")) {
    return 6;
  }

  if ((kind === "item" || kind === "ship") && /module|ship/i.test(definition.categoryName ?? "")) {
    return 3;
  }

  return 0;
}

function buildMatchReason(sharedTokens: string[], sharedStems: string[]) {
  if (sharedTokens.length > 0) {
    return `Shared tokens: ${sharedTokens.join(", ")}`;
  }

  if (sharedStems.length > 0) {
    return `Shared stems: ${sharedStems.join(", ")}`;
  }

  return "Closest known seeded item name.";
}

export function scoreUnknownItemCandidate(unknownItem: UnknownFitItem, definition: ItemDefinitionEntry) {
  const unknownNormalized = normalizeEveName(unknownItem.name);
  const definitionNormalized = normalizeEveName(definition.name);
  const unknownTokens = tokenize(unknownItem.name);
  const definitionTokens = tokenize(definition.name);
  const unknownStems = new Set(unknownTokens.map((token) => token.slice(0, 4)));
  const definitionStems = new Set(definitionTokens.map((token) => token.slice(0, 4)));
  const sharedTokens = [...new Set(unknownTokens.filter((token) => definitionTokens.includes(token)))];
  const sharedStems = [...unknownStems].filter((stem) => definitionStems.has(stem));
  const unknownTier = romanNumeralValue(unknownTokens.at(-1));
  const definitionTier = romanNumeralValue(definitionTokens.at(-1));

  const startsSimilar = unknownTokens[0] && unknownTokens[0] === definitionTokens[0];
  const endsSimilar = unknownTokens.at(-1) && unknownTokens.at(-1) === definitionTokens.at(-1);
  const containsName = unknownNormalized.includes(definitionNormalized) || definitionNormalized.includes(unknownNormalized);
  const tierDistanceBonus = unknownTier !== null && definitionTier !== null
    ? Math.max(0, 8 - Math.abs(unknownTier - definitionTier) * 4)
    : 0;
  const score =
    sharedTokens.length * 12 +
    sharedStems.length * 4 +
    (startsSimilar ? 8 : 0) +
    (endsSimilar ? 8 : 0) +
    (containsName ? 10 : 0) +
    tierDistanceBonus +
    kindCategoryBonus(unknownItem.kind, definition) -
    Math.abs(unknownTokens.length - definitionTokens.length);

  if (score < RECOVERY_THRESHOLDS.lexicalCandidateFloor) {
    return null;
  }

  const suggestion: UnknownItemSuggestion = {
    typeId: definition.typeId,
    name: definition.name,
    groupName: definition.groupName,
    categoryName: definition.categoryName,
    score,
    matchReason: buildMatchReason(sharedTokens, sharedStems),
  };

  return suggestion;
}

export function rankUnknownItemCandidates(
  unknownItem: UnknownFitItem,
  itemDefinitions: ItemDefinitionEntry[],
) {
  return itemDefinitions
    .map((definition) => scoreUnknownItemCandidate(unknownItem, definition))
    .filter((candidate): candidate is UnknownItemSuggestion => candidate !== null)
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
}

export function suggestUnknownItems(
  unknownItems: UnknownFitItem[],
  itemDefinitions: ItemDefinitionEntry[],
) {
  const uniqueUnknowns = new Map<string, UnknownFitItem>();

  for (const unknownItem of unknownItems) {
    uniqueUnknowns.set(normalizeEveName(unknownItem.name), unknownItem);
  }

  return [...uniqueUnknowns.values()].map((unknownItem): UnknownItemSuggestionSet => {
    const suggestions = rankUnknownItemCandidates(unknownItem, itemDefinitions).slice(0, 3);

    return {
      unknownItemName: unknownItem.name,
      unknownItemKind: unknownItem.kind,
      suggestions,
    };
  });
}