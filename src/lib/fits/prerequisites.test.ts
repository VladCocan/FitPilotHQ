import assert from "node:assert/strict";
import test from "node:test";

import { expandSkillPrerequisites } from "@/lib/fits/prerequisites";
import { benchmarkSkillCatalog } from "@/lib/fits/fixtures/reference-data";

test("expandSkillPrerequisites recursively deduplicates prerequisites", () => {
  const skillCatalogById = new Map(benchmarkSkillCatalog.map((skill) => [skill.typeId, skill]));
  const prerequisitesBySkillId = new Map([
    [33096, [{ skillTypeId: 3327, requiredLevel: 3 }, { skillTypeId: 3334, requiredLevel: 3 }]],
    [3334, [{ skillTypeId: 3327, requiredLevel: 2 }, { skillTypeId: 33092, requiredLevel: 3 }]],
    [33092, [{ skillTypeId: 3330, requiredLevel: 3 }]],
    [3330, [{ skillTypeId: 3327, requiredLevel: 1 }]],
  ]);

  const prerequisites = expandSkillPrerequisites(
    [
      {
        skillTypeId: 33096,
        skillName: "Caldari Battlecruiser",
        requiredLevel: 1,
        source: "direct",
        sourceNames: ["Drake"],
      },
    ],
    prerequisitesBySkillId,
    skillCatalogById,
  );

  assert.deepEqual(
    prerequisites.map((item) => [item.skillName, item.requiredLevel]),
    [
      ["Caldari Cruiser", 3],
      ["Caldari Destroyer", 3],
      ["Caldari Frigate", 3],
      ["Spaceship Command", 3],
    ],
  );
});