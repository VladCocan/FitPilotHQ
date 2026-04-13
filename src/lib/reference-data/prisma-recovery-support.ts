type PrismaLikeClient = Record<string, unknown>;

export function hasPrismaDelegate(prismaClient: unknown, delegateName: string) {
  if (!prismaClient || typeof prismaClient !== "object") {
    return false;
  }

  return Boolean((prismaClient as PrismaLikeClient)[delegateName]);
}

export function assertRecoveryDelegates(prismaClient: unknown, delegateNames: string[]) {
  const missing = delegateNames.filter((delegateName) => !hasPrismaDelegate(prismaClient, delegateName));

  if (missing.length === 0) {
    return;
  }

  throw new Error(
    `Recovery Prisma models are unavailable in the active client (${missing.join(", ")}). Run prisma generate and restart the active app process/container.`,
  );
}