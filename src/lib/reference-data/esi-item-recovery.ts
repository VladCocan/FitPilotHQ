import { z } from "zod";

import { normalizeEveName } from "@/lib/fits/normalize";

const ESI_BASE_URL = "https://esi.evetech.net/latest";
const USER_AGENT = "FitPilotHQ/0.1.0";

const universeIdsSchema = z.object({
  inventory_types: z.array(
    z.object({
      id: z.number().int().positive(),
      name: z.string().min(1),
    }),
  ).optional().default([]),
});

const universeTypeSchema = z.object({
  name: z.string().min(1),
  group_id: z.number().int().positive(),
  published: z.boolean().optional().default(true),
});

const universeGroupSchema = z.object({
  category_id: z.number().int().positive(),
  name: z.string().min(1),
});

const universeCategorySchema = z.object({
  name: z.string().min(1),
});

export type EsiRecoveredType = {
  typeId: number;
  name: string;
  normalizedName: string;
  groupName?: string | null;
  categoryName?: string | null;
  published: boolean;
};

export type EsiItemRecoveryClient = {
  resolveTypeCandidates(names: string[]): Promise<EsiRecoveredType[]>;
};

async function parseJson<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) {
    throw new Error(`ESI request failed with status ${response.status}.`);
  }

  return schema.parse(await response.json());
}

export function createEsiItemRecoveryClient(): EsiItemRecoveryClient {
  return {
    async resolveTypeCandidates(names: string[]) {
      const uniqueNames = [...new Set(names.map((name) => name.trim()).filter(Boolean))];

      if (uniqueNames.length === 0) {
        return [];
      }

      const idsResponse = await fetch(`${ESI_BASE_URL}/universe/ids/`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": USER_AGENT,
        },
        body: JSON.stringify(uniqueNames),
        cache: "no-store",
      });
      const idsPayload = await parseJson(idsResponse, universeIdsSchema);
      const inventoryTypes = idsPayload.inventory_types ?? [];
      const candidates: EsiRecoveredType[] = [];

      for (const inventoryType of inventoryTypes) {
        const typeResponse = await fetch(`${ESI_BASE_URL}/universe/types/${inventoryType.id}/`, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          cache: "no-store",
        });
        const typePayload = await parseJson(typeResponse, universeTypeSchema);
        const groupResponse = await fetch(`${ESI_BASE_URL}/universe/groups/${typePayload.group_id}/`, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          cache: "no-store",
        });
        const groupPayload = await parseJson(groupResponse, universeGroupSchema);
        const categoryResponse = await fetch(`${ESI_BASE_URL}/universe/categories/${groupPayload.category_id}/`, {
          headers: {
            Accept: "application/json",
            "User-Agent": USER_AGENT,
          },
          cache: "no-store",
        });
        const categoryPayload = await parseJson(categoryResponse, universeCategorySchema);

        candidates.push({
          typeId: inventoryType.id,
          name: typePayload.name,
          normalizedName: normalizeEveName(typePayload.name),
          groupName: groupPayload.name,
          categoryName: categoryPayload.name,
          published: typePayload.published ?? true,
        });
      }

      return candidates.sort((left, right) => left.name.localeCompare(right.name));
    },
  };
}