import assert from "node:assert/strict";
import test from "node:test";

import { benchmarkItemDefinitions } from "@/lib/fits/fixtures/reference-data";
import { buildRecoveryDecision, recoverPendingUnknownItems } from "@/lib/reference-data/recover-unknown-items";

test("buildRecoveryDecision auto-accepts a high-confidence lexical match", () => {
  const decision = buildRecoveryDecision({
    observation: {
      id: "obs-1",
      normalizedName: "125mm gatling autocannon i",
      originalName: "125mm Gatling Autocannon I",
      kind: "ITEM",
    },
    itemDefinitions: benchmarkItemDefinitions,
    acceptedAliases: [],
  });

  assert.equal(decision.status, "MATCHED");
  assert.equal(decision.acceptedAlias?.source, "AUTO_SDE");
});

test("buildRecoveryDecision leaves ambiguous lexical matches unaccepted", () => {
  const decision = buildRecoveryDecision({
    observation: {
      id: "obs-2",
      normalizedName: "shield extender",
      originalName: "Shield Extender",
      kind: "ITEM",
    },
    itemDefinitions: benchmarkItemDefinitions,
    acceptedAliases: [],
  });

  assert.notEqual(decision.status, "MATCHED");
  assert.equal(Boolean(decision.acceptedAlias), false);
});

test("buildRecoveryDecision keeps weak ESI candidates pending review", () => {
  const decision = buildRecoveryDecision({
    observation: {
      id: "obs-3",
      normalizedName: "rare launcher x",
      originalName: "Rare Launcher X",
      kind: "ITEM",
    },
    itemDefinitions: benchmarkItemDefinitions,
    acceptedAliases: [],
    esiCandidates: [
      {
        typeId: 999999,
        name: "Launcher",
        normalizedName: "launcher",
        groupName: "Missile Launcher",
        categoryName: "Module",
        published: true,
      },
    ],
  });

  assert.notEqual(decision.status, "MATCHED");
  assert.equal(Boolean(decision.acceptedAlias), false);
});

test("recoverPendingUnknownItems upserts accepted aliases safely", async () => {
  const createdAliases: Array<Record<string, unknown>> = [];
  const updatedObservations: Array<Record<string, unknown>> = [];
  const prisma = {
    unknownItemObservation: {
      async findMany() {
        return [
          {
            id: "obs-4",
            normalizedName: "125mm gatling autocannon i",
            originalName: "125mm Gatling Autocannon I",
            kind: "ITEM",
          },
        ];
      },
      async update(payload: Record<string, unknown>) {
        updatedObservations.push(payload);
        return payload;
      },
    },
    itemDefinition: {
      async findMany() {
        return benchmarkItemDefinitions.map((item) => ({
          ...item,
          requirementSkills: item.requirementSkills,
        }));
      },
      async upsert(payload: Record<string, unknown>) {
        return payload;
      },
    },
    itemAlias: {
      async findMany() {
        return [];
      },
      async upsert(payload: Record<string, unknown>) {
        createdAliases.push(payload);
        return payload;
      },
    },
    itemResolutionCandidate: {
      async deleteMany() {
        return { count: 0 };
      },
      async createMany(payload: Record<string, unknown>) {
        return payload;
      },
    },
  };

  const summary = await recoverPendingUnknownItems(prisma as never, {
    dryRun: false,
    limit: 10,
    esiClient: {
      async resolveTypeCandidates() {
        return [];
      },
    },
  });

  assert.equal(summary.aliasesAccepted, 1);
  assert.equal(createdAliases.length, 1);
  assert.equal((updatedObservations[0]?.data as { status: string }).status, "MATCHED");
});

test("recoverPendingUnknownItems queues pending aliases for ambiguous matches", async () => {
  const createdAliases: Array<Record<string, unknown>> = [];
  const prisma = {
    unknownItemObservation: {
      async findMany() {
        return [
          {
            id: "obs-5",
            normalizedName: "shield extender",
            originalName: "Shield Extender",
            kind: "ITEM",
          },
        ];
      },
      async update() {
        return null;
      },
    },
    itemDefinition: {
      async findMany() {
        return benchmarkItemDefinitions.map((item) => ({
          ...item,
          requirementSkills: item.requirementSkills,
        }));
      },
      async upsert(payload: Record<string, unknown>) {
        return payload;
      },
    },
    itemAlias: {
      async findMany() {
        return [];
      },
      async upsert(payload: Record<string, unknown>) {
        createdAliases.push(payload);
        return payload;
      },
    },
    itemResolutionCandidate: {
      async deleteMany() {
        return { count: 0 };
      },
      async createMany(payload: Record<string, unknown>) {
        return payload;
      },
    },
  };

  await recoverPendingUnknownItems(prisma as never, {
    dryRun: false,
    limit: 10,
    esiClient: {
      async resolveTypeCandidates() {
        return [];
      },
    },
  });

  assert.equal((createdAliases[0]?.create as { reviewStatus: string }).reviewStatus, "PENDING");
});