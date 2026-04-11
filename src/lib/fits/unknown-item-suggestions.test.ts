import assert from "node:assert/strict";
import test from "node:test";

import { benchmarkItemDefinitions } from "@/lib/fits/fixtures/reference-data";
import { suggestUnknownItems } from "@/lib/fits/unknown-item-suggestions";

test("suggestUnknownItems proposes the closest seeded module names", () => {
  const suggestions = suggestUnknownItems(
    [
      {
        name: "Large Shield Extender III",
        kind: "item",
        quantity: 1,
        reason: "No matching item definition was found.",
      },
      {
        name: "Heavy Missile Launcher III",
        kind: "item",
        quantity: 1,
        reason: "No matching item definition was found.",
      },
    ],
    benchmarkItemDefinitions,
  );

  assert.equal(suggestions.length, 2);
  assert.equal(suggestions[0]?.unknownItemName, "Large Shield Extender III");
  assert.equal(suggestions[0]?.suggestions[0]?.name, "Large Shield Extender II");
  assert.equal(suggestions[1]?.unknownItemName, "Heavy Missile Launcher III");
  assert.equal(suggestions[1]?.suggestions[0]?.name, "Heavy Missile Launcher II");
});