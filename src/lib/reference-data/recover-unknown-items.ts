import type { PrismaClient } from "@prisma/client";

import { normalizeEveName } from "@/lib/fits/normalize";
import { rankUnknownItemCandidates } from "@/lib/fits/unknown-item-suggestions";
import type { ItemAliasEntry, ItemDefinitionEntry, ParsedFitEntryKind } from "@/lib/fits/types";
import { createEsiItemRecoveryClient, type EsiItemRecoveryClient } from "@/lib/reference-data/esi-item-recovery";
import {
  RECOVERY_THRESHOLDS,
  canAutoAcceptEsiCandidate,
  canAutoAcceptLexicalCandidate,
  canConsiderEsiCandidate,
} from "@/lib/reference-data/recovery-thresholds";
import { assertRecoveryDelegates } from "@/lib/reference-data/prisma-recovery-support";

type RecoveryPrismaClient = Pick<
  PrismaClient,
  "unknownItemObservation" | "itemResolutionCandidate" | "itemAlias" | "itemDefinition"
>;

type RecoveryObservation = {
  id: string;
  normalizedName: string;
  originalName: string;
  kind: string;
};

type RecoveryCandidate = {
  candidateTypeId: number | null;
  candidateName: string;
  source: "SDE" | "ESI" | "LEXICAL" | "MANUAL";
  confidenceScore: number;
  confidenceReason: string;
  accepted: boolean;
};

type RecoveryDecision = {
  status: "PENDING" | "MATCHED" | "AMBIGUOUS" | "REJECTED";
  lastError: string | null;
  candidates: RecoveryCandidate[];
  pendingAlias?: {
    aliasNormalized: string;
    canonicalTypeId: number;
    canonicalName: string;
    source: "AUTO_SDE" | "AUTO_ESI";
    confidenceScore: number;
  };
  acceptedAlias?: {
    aliasNormalized: string;
    canonicalTypeId: number;
    canonicalName: string;
    source: "AUTO_SDE" | "AUTO_ESI";
    confidenceScore: number;
  };
  discoveredDefinition?: {
    typeId: number;
    name: string;
    normalizedName: string;
    groupName?: string | null;
    categoryName?: string | null;
    published: boolean;
  };
};

function observationKindToParsedKind(kind: string): ParsedFitEntryKind | "unknown" {
  switch (kind) {
    case "SHIP":
      return "ship";
    case "DRONE":
      return "drone";
    case "CHARGE":
      return "charge";
    case "ITEM":
      return "item";
    default:
      return "unknown";
  }
}

function toTitleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function scoreEsiCandidate(observation: RecoveryObservation, candidate: { name: string; categoryName?: string | null }) {
  const observationTokens = new Set(observation.normalizedName.split(/[^a-z0-9]+/).filter(Boolean));
  const candidateTokens = new Set(normalizeEveName(candidate.name).split(/[^a-z0-9]+/).filter(Boolean));
  const sharedTokens = [...observationTokens].filter((token) => candidateTokens.has(token));
  const exactMatch = normalizeEveName(candidate.name) === observation.normalizedName;
  const score = Math.min(100, sharedTokens.length * 18 + (exactMatch ? 40 : 0) + (candidate.categoryName ? 10 : 0));

  return {
    score,
    reason: exactMatch
      ? "ESI exact universe name match."
      : `ESI token overlap: ${sharedTokens.join(", ") || "none"}`,
  };
}

