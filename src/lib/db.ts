import "server-only";

import { PrismaClient } from "@prisma/client";

import { env } from "@/lib/env";
import { hasPrismaDelegate } from "@/lib/reference-data/prisma-recovery-support";

declare global {
  // eslint-disable-next-line no-var
  var prismaGlobal: PrismaClient | undefined;
}

function createPrismaClient() {
  return new PrismaClient({
    datasources: {
      db: {
        url: env.DATABASE_URL,
      },
    },
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

function isStalePrismaClient(prismaClient: PrismaClient | undefined) {
  if (!prismaClient) {
    return false;
  }

  return !hasPrismaDelegate(prismaClient, "unknownItemObservation")
    || !hasPrismaDelegate(prismaClient, "itemResolutionCandidate")
    || !hasPrismaDelegate(prismaClient, "itemAlias");
}

if (isStalePrismaClient(global.prismaGlobal)) {
  void global.prismaGlobal?.$disconnect().catch(() => undefined);
  global.prismaGlobal = undefined;
}

const prismaClient =
  global.prismaGlobal ??
  createPrismaClient();

if (env.NODE_ENV !== "production") {
  global.prismaGlobal = prismaClient;
}

export const prisma = prismaClient;
