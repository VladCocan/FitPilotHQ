import { normalizeEveName } from "@/lib/fits/normalize";
import type { ItemDefinitionEntry } from "@/lib/fits/types";

const itemNameAliases: Record<string, string> = {
  "core defense field extender i": "core defence field extender i",
};

const itemRequirementOverrides: Record<string, ItemDefinitionEntry> = {};

export function resolveManualItemAliasTarget(name: string) {
  return itemNameAliases[normalizeEveName(name)] ?? null;
}

export function resolveManualItemAlias(name: string) {
  return resolveManualItemAliasTarget(name) ?? normalizeEveName(name);
}

export function resolveManualItemOverride(name: string) {
  return itemRequirementOverrides[normalizeEveName(name)] ?? null;
}