import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { buildCoverageReport } from "@/lib/fits/fixture-reporting";

const report = buildCoverageReport(benchmarkCharacters.rookie);

console.log(`Coverage: ${report.totals.coveragePercent}%`);
console.log(`Fixtures: ${report.totals.fixtures}`);
console.log(`Parsed entries: ${report.totals.parsedEntries}`);
console.log(`Resolved items: ${report.totals.resolvedItems}`);
console.log(`Unknown items: ${report.totals.unknownItems}`);
console.log("");

for (const fixture of report.fixtures) {
  console.log(
    [
      fixture.label,
      `parsed=${fixture.parsedEntries}`,
      `resolved=${fixture.resolvedItems}`,
      `unknown=${fixture.unknownItems}`,
      `direct=${fixture.directRequirements}`,
      `total=${fixture.totalRequirements}`,
      `readiness=${fixture.readinessLabel}`,
    ].join(" | "),
  );
}