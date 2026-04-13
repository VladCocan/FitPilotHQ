import assert from "node:assert/strict";
import test from "node:test";

import {
  acceptResolutionCandidate,
  rejectPendingAlias,
} from "@/lib/reference-data/internal-review";

test("acceptResolutionCandidate promotes a reviewed candidate to an accepted alias", async () => {
  const updates: Array<Record<string, unknown>> = [];
  const prisma = {
    itemResolutionCandidate: {
      async findUnique() {
        return {
          id: "candidate-1",
          candidateTypeId: 10629,
          confidenceScore: 88,
          source: "LEXICAL",
          unknownItemObservationId: "observation-1",
          observation: {
            normalizedName: "125mm gatling auto cannon i",
          },
        };
      },
      async updateMany(payload: Record<string, unknown>) {
        updates.push(payload);
        return payload;
      },
      async update(payload: Record<string, unknown>) {
        updates.push(payload);
        return payload;
      },
    },
    itemDefinition: {
      async findUnique() {
        return {
          typeId: 10629,
          name: "125mm Gatling AutoCannon I",
        };
      },
    },
    itemAlias: {
      async upsert(payload: Record<string, unknown>) {
        updates.push(payload);
        return payload;
      },
    },
    unknownItemObservation: {
      async update(payload: Record<string, unknown>) {
        updates.push(payload);
        return payload;
      },
    },
  };

  await acceptResolutionCandidate(prisma as never, "candidate-1");

  assert.equal((updates[2]?.create as { reviewStatus: string }).reviewStatus, "ACCEPTED");
  assert.equal((updates[3]?.data as { status: string }).status, "MATCHED");
});

test("rejectPendingAlias marks a pending alias as rejected", async () => {
  let lastUpdate: Record<string, unknown> | null = null;
  const prisma = {
    itemAlias: {
      async update(payload: Record<string, unknown>) {
        lastUpdate = payload;
        return payload;
      },
    },
  };

  await rejectPendingAlias(prisma as never, "alias-1");

  assert.ok(lastUpdate);
  const updatePayload = lastUpdate as { data: { reviewStatus: string } };
  assert.equal(updatePayload.data.reviewStatus, "REJECTED");
});