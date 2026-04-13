import assert from "node:assert/strict";
import test from "node:test";

import { resolveFitRequirements } from "@/lib/fits/fit-requirements";
import { benchmarkItemDefinitions, benchmarkPrerequisiteEdges, benchmarkSkillCatalog } from "@/lib/fits/fixtures/reference-data";
import { parseEft } from "@/lib/fits/parser";

function createPrerequisitesBySkillId() {
  const map = new Map<number, Array<{ skillTypeId: number; requiredLevel: number }>>();

  for (const edge of benchmarkPrerequisiteEdges) {
    const prerequisites = map.get(edge.skillTypeId) ?? [];
    prerequisites.push({
      skillTypeId: edge.prerequisiteTypeId,
      requiredLevel: edge.requiredLevel,
    });
    map.set(edge.skillTypeId, prerequisites);
  }

  return map;
}

test("resolveFitRequirements uses exact item definition matches first", () => {
  const result = resolveFitRequirements(
    parseEft(`[Rifter, Exact]\n125mm Gatling AutoCannon I`),
    benchmarkItemDefinitions,
    [],
    new Map(benchmarkSkillCatalog.map((skill) => [skill.typeId, skill])),
    createPrerequisitesBySkillId(),
  );

  assert.equal(result.unknownItems.length, 0);
  assert.equal(result.resolvedItems[0]?.resolutionSource, "exact");
});

test("resolveFitRequirements uses accepted aliases when exact names are missing", () => {
  const result = resolveFitRequirements(
    parseEft(`[Rifter, Alias]\n125mm Gatling Auto Cannon I`),
    benchmarkItemDefinitions,
    [
      {
        aliasNormalized: "125mm gatling auto cannon i",
        canonicalTypeId: 10629,
        canonicalName: "125mm Gatling AutoCannon I",
        source: "auto-sde",
        confidenceScore: 88,
      },
    ],
    new Map(benchmarkSkillCatalog.map((skill) => [skill.typeId, skill])),
    createPrerequisitesBySkillId(),
  );

  assert.equal(result.unknownItems.length, 0);
  assert.equal(result.resolvedItems[1]?.resolutionSource, "alias");
  assert.equal(result.autoResolvedAliasesUsed.length, 1);
  assert.equal(result.autoResolvedAliasesUsed[0]?.canonicalName, "125mm Gatling AutoCannon I");
});

test("resolveFitRequirements ignores non-accepted aliases by treating them as unresolved", () => {
  const result = resolveFitRequirements(
    parseEft(`[Rifter, Pending Alias]\n125mm Gatling Auto Cannon I`),
    benchmarkItemDefinitions,
    [],
    new Map(benchmarkSkillCatalog.map((skill) => [skill.typeId, skill])),
    createPrerequisitesBySkillId(),
  );

  assert.equal(result.unknownItems.length, 1);
  assert.equal(result.autoResolvedAliasesUsed.length, 0);
});