export function buildRecoveryDecision(input: {
  observation: RecoveryObservation;
  itemDefinitions: ItemDefinitionEntry[];
  acceptedAliases: ItemAliasEntry[];
  esiCandidates?: Array<{
    typeId: number;
    name: string;
    normalizedName: string;
    groupName?: string | null;
    categoryName?: string | null;
    published: boolean;
  }>;
}): RecoveryDecision {
  const parsedKind = observationKindToParsedKind(input.observation.kind);
  const acceptedAlias = input.acceptedAliases.find((alias) => alias.aliasNormalized === input.observation.normalizedName);
  const itemDefinitionsByTypeId = new Map(input.itemDefinitions.map((definition) => [definition.typeId, definition]));

  if (acceptedAlias && itemDefinitionsByTypeId.has(acceptedAlias.canonicalTypeId)) {
    return {
      status: "MATCHED",
      lastError: null,
      candidates: [
        {
          candidateTypeId: acceptedAlias.canonicalTypeId,
          candidateName: acceptedAlias.canonicalName,
          source: "MANUAL",
          confidenceScore: acceptedAlias.confidenceScore ?? 100,
          confidenceReason: "Existing accepted alias already resolves this observation.",
          accepted: true,
        },
      ],
    };
  }

  const lexicalCandidates = rankUnknownItemCandidates(
    {
      name: input.observation.originalName,
      kind: parsedKind === "unknown" ? "item" : parsedKind,
      quantity: 1,
      reason: "Recovery evaluation.",
    },
    input.itemDefinitions,
  ).slice(0, 3);
  const topLexical = lexicalCandidates[0] ?? null;
  const secondLexical = lexicalCandidates[1] ?? null;
  const lexicalDecisionCandidates: RecoveryCandidate[] = lexicalCandidates.map((candidate) => ({
    candidateTypeId: candidate.typeId,
    candidateName: candidate.name,
    source: "LEXICAL",
    confidenceScore: candidate.score,
    confidenceReason: candidate.matchReason,
    accepted: false,
  }));

  if (
    topLexical
    && canAutoAcceptLexicalCandidate({
      kind: parsedKind,
      topScore: topLexical.score,
      secondScore: secondLexical?.score ?? 0,
      categoryName: topLexical.categoryName,
    })
  ) {
    return {
      status: "MATCHED",
      lastError: null,
      candidates: lexicalDecisionCandidates.map((candidate) => ({
        ...candidate,
        accepted: candidate.candidateTypeId === topLexical.typeId,
      })),
      acceptedAlias: {
        aliasNormalized: input.observation.normalizedName,
        canonicalTypeId: topLexical.typeId,
        canonicalName: topLexical.name,
        source: "AUTO_SDE",
        confidenceScore: topLexical.score,
      },
    };
  }

  const filteredEsiCandidates = (input.esiCandidates ?? [])
    .map((candidate) => {
      const score = scoreEsiCandidate(input.observation, candidate);

      return {
        ...candidate,
        score: score.score,
        reason: score.reason,
      };
    })
    .filter((candidate) => canConsiderEsiCandidate({
      kind: parsedKind,
      score: candidate.score,
      categoryName: candidate.categoryName,
    }))
    .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name));
  const topEsi = filteredEsiCandidates[0] ?? null;
  const definitionForTopEsi = topEsi ? itemDefinitionsByTypeId.get(topEsi.typeId) ?? null : null;

  if (
    topEsi
    && definitionForTopEsi
    && canAutoAcceptEsiCandidate({
      kind: parsedKind,
      score: topEsi.score,
      categoryName: topEsi.categoryName,
    })
  ) {
    return {
      status: "MATCHED",
      lastError: null,
      candidates: [
        ...lexicalDecisionCandidates,
        ...filteredEsiCandidates.map((candidate) => ({
          candidateTypeId: candidate.typeId,
          candidateName: candidate.name,
          source: "ESI" as const,
          confidenceScore: candidate.score,
          confidenceReason: candidate.reason,
          accepted: candidate.typeId === topEsi.typeId,
        })),
      ],
      acceptedAlias: {
        aliasNormalized: input.observation.normalizedName,
        canonicalTypeId: topEsi.typeId,
        canonicalName: topEsi.name,
        source: "AUTO_ESI",
        confidenceScore: topEsi.score,
      },
    };
  }

  if (topEsi && !definitionForTopEsi) {
    return {
      status: "AMBIGUOUS",
      lastError: "Strong ESI candidate found, but deterministic requirement data is still missing.",
      candidates: [
        ...lexicalDecisionCandidates,
        ...filteredEsiCandidates.map((candidate) => ({
          candidateTypeId: candidate.typeId,
          candidateName: candidate.name,
          source: "ESI" as const,
          confidenceScore: candidate.score,
          confidenceReason: candidate.reason,
          accepted: false,
        })),
      ],
      discoveredDefinition: {
        typeId: topEsi.typeId,
        name: topEsi.name,
        normalizedName: topEsi.normalizedName,
        groupName: topEsi.groupName,
        categoryName: topEsi.categoryName,
        published: topEsi.published,
      },
      pendingAlias: {
        aliasNormalized: input.observation.normalizedName,
        canonicalTypeId: topEsi.typeId,
        canonicalName: topEsi.name,
        source: "AUTO_ESI",
        confidenceScore: topEsi.score,
      },
    };
  }

  if (lexicalDecisionCandidates.length > 0 || filteredEsiCandidates.length > 0) {
    const topCandidate = lexicalDecisionCandidates[0]
      ?? filteredEsiCandidates[0]
        ? {
            aliasNormalized: input.observation.normalizedName,
            canonicalTypeId: (lexicalDecisionCandidates[0]?.candidateTypeId ?? filteredEsiCandidates[0]?.typeId) as number,
            canonicalName: (lexicalDecisionCandidates[0]?.candidateName ?? filteredEsiCandidates[0]?.name) as string,
            source: (lexicalDecisionCandidates[0]
              ? "AUTO_SDE"
              : "AUTO_ESI") as "AUTO_SDE" | "AUTO_ESI",
            confidenceScore: (lexicalDecisionCandidates[0]?.confidenceScore ?? filteredEsiCandidates[0]?.score) as number,
          }
        : null;

    return {
      status: "AMBIGUOUS",
      lastError: `Top candidate did not clear conservative acceptance thresholds (${RECOVERY_THRESHOLDS.lexicalAutoAcceptScore}/${RECOVERY_THRESHOLDS.esiAutoAcceptScore}).`,
      candidates: [
        ...lexicalDecisionCandidates,
        ...filteredEsiCandidates.map((candidate) => ({
          candidateTypeId: candidate.typeId,
          candidateName: candidate.name,
          source: "ESI" as const,
          confidenceScore: candidate.score,
          confidenceReason: candidate.reason,
          accepted: false,
        })),
      ],
      pendingAlias: topCandidate && Number.isInteger(topCandidate.canonicalTypeId)
        ? topCandidate
        : undefined,
    };
  }

  return {
    status: "REJECTED",
    lastError: "No strong lexical or ESI-assisted candidate was found.",
    candidates: [],
  };
}

