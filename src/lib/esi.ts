import "server-only";

import { z } from "zod";

import { env, eveSsoConfigured } from "@/lib/env";

const EVE_SSO_BASE_URL = "https://login.eveonline.com";
const ESI_BASE_URL = "https://esi.evetech.net/latest";
const USER_AGENT = "FitPilotHQ/0.1.0";

const eveTokenSchema = z.object({
  access_token: z.string().min(1),
  expires_in: z.number().int().positive(),
  refresh_token: z.string().min(1),
  token_type: z.string().min(1),
});

const eveVerifyBaseSchema = z.object({
  CharacterID: z.number().int().positive(),
  CharacterName: z.string().min(1),
  ExpiresOn: z.string().min(1),
  OwnerHash: z.string().min(1).optional(),
  CharacterOwnerHash: z.string().min(1).optional(),
  Scopes: z.string().optional().default(""),
});

const eveVerifySchema = eveVerifyBaseSchema.transform(
  (payload: z.infer<typeof eveVerifyBaseSchema>) => ({
  ...payload,
  OwnerHash: payload.OwnerHash ?? payload.CharacterOwnerHash,
  }),
);

const characterSkillsSchema = z.object({
  skills: z.array(
    z.object({
      skill_id: z.number().int().positive(),
      active_skill_level: z.number().int().min(0).max(5),
      trained_skill_level: z.number().int().min(0).max(5),
      skillpoints_in_skill: z.number().int().min(0),
    }),
  ),
  total_sp: z.number().int().min(0),
  unallocated_sp: z.number().int().min(0).optional().default(0),
});

const characterAttributesSchema = z.object({
  intelligence: z.number().int(),
  memory: z.number().int(),
  perception: z.number().int(),
  willpower: z.number().int(),
  charisma: z.number().int(),
  bonus_remaps: z.number().int().optional(),
  accrued_remap_cooldown_date: z.string().datetime().optional(),
});

const characterQueueSchema = z.array(
  z.object({
    queue_position: z.number().int().min(0),
    skill_id: z.number().int().positive(),
    finished_level: z.number().int().min(1).max(5),
    training_start_sp: z.number().int().min(0).optional(),
    level_end_sp: z.number().int().min(0).optional(),
    start_date: z.string().datetime().optional(),
    finish_date: z.string().datetime().optional(),
  }),
);

export class EsiRequestError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: string,
  ) {
    super(message);
    this.name = "EsiRequestError";
  }
}

function requireSsoConfig() {
  if (!eveSsoConfigured) {
    throw new Error("EVE SSO is not configured. Set EVE_CLIENT_ID, EVE_CLIENT_SECRET, and EVE_CALLBACK_URL.");
  }
}

async function parseJsonResponse<T>(response: Response, schema: z.ZodType<T>) {
  if (!response.ok) {
    const body = await response.text();
    throw new EsiRequestError(
      `EVE request failed with status ${response.status}.`,
      response.status,
      body,
    );
  }

  const payload = await response.json();
  return schema.parse(payload);
}

function createBasicAuthHeader() {
  requireSsoConfig();
  const credentials = `${env.EVE_CLIENT_ID}:${env.EVE_CLIENT_SECRET}`;
  return `Basic ${Buffer.from(credentials).toString("base64")}`;
}

export function buildEveAuthorizationUrl(state: string) {
  requireSsoConfig();

  const url = new URL(`${EVE_SSO_BASE_URL}/v2/oauth/authorize`);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("redirect_uri", env.EVE_CALLBACK_URL!);
  url.searchParams.set("client_id", env.EVE_CLIENT_ID!);
  url.searchParams.set("scope", env.EVE_SCOPES);
  url.searchParams.set("state", state);

  return url;
}

export async function exchangeAuthorizationCode(code: string) {
  requireSsoConfig();

  const response = await fetch(`${EVE_SSO_BASE_URL}/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
    }),
    cache: "no-store",
  });

  return parseJsonResponse(response, eveTokenSchema);
}

export async function refreshAccessToken(refreshToken: string) {
  requireSsoConfig();

  const response = await fetch(`${EVE_SSO_BASE_URL}/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: createBasicAuthHeader(),
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
    cache: "no-store",
  });

  return parseJsonResponse(response, eveTokenSchema);
}

export async function verifyAccessToken(accessToken: string) {
  const response = await fetch(`${EVE_SSO_BASE_URL}/oauth/verify`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });

  return parseJsonResponse(response, eveVerifySchema);
}

async function fetchEsi<T>(path: string, accessToken: string, schema: z.ZodType<T>) {
  const response = await fetch(`${ESI_BASE_URL}${path}`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: "application/json",
      "User-Agent": USER_AGENT,
    },
    cache: "no-store",
  });

  return parseJsonResponse(response, schema);
}

export async function fetchCharacterSkills(characterId: bigint, accessToken: string) {
  return fetchEsi(
    `/characters/${characterId.toString()}/skills/`,
    accessToken,
    characterSkillsSchema,
  );
}

export async function fetchCharacterAttributes(
  characterId: bigint,
  accessToken: string,
) {
  return fetchEsi(
    `/characters/${characterId.toString()}/attributes/`,
    accessToken,
    characterAttributesSchema,
  );
}

export async function fetchCharacterSkillQueue(
  characterId: bigint,
  accessToken: string,
) {
  return fetchEsi(
    `/characters/${characterId.toString()}/skillqueue/`,
    accessToken,
    characterQueueSchema,
  );
}
