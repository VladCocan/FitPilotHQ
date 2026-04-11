import assert from "node:assert/strict";
import test from "node:test";

import { analyzeFit } from "@/lib/fits/analyze-fit";
import { benchmarkCharacters } from "@/lib/fits/fixtures/characters";
import { benchmarkFitFixtures } from "@/lib/fits/fixtures/benchmark-fits";
import {
  benchmarkItemDefinitions,
  benchmarkPrerequisiteEdges,
  benchmarkSkillCatalog,
} from "@/lib/fits/fixtures/reference-data";

test("analyzeFit resolves the simple frigate benchmark without unknown items", () => {
  const fixture = benchmarkFitFixtures.find((candidate) => candidate.id === "simple-frigate");

  assert.ok(fixture);

  const result = analyzeFit({
    fitText: fixture.fitText,
    character: benchmarkCharacters.rookie,
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });

  assert.equal(result.unknownItems.length, 0);
  assert.ok(result.directRequirements.length >= fixture.expectedDirectRequirementsAtLeast);
  assert.ok(result.totalRequirements.length >= result.directRequirements.length);
  assert.equal(result.readiness.label, fixture.expectedReadinessLabel);
  assert.equal(result.readiness.isReady, true);
  assert.equal(result.missingRequirements.length, 0);
  assert.equal(result.trainingPlan.totalTrainingSeconds, 0);
  assert.equal(result.trainingPlan.steps.length, 0);
  assert.match(result.readiness.summary, /total requirement/);
  assert.ok(result.readiness.breakdown.directCoverage > 0);
  assert.equal(result.readiness.breakdown.unknownPenalty, 0);
});

test("analyzeFit resolves the battlecruiser benchmark and surfaces missing training", () => {
  const fixture = benchmarkFitFixtures.find((candidate) => candidate.id === "battlecruiser");

  assert.ok(fixture);

  const result = analyzeFit({
    fitText: fixture.fitText,
    character: benchmarkCharacters.specialist,
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });

  assert.equal(result.unknownItems.length, 0);
  assert.ok(result.directRequirements.length >= fixture.expectedDirectRequirementsAtLeast);
  assert.equal(result.readiness.label, fixture.expectedReadinessLabel);
  assert.equal(result.readiness.isReady, false);
  assert.ok(result.trainingPlan.steps.length > 0);
  assert.ok(result.trainingPlan.totalTrainingSeconds > 0);
  assert.match(result.readiness.summary, /missing skill/);
});

test("benchmark fixtures remain analyzable as a smoke suite", () => {
  for (const fixture of benchmarkFitFixtures) {
    const result = analyzeFit({
      fitText: fixture.fitText,
      character: benchmarkCharacters.rookie,
      itemDefinitions: benchmarkItemDefinitions,
      skillCatalog: benchmarkSkillCatalog,
      prerequisiteEdges: benchmarkPrerequisiteEdges,
    });

    assert.equal(
      result.unknownItems.length,
      fixture.expectedUnknownItems,
      `${fixture.id} unknown item count changed`,
    );
    assert.ok(
      result.directRequirements.length >= fixture.expectedDirectRequirementsAtLeast,
      `${fixture.id} direct requirements dropped unexpectedly`,
    );
    assert.ok(result.readiness.score >= 0 && result.readiness.score <= 100);
    assert.equal(result.readiness.label, fixture.expectedReadinessLabel);

    if (fixture.expectedUnknownItems > 0) {
      assert.equal(result.readiness.isReady, false, `${fixture.id} should not be fully ready when unknown items exist`);
    }
  }
});

test("analyzeFit produces a non-zero training plan and prerequisite-first ordering for an under-skilled pilot", () => {
  const fixture = benchmarkFitFixtures.find((candidate) => candidate.id === "simple-frigate");

  assert.ok(fixture);

  const result = analyzeFit({
    fitText: fixture.fitText,
    character: benchmarkCharacters.trainee,
    itemDefinitions: benchmarkItemDefinitions,
    skillCatalog: benchmarkSkillCatalog,
    prerequisiteEdges: benchmarkPrerequisiteEdges,
  });

  assert.equal(result.readiness.label, "Not Ready");
  assert.equal(result.readiness.isReady, false);
  assert.ok(result.readiness.score < 60);
  assert.ok(result.readiness.breakdown.weightedCoverage < 0.6);
  assert.equal(result.unknownItems.length, 0);
  assert.ok(result.missingRequirements.length > 0);
  assert.ok(result.trainingPlan.totalTrainingSeconds > 0);
  assert.equal(result.trainingPlan.steps.length, result.missingRequirements.length);
  assert.deepEqual(
    result.trainingPlan.steps.map((step) => step.position),
    result.trainingPlan.steps.map((_, index) => index + 1),
  );

  for (const step of result.trainingPlan.steps) {
    assert.ok(step.trainingSeconds > 0);
    assert.ok(step.remainingSkillpoints > 0);
    assert.ok(step.toLevel > step.fromLevel);
  }

  const trainingStepNames = result.trainingPlan.steps.map((step) => step.skillName);
  assert.ok(trainingStepNames.indexOf("Gunnery") < trainingStepNames.indexOf("Small Projectile Turret"));
  assert.ok(trainingStepNames.indexOf("Missile Launcher Operation") < trainingStepNames.indexOf("Rockets"));
  assert.ok(trainingStepNames.indexOf("Science") < trainingStepNames.indexOf("Energy Grid Upgrades"));
  assert.ok(trainingStepNames.indexOf("Power Grid Management") < trainingStepNames.indexOf("Energy Grid Upgrades"));
  assert.ok(trainingStepNames.indexOf("Drones") < trainingStepNames.indexOf("Scout Drone Operation"));
  assert.ok(trainingStepNames.indexOf("Spaceship Command") < trainingStepNames.indexOf("Minmatar Frigate"));
});