export async function recoverPendingUnknownItems(
  prismaClient: RecoveryPrismaClient,
  options?: {
    dryRun?: boolean;
    limit?: number;
    esiClient?: EsiItemRecoveryClient;
  },
) {
  assertRecoveryDelegates(prismaClient, [
    "unknownItemObservation",
    "itemResolutionCandidate",
    "itemAlias",
    "itemDefinition",
  ]);

  const dryRun = options?.dryRun ?? false;
  const limit = options?.limit ?? 25;
  const esiClient = options?.esiClient ?? createEsiItemRecoveryClient();
  const [observations, itemDefinitions, acceptedAliases] = await Promise.all([
    prismaClient.unknownItemObservation.findMany({
      where: {
        status: "PENDING",
      },
      orderBy: [
        { seenCount: "desc" },
        { lastSeenAt: "asc" },
      ],
      take: limit,
    }),
    prismaClient.itemDefinition.findMany({
      include: {
        requirementSkills: {
          orderBy: { skillTypeId: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),
    prismaClient.itemAlias.findMany({
      where: {
        reviewStatus: "ACCEPTED",
      },
      orderBy: { aliasNormalized: "asc" },
    }),
  ]);

  const runtimeItemDefinitions: ItemDefinitionEntry[] = itemDefinitions.map((item) => ({
    typeId: item.typeId,
    name: item.name,
    normalizedName: item.normalizedName,
    groupName: item.groupName,
    categoryName: item.categoryName,
    published: item.published,
    source: "generated",
    requirementSkills: item.requirementSkills.map((requirement) => ({
      skillTypeId: requirement.skillTypeId,
      requiredLevel: requirement.requiredLevel,
      source: requirement.source,
    })),
  }));
  const runtimeAliases: ItemAliasEntry[] = acceptedAliases.map((alias) => ({
    aliasNormalized: alias.aliasNormalized,
    canonicalTypeId: alias.canonicalTypeId,
    canonicalName: alias.canonicalName,
    source: alias.source === "AUTO_ESI"
      ? "auto-esi"
      : alias.source === "AUTO_SDE"
        ? "auto-sde"
        : "manual",
    confidenceScore: alias.confidenceScore,
  }));
  const summary = {
    processed: 0,
    matched: 0,
    ambiguous: 0,
    rejected: 0,
    aliasesAccepted: 0,
  };

  for (const observation of observations) {
    const queryNames = [observation.originalName, toTitleCase(observation.normalizedName)];
    const esiCandidates = await esiClient.resolveTypeCandidates(queryNames);
    const decision = buildRecoveryDecision({
      observation,
      itemDefinitions: runtimeItemDefinitions,
      acceptedAliases: runtimeAliases,
      esiCandidates,
    });

    summary.processed += 1;
    summary[decision.status.toLowerCase() as "matched" | "ambiguous" | "rejected"] += 1;

    if (dryRun) {
      if (decision.acceptedAlias) {
        summary.aliasesAccepted += 1;
      }
      continue;
    }

    if (decision.discoveredDefinition) {
      await prismaClient.itemDefinition.upsert({
        where: { typeId: decision.discoveredDefinition.typeId },
        update: {
          name: decision.discoveredDefinition.name,
          normalizedName: decision.discoveredDefinition.normalizedName,
          groupName: decision.discoveredDefinition.groupName,
          categoryName: decision.discoveredDefinition.categoryName,
          published: decision.discoveredDefinition.published,
        },
        create: {
          typeId: decision.discoveredDefinition.typeId,
          name: decision.discoveredDefinition.name,
          normalizedName: decision.discoveredDefinition.normalizedName,
          groupName: decision.discoveredDefinition.groupName,
          categoryName: decision.discoveredDefinition.categoryName,
          published: decision.discoveredDefinition.published,
        },
      });
    }

    await prismaClient.itemResolutionCandidate.deleteMany({
      where: {
        unknownItemObservationId: observation.id,
      },
    });

    if (decision.candidates.length > 0) {
      await prismaClient.itemResolutionCandidate.createMany({
        data: decision.candidates.map((candidate) => ({
          unknownItemObservationId: observation.id,
          candidateTypeId: candidate.candidateTypeId,
          candidateName: candidate.candidateName,
          source: candidate.source,
          confidenceScore: candidate.confidenceScore,
          confidenceReason: candidate.confidenceReason,
          accepted: candidate.accepted,
        })),
      });
    }

    if (decision.acceptedAlias) {
      await prismaClient.itemAlias.upsert({
        where: {
          aliasNormalized: decision.acceptedAlias.aliasNormalized,
        },
        update: {
          canonicalTypeId: decision.acceptedAlias.canonicalTypeId,
          canonicalName: decision.acceptedAlias.canonicalName,
          source: decision.acceptedAlias.source,
          confidenceScore: decision.acceptedAlias.confidenceScore,
          reviewStatus: "ACCEPTED",
        },
        create: {
          aliasNormalized: decision.acceptedAlias.aliasNormalized,
          canonicalTypeId: decision.acceptedAlias.canonicalTypeId,
          canonicalName: decision.acceptedAlias.canonicalName,
          source: decision.acceptedAlias.source,
          confidenceScore: decision.acceptedAlias.confidenceScore,
          reviewStatus: "ACCEPTED",
        },
      });
      summary.aliasesAccepted += 1;
    } else if (decision.pendingAlias) {
      await prismaClient.itemAlias.upsert({
        where: {
          aliasNormalized: decision.pendingAlias.aliasNormalized,
        },
        update: {
          canonicalTypeId: decision.pendingAlias.canonicalTypeId,
          canonicalName: decision.pendingAlias.canonicalName,
          source: decision.pendingAlias.source,
          confidenceScore: decision.pendingAlias.confidenceScore,
          reviewStatus: "PENDING",
        },
        create: {
          aliasNormalized: decision.pendingAlias.aliasNormalized,
          canonicalTypeId: decision.pendingAlias.canonicalTypeId,
          canonicalName: decision.pendingAlias.canonicalName,
          source: decision.pendingAlias.source,
          confidenceScore: decision.pendingAlias.confidenceScore,
          reviewStatus: "PENDING",
        },
      });
    }

    await prismaClient.unknownItemObservation.update({
      where: { id: observation.id },
      data: {
        status: decision.status,
        lastError: decision.lastError,
      },
    });
  }

  return summary;
}