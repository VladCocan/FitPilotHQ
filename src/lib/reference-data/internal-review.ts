import type { PrismaClient } from "@prisma/client";

import { assertRecoveryDelegates } from "@/lib/reference-data/prisma-recovery-support";

type InternalReviewPrismaClient = Pick<
  PrismaClient,
  "unknownItemObservation" | "itemResolutionCandidate" | "itemAlias" | "itemDefinition"
>;

function mapAliasSourceFromCandidateSource(source: "SDE" | "ESI" | "LEXICAL" | "MANUAL") {
  switch (source) {
    case "ESI":
      return "AUTO_ESI" as const;
    case "MANUAL":
      return "MANUAL" as const;
    default:
      return "AUTO_SDE" as const;
  }
}

export async function getReferenceDataReviewState(prismaClient: InternalReviewPrismaClient) {
  assertRecoveryDelegates(prismaClient, [
    "unknownItemObservation",
    "itemResolutionCandidate",
    "itemAlias",
    "itemDefinition",
  ]);

  const [summary, ambiguousObservations, pendingAliases] = await Promise.all([
    Promise.all([
      prismaClient.unknownItemObservation.count({ where: { status: "PENDING" } }),
      prismaClient.unknownItemObservation.count({ where: { status: "AMBIGUOUS" } }),
      prismaClient.unknownItemObservation.count({ where: { status: "MATCHED" } }),
      prismaClient.itemAlias.count({ where: { reviewStatus: "PENDING" } }),
      prismaClient.itemAlias.count({ where: { reviewStatus: "ACCEPTED" } }),
    ]),
    prismaClient.unknownItemObservation.findMany({
      where: { status: "AMBIGUOUS" },
      orderBy: [
        { seenCount: "desc" },
        { lastSeenAt: "desc" },
      ],
      include: {
        candidates: {
          orderBy: [
            { confidenceScore: "desc" },
            { candidateName: "asc" },
          ],
        },
      },
      take: 30,
    }),
    prismaClient.itemAlias.findMany({
      where: { reviewStatus: "PENDING" },
      orderBy: { updatedAt: "desc" },
      take: 30,
    }),
  ]);

  const [pendingObservations, ambiguousCount, matchedCount, pendingAliasCount, acceptedAliasCount] = summary;

  return {
    summary: {
      pendingObservations,
      ambiguousCount,
      matchedCount,
      pendingAliasCount,
      acceptedAliasCount,
    },
    ambiguousObservations,
    pendingAliases,
  };
}

export async function acceptResolutionCandidate(
  prismaClient: InternalReviewPrismaClient,
  candidateId: string,
) {
  assertRecoveryDelegates(prismaClient, [
    "unknownItemObservation",
    "itemResolutionCandidate",
    "itemAlias",
    "itemDefinition",
  ]);

  const candidate = await prismaClient.itemResolutionCandidate.findUnique({
    where: { id: candidateId },
    include: {
      observation: true,
    },
  });

  if (!candidate) {
    throw new Error("Resolution candidate not found.");
  }

  if (!candidate.candidateTypeId) {
    throw new Error("Resolution candidate does not have a canonical type ID.");
  }

  const definition = await prismaClient.itemDefinition.findUnique({
    where: { typeId: candidate.candidateTypeId },
  });

  if (!definition) {
    throw new Error("Resolution candidate points to a missing item definition.");
  }

  await prismaClient.itemResolutionCandidate.updateMany({
    where: {
      unknownItemObservationId: candidate.unknownItemObservationId,
    },
    data: {
      accepted: false,
    },
  });

  await prismaClient.itemResolutionCandidate.update({
    where: { id: candidate.id },
    data: {
      accepted: true,
    },
  });

  await prismaClient.itemAlias.upsert({
    where: {
      aliasNormalized: candidate.observation.normalizedName,
    },
    update: {
      canonicalTypeId: candidate.candidateTypeId,
      canonicalName: definition.name,
      source: mapAliasSourceFromCandidateSource(candidate.source),
      confidenceScore: candidate.confidenceScore,
      reviewStatus: "ACCEPTED",
    },
    create: {
      aliasNormalized: candidate.observation.normalizedName,
      canonicalTypeId: candidate.candidateTypeId,
      canonicalName: definition.name,
      source: mapAliasSourceFromCandidateSource(candidate.source),
      confidenceScore: candidate.confidenceScore,
      reviewStatus: "ACCEPTED",
    },
  });

  await prismaClient.unknownItemObservation.update({
    where: { id: candidate.unknownItemObservationId },
    data: {
      status: "MATCHED",
      lastError: null,
    },
  });
}

export async function rejectUnknownObservation(
  prismaClient: InternalReviewPrismaClient,
  observationId: string,
) {
  assertRecoveryDelegates(prismaClient, ["unknownItemObservation", "itemAlias"]);

  const observation = await prismaClient.unknownItemObservation.findUnique({
    where: { id: observationId },
  });

  if (!observation) {
    throw new Error("Unknown item observation not found.");
  }

  await prismaClient.itemAlias.updateMany({
    where: {
      aliasNormalized: observation.normalizedName,
      reviewStatus: "PENDING",
    },
    data: {
      reviewStatus: "REJECTED",
    },
  });

  await prismaClient.unknownItemObservation.update({
    where: { id: observationId },
    data: {
      status: "REJECTED",
      lastError: "Rejected by internal review.",
    },
  });
}

export async function acceptPendingAlias(
  prismaClient: InternalReviewPrismaClient,
  aliasId: string,
) {
  assertRecoveryDelegates(prismaClient, ["unknownItemObservation", "itemAlias", "itemDefinition"]);

  const alias = await prismaClient.itemAlias.findUnique({
    where: { id: aliasId },
  });

  if (!alias) {
    throw new Error("Pending alias not found.");
  }

  const definition = await prismaClient.itemDefinition.findUnique({
    where: { typeId: alias.canonicalTypeId },
  });

  if (!definition) {
    throw new Error("Pending alias points to a missing item definition.");
  }

  await prismaClient.itemAlias.update({
    where: { id: aliasId },
    data: {
      canonicalName: definition.name,
      reviewStatus: "ACCEPTED",
    },
  });

  await prismaClient.unknownItemObservation.updateMany({
    where: { normalizedName: alias.aliasNormalized },
    data: {
      status: "MATCHED",
      lastError: null,
    },
  });
}

export async function rejectPendingAlias(
  prismaClient: InternalReviewPrismaClient,
  aliasId: string,
) {
  assertRecoveryDelegates(prismaClient, ["itemAlias"]);

  await prismaClient.itemAlias.update({
    where: { id: aliasId },
    data: {
      reviewStatus: "REJECTED",
    },
  });
}