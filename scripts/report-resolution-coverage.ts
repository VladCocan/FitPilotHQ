import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const [itemDefinitions, observations, aliases, matched, ambiguous] = await Promise.all([
    prisma.itemDefinition.count(),
    prisma.unknownItemObservation.count(),
    prisma.itemAlias.count({
      where: {
        reviewStatus: "ACCEPTED",
      },
    }),
    prisma.unknownItemObservation.count({
      where: {
        status: "MATCHED",
      },
    }),
    prisma.unknownItemObservation.count({
      where: {
        status: "AMBIGUOUS",
      },
    }),
  ]);

  const resolvedPercent = observations === 0
    ? 0
    : Math.round((matched / observations) * 100);

  console.log(JSON.stringify({
    itemDefinitions,
    acceptedAliases: aliases,
    observedUnknownItems: observations,
    matchedObservations: matched,
    ambiguousObservations: ambiguous,
    resolvedPercent,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });