import assert from "node:assert/strict";
import test from "node:test";

import { observeUnknownFitItems } from "@/lib/reference-data/unknown-item-observations";

test("observeUnknownFitItems records grouped observations safely", async () => {
  const calls: Array<Record<string, unknown>> = [];
  const prisma = {
    unknownItemObservation: {
      async upsert(payload: Record<string, unknown>) {
        calls.push(payload);
        return payload;
      },
    },
  };

  await observeUnknownFitItems(prisma as never, {
    fitText: "[Drake, Observe]\nUnknown Module\nUnknown Module",
    unknownItems: [
      {
        name: "Unknown Module",
        kind: "item",
        quantity: 1,
        reason: "missing",
      },
      {
        name: "Unknown Module",
        kind: "item",
        quantity: 2,
        reason: "missing",
      },
    ],
  });

  assert.equal(calls.length, 1);
  assert.deepEqual((calls[0]?.where as { normalizedName_kind: { normalizedName: string; kind: string } }).normalizedName_kind, {
    normalizedName: "unknown module",
    kind: "ITEM",
  });
  assert.equal((calls[0]?.create as { seenCount: number }).seenCount, 3);
});