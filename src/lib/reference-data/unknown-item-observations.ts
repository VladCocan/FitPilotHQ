import { createHash } from "node:crypto";

import type { PrismaClient } from "@prisma/client";

import { normalizeEveName } from "@/lib/fits/normalize";
import type { ParsedFitEntryKind, UnknownFitItem } from "@/lib/fits/types";
import { hasPrismaDelegate } from "@/lib/reference-data/prisma-recovery-support";

type ObservationPrismaClient = Pick<PrismaClient, "unknownItemObservation">;

function toObservationKind(kind: ParsedFitEntryKind) {
  switch (kind) {
    case "ship":
      return "SHIP" as const;
    case "drone":
      return "DRONE" as const;
    case "charge":
      return "CHARGE" as const;
    case "item":
      return "ITEM" as const;
    default:
      return "UNKNOWN" as const;
  }
}

function createFitHash(fitText: string) {
  const trimmed = fitText.trim();

  if (!trimmed) {
    return null;
  }

  return createHash("sha256").update(trimmed).digest("hex");
}

export async function observeUnknownFitItems(
  prismaClient: ObservationPrismaClient,
  input: {
    fitText: string;
    unknownItems: UnknownFitItem[];
  },
) {
  if (!hasPrismaDelegate(prismaClient, "unknownItemObservation")) {
    return;
  }

  const fitHash = createFitHash(input.fitText);
  const now = new Date();
  const groupedUnknowns = new Map<string, UnknownFitItem & { seenCount: number }>();

  for (const unknownItem of input.unknownItems) {
    const normalizedName = normalizeEveName(unknownItem.name);
    const key = `${normalizedName}:${unknownItem.kind}`;
    const existing = groupedUnknowns.get(key);

    if (existing) {
      existing.seenCount += Math.max(1, unknownItem.quantity);
      continue;
    }

    groupedUnknowns.set(key, {
      ...unknownItem,
      seenCount: Math.max(1, unknownItem.quantity),
    });
  }

  for (const unknownItem of groupedUnknowns.values()) {
    const normalizedName = normalizeEveName(unknownItem.name);

    await prismaClient.unknownItemObservation.upsert({
      where: {
        normalizedName_kind: {
          normalizedName,
          kind: toObservationKind(unknownItem.kind),
        },
      },
      update: {
        originalName: unknownItem.name,
        lastSeenAt: now,
        seenCount: {
          increment: unknownItem.seenCount,
        },
        sourceFitHash: fitHash ?? undefined,
        lastError: null,
      },
      create: {
        normalizedName,
        originalName: unknownItem.name,
        kind: toObservationKind(unknownItem.kind),
        sourceFitHash: fitHash ?? undefined,
        firstSeenAt: now,
        lastSeenAt: now,
        seenCount: unknownItem.seenCount,
        status: "PENDING",
      },
    });
  }
}