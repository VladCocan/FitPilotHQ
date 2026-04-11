import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { buildUnknownItemReport } from "@/lib/fits/fixture-reporting";

const report = buildUnknownItemReport(benchmarkCharacters.rookie);

if (report.length === 0) {
  console.log("No unknown items detected in benchmark fixtures.");
  process.exit(0);
}

for (const entry of report) {
  console.log(
    [
      entry.name,
      `occurrences=${entry.occurrences}`,
      `fixtures=${entry.fixtures.join(",")}`,
      `reasons=${entry.reasons.join(" | ")}`,
    ].join(" | "),
  );
}