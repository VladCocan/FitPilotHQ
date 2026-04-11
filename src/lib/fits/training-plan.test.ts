import assert from "node:assert/strict";
import test from "node:test";

import { buildTrainingPlan } from "@/lib/fits/training-plan";

test("buildTrainingPlan orders prerequisite steps before dependent skills", () => {
  const plan = buildTrainingPlan(
    [
      {
        skillTypeId: 3303,
        skillName: "Small Projectile Turret",
        requiredLevel: 1,
        source: "direct",
        sourceNames: ["125mm Gatling AutoCannon I"],
        currentLevel: 0,
        currentSkillpoints: 0,
        missingLevels: 1,
        rank: 1,
        trainingAttributes: {
          primaryAttribute: "perception",
          secondaryAttribute: "willpower",
        },
        requiredSkillpoints: 250,
        remainingSkillpoints: 250,
        trainingRatePerMinute: 25,
        trainingSeconds: 600,
      },
      {
        skillTypeId: 3300,
        skillName: "Gunnery",
        requiredLevel: 1,
        source: "prerequisite",
        sourceNames: ["Small Projectile Turret"],
        currentLevel: 0,
        currentSkillpoints: 0,
        missingLevels: 1,
        rank: 1,
        trainingAttributes: {
          primaryAttribute: "perception",
          secondaryAttribute: "willpower",
        },
        requiredSkillpoints: 250,
        remainingSkillpoints: 250,
        trainingRatePerMinute: 25,
        trainingSeconds: 600,
      },
    ],
    new Map([
      [3303, [{ skillTypeId: 3300, requiredLevel: 1 }]],
    ]),
  );

  assert.deepEqual(plan.steps.map((step) => step.skillName), [
    "Gunnery",
    "Small Projectile Turret",
  ]);
  assert.equal(plan.totalTrainingSeconds, 1200);
});