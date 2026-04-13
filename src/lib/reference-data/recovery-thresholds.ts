import type { ParsedFitEntryKind } from "@/lib/fits/types";

export const RECOVERY_THRESHOLDS = {
  // Only very strong lexical matches should affect runtime automatically.
  lexicalAutoAcceptScore: 44,
  lexicalAutoAcceptMargin: 10,
  lexicalCandidateFloor: 18,
  // ESI-assisted acceptance is stricter because it may discover types not covered by seeded data.
  esiAutoAcceptScore: 92,
  esiCandidateFloor: 65,
} as const;

export function isCategoryCompatible(kind: ParsedFitEntryKind | "unknown", categoryName?: string | null) {
  const category = (categoryName ?? "").toLowerCase();

  if (!category) {
    return kind === "unknown";
  }

  switch (kind) {
    case "ship":
      return category.includes("ship");
    case "drone":
      return category.includes("drone");
    case "charge":
      return category.includes("charge") || category.includes("ammo");
    case "item":
      return category.includes("module") || category.includes("ship") || category.includes("drone") || category.includes("charge");
    default:
      return true;
  }
}

export function canAutoAcceptLexicalCandidate(args: {
  kind: ParsedFitEntryKind | "unknown";
  topScore: number;
  secondScore: number;
  categoryName?: string | null;
}) {
  return args.topScore >= RECOVERY_THRESHOLDS.lexicalAutoAcceptScore
    && args.topScore - args.secondScore >= RECOVERY_THRESHOLDS.lexicalAutoAcceptMargin
    && isCategoryCompatible(args.kind, args.categoryName);
}

export function canConsiderEsiCandidate(args: {
  kind: ParsedFitEntryKind | "unknown";
  score: number;
  categoryName?: string | null;
}) {
  return args.score >= RECOVERY_THRESHOLDS.esiCandidateFloor
    && isCategoryCompatible(args.kind, args.categoryName);
}

export function canAutoAcceptEsiCandidate(args: {
  kind: ParsedFitEntryKind | "unknown";
  score: number;
  categoryName?: string | null;
}) {
  return args.score >= RECOVERY_THRESHOLDS.esiAutoAcceptScore
    && isCategoryCompatible(args.kind, args.categoryName);
}