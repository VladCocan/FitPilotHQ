import { analyzeFit } from "@/lib/fits/analyze-fit";
import type { CharacterAnalysisInput } from "@/lib/fits/types";

import { benchmarkFitFixtures } from "@/lib/fits/fixtures/benchmark-fits";
import {
  benchmarkItemDefinitions,
  benchmarkPrerequisiteEdges,
  benchmarkSkillCatalog,
} from "@/lib/fits/fixtures/reference-data";

export function runFixtureAnalysis(character: CharacterAnalysisInput) {
  return benchmarkFitFixtures.map((fixture) => {
    const result = analyzeFit({
      fitText: fixture.fitText,
      character,
      itemDefinitions: benchmarkItemDefinitions,
      skillCatalog: benchmarkSkillCatalog,
      prerequisiteEdges: benchmarkPrerequisiteEdges,
    });

    return {
      fixture,
      result,
    };
  });
}

export function buildCoverageReport(character: CharacterAnalysisInput) {
  const runs = runFixtureAnalysis(character);
  const fixtureSummaries = runs.map(({ fixture, result }) => ({
    id: fixture.id,
    label: fixture.label,
    parsedEntries: result.parsedFit.entries.length,
    resolvedItems: result.resolvedItems.length,
    unknownItems: result.unknownItems.length,
    directRequirements: result.directRequirements.length,
    totalRequirements: result.totalRequirements.length,
    readinessLabel: result.readiness.label,
  }));

  const totals = fixtureSummaries.reduce(
    (summary, fixture) => ({
      fixtures: summary.fixtures + 1,
      parsedEntries: summary.parsedEntries + fixture.parsedEntries,
      resolvedItems: summary.resolvedItems + fixture.resolvedItems,
      unknownItems: summary.unknownItems + fixture.unknownItems,
    }),
    { fixtures: 0, parsedEntries: 0, resolvedItems: 0, unknownItems: 0 },
  );

  const coveragePercent = totals.parsedEntries === 0
    ? 0
    : Math.round((totals.resolvedItems / totals.parsedEntries) * 100);

  return {
    totals: {
      ...totals,
      coveragePercent,
    },
    fixtures: fixtureSummaries,
  };
}

export function buildUnknownItemReport(character: CharacterAnalysisInput) {
  const runs = runFixtureAnalysis(character);
  const counts = new Map<string, {
    name: string;
    occurrences: number;
    fixtures: Set<string>;
    reasons: Set<string>;
  }>();

  for (const { fixture, result } of runs) {
    for (const unknownItem of result.unknownItems) {
      const existing = counts.get(unknownItem.name) ?? {
        name: unknownItem.name,
        occurrences: 0,
        fixtures: new Set<string>(),
        reasons: new Set<string>(),
      };

      existing.occurrences += unknownItem.quantity;
      existing.fixtures.add(fixture.id);
      existing.reasons.add(unknownItem.reason);
      counts.set(unknownItem.name, existing);
    }
  }

  return [...counts.values()]
    .map((entry) => ({
      name: entry.name,
      occurrences: entry.occurrences,
      fixtures: [...entry.fixtures].sort((left, right) => left.localeCompare(right)),
      reasons: [...entry.reasons].sort((left, right) => left.localeCompare(right)),
    }))
    .sort((left, right) => right.occurrences - left.occurrences || left.name.localeCompare(right.name));
}