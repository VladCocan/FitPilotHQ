import assert from "node:assert/strict";
import test from "node:test";

import { analyzeFit } from "@/lib/fits/analyze-fit";
import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import {
  benchmarkItemDefinitions,
  benchmarkPrerequisiteEdges,
  benchmarkSkillCatalog,
} from "@/lib/fits/fixtures/reference-data";

const regressionFit = `[Drake, Recovery Regression]
125mm Gatling Auto Cannon I
Rocket Launcher Mark I
Large Shield Extender III`;

test("accepted aliases reduce unknown item counts for later analysis runs", () => {
  const before = analyzeFit({
    fitText: regressionFit,
    character: benchmarkCharacters.rookie,
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });
  const after = analyzeFit({
    fitText: regressionFit,
    character: benchmarkCharacters.rookie,
    itemDefinitions: benchmarkItemDefinitions,
    itemAliases: [
      {
        aliasNormalized: "125mm gatling auto cannon i",
        canonicalTypeId: 10629,
        canonicalName: "125mm Gatling AutoCannon I",
        source: "auto-sde",
        confidenceScore: 88,
      },
      {
        aliasNormalized: "rocket launcher mark i",
        canonicalTypeId: 2514,
        canonicalName: "Rocket Launcher I",
        source: "auto-sde",
        confidenceScore: 70,
      },
      {
        aliasNormalized: "large shield extender iii",
        canonicalTypeId: 3841,
        canonicalName: "Large Shield Extender II",
        source: "auto-sde",
        confidenceScore: 50,
      },
    ],
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });

  assert.equal(before.unknownItems.length, 3);
  assert.ok(after.unknownItems.length < before.unknownItems.length);
});