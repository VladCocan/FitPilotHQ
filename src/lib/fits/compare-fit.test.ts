import assert from "node:assert/strict";
import test from "node:test";

import { compareFit } from "@/lib/fits/compare-fit";
import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { benchmarkFitFixtures } from "@/lib/fits/fixtures/benchmark-fits";
import {
  benchmarkItemDefinitions,
  benchmarkPrerequisiteEdges,
  benchmarkSkillCatalog,
} from "@/lib/fits/fixtures/reference-data";

test("compareFit ranks the best available character first", () => {
  const fixture = benchmarkFitFixtures.find((candidate) => candidate.id === "simple-frigate");

  assert.ok(fixture);

  const result = compareFit({
    fitText: fixture.fitText,
    characters: [benchmarkCharacters.trainee, benchmarkCharacters.rookie, benchmarkCharacters.specialist],
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });

  assert.ok(result.best);
  assert.equal(result.best?.characterName, "Rookie Pilot");
  assert.deepEqual(
    result.comparisons.map((entry) => entry.rank),
    [1, 2, 3],
  );
  assert.equal(result.comparisons[2]?.characterName, "Trainee Pilot");
});

test("compareFit carries optional debug output through each analysis", () => {
  const fixture = benchmarkFitFixtures.find((candidate) => candidate.id === "battlecruiser");

  assert.ok(fixture);

  const result = compareFit({
    fitText: fixture.fitText,
    characters: [benchmarkCharacters.specialist, benchmarkCharacters.trainee],
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
    includeDebug: true,
  });

  assert.equal(result.comparisons.length, 2);
  assert.ok(result.comparisons[0]?.analysis.debug);
  assert.ok(result.comparisons[0]?.analysis.readiness.breakdown.weightedCoverage >= 0);
  assert.ok(result.comparisons[0]?.analysis.readiness.breakdown.weightedCoverage <= 1);
  assert.equal(
    result.comparisons[0]?.analysis.debug?.readinessBreakdown.weightedCoverage,
    result.comparisons[0]?.analysis.readiness.breakdown.weightedCoverage,
  );
});