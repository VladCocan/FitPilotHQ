import { PrismaClient } from "@prisma/client";

import { recoverPendingUnknownItems } from "@/lib/reference-data/recover-unknown-items";

const prisma = new PrismaClient();

function parseArgs(argv: string[]) {
  let dryRun = false;
  let limit = 25;

  for (const arg of argv) {
    if (arg === "--dry-run") {
      dryRun = true;
      continue;
    }

    if (arg.startsWith("--max-items=")) {
      const next = Number.parseInt(arg.slice("--max-items=".length), 10);

      if (Number.isFinite(next) && next > 0) {
        limit = next;
      }
    }
  }

  return { dryRun, limit };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const summary = await recoverPendingUnknownItems(prisma, options);

  console.log(JSON.stringify({ dryRun: options.dryRun, maxItems: options.limit, ...summary }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });