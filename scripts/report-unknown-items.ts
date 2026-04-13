import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [observations, matchedAliases] = await Promise.all([
    prisma.unknownItemObservation.findMany({
      orderBy: [
        { seenCount: "desc" },
        { lastSeenAt: "desc" },
      ],
      take: 25,
    }),
    prisma.itemAlias.count({
      where: {
        reviewStatus: "ACCEPTED",
      },
    }),
  ]);

  if (observations.length === 0) {
    console.log("No unknown item observations recorded.");
    return;
  }

  console.log(`Accepted aliases: ${matchedAliases}`);

  for (const observation of observations) {
    console.log(
      [
        observation.originalName,
        `seen=${observation.seenCount}`,
        `status=${observation.status.toLowerCase()}`,
        `lastSeen=${observation.lastSeenAt.toISOString()}`,
        `error=${observation.lastError ?? "none"}`,
      ].join(" | "),
    );
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });