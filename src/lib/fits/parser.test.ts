import assert from "node:assert/strict";
import test from "node:test";

import { parseEft } from "@/lib/fits/parser";

test("parseEft parses a standard EFT header and ship entry", () => {
  const parsed = parseEft(`[Rifter, Parser Test]\n125mm Gatling AutoCannon I`);

  assert.equal(parsed.shipName, "Rifter");
  assert.equal(parsed.fitName, "Parser Test");
  assert.equal(parsed.entries[0]?.kind, "ship");
  assert.equal(parsed.entries[1]?.name, "125mm Gatling AutoCannon I");
});

test("parseEft ignores empty slot lines and preserves module charges separately", () => {
  const parsed = parseEft(`[Rifter, Charge Test]\n[Empty High slot]\nRocket Launcher I, Caldari Navy Nova Rocket`);

  assert.equal(parsed.entries.length, 3);
  assert.equal(parsed.entries[1]?.name, "Rocket Launcher I");
  assert.equal(parsed.entries[1]?.kind, "item");
  assert.equal(parsed.entries[2]?.name, "Caldari Navy Nova Rocket");
  assert.equal(parsed.entries[2]?.kind, "charge");
});

test("parseEft parses drone quantity suffixes", () => {
  const parsed = parseEft(`[Rifter, Drone Test]\nHobgoblin I x5`);

  assert.equal(parsed.entries[1]?.name, "Hobgoblin I");
  assert.equal(parsed.entries[1]?.kind, "drone");
  assert.equal(parsed.entries[1]?.quantity, 5);
});

test("parseEft rejects invalid headers", () => {
  assert.throws(() => parseEft(`Rifter, Broken Header\nCap Recharger I`), {
    message: "EFT fit header must match [Ship, Fit Name].",
  });
});

test("parseEft records warnings for unsupported non-item lines", () => {
  const parsed = parseEft(`[Rifter, Weird Line Test]\n---\nCap Recharger I`);

  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.warnings.length, 1);
  assert.match(parsed.warnings[0] ?? "", /Ignored unsupported EFT line/);
});

test("parseEft supports ship-only headers and trims CRLF whitespace", () => {
  const parsed = parseEft(`\r\n   [Rifter]   \r\n  Cap Recharger I  \r\n`);

  assert.equal(parsed.shipName, "Rifter");
  assert.equal(parsed.fitName, null);
  assert.equal(parsed.entries.length, 2);
  assert.equal(parsed.entries[1]?.name, "Cap Recharger I");
});

test("parseEft treats zero-quantity suffixes as plain unresolved item text", () => {
  const parsed = parseEft(`[Rifter, Zero Quantity Test]\nHobgoblin I x0`);

  assert.equal(parsed.entries[1]?.name, "Hobgoblin I x0");
  assert.equal(parsed.entries[1]?.kind, "item");
  assert.equal(parsed.entries[1]?.quantity, 1);
});

test("parseEft preserves everything after the first comma as the charge name", () => {
  const parsed = parseEft(`[Rifter, Charge Comma Test]\nRocket Launcher I, Nova Rocket, Extra`);

  assert.equal(parsed.entries[1]?.name, "Rocket Launcher I");
  assert.equal(parsed.entries[2]?.name, "Nova Rocket, Extra");
  assert.equal(parsed.entries[2]?.kind, "charge");
});

test("parseEft rejects blank text after trimming whitespace", () => {
  assert.throws(() => parseEft(` \n\r\n  \t `), {
    message: "EFT fit text is empty.",
  });
});