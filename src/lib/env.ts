import "server-only";

import { z } from "zod";

const DEFAULT_SESSION_SECRET = "fitpilothq-local-session-secret-change-me";

const emptyStringToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
};

const serverEnvSchema = z.object({
  DATABASE_URL: z.string().url(),
  APP_URL: z.string().url().default("http://localhost:3000"),
  EVE_CLIENT_ID: z.preprocess(emptyStringToUndefined, z.string().optional()),
  EVE_CLIENT_SECRET: z.preprocess(
    emptyStringToUndefined,
    z.string().optional(),
  ),
  EVE_CALLBACK_URL: z.preprocess(
    emptyStringToUndefined,
    z.string().url().optional(),
  ),
  EVE_SCOPES: z
    .string()
    .default("esi-skills.read_skills.v1 esi-skills.read_skillqueue.v1"),
  SESSION_SECRET: z
    .string()
    .min(16)
    .default(DEFAULT_SESSION_SECRET),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
}).superRefine((value, context) => {
  if (value.NODE_ENV !== "production") {
    return;
  }

  const appUrl = new URL(value.APP_URL);
  const callbackUrl = value.EVE_CALLBACK_URL ? new URL(value.EVE_CALLBACK_URL) : null;

  if (appUrl.protocol !== "https:") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["APP_URL"],
      message: "APP_URL must use https in production.",
    });
  }

  if (callbackUrl && callbackUrl.protocol !== "https:") {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EVE_CALLBACK_URL"],
      message: "EVE_CALLBACK_URL must use https in production.",
    });
  }

  if (callbackUrl && callbackUrl.origin !== appUrl.origin) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["EVE_CALLBACK_URL"],
      message: "EVE_CALLBACK_URL must share the same origin as APP_URL in production.",
    });
  }

  if (value.SESSION_SECRET === DEFAULT_SESSION_SECRET) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["SESSION_SECRET"],
      message: "SESSION_SECRET must be replaced with a strong unique value in production.",
    });
  }
});

export const env = serverEnvSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  APP_URL: process.env.APP_URL,
  EVE_CLIENT_ID: process.env.EVE_CLIENT_ID,
  EVE_CLIENT_SECRET: process.env.EVE_CLIENT_SECRET,
  EVE_CALLBACK_URL: process.env.EVE_CALLBACK_URL,
  EVE_SCOPES: process.env.EVE_SCOPES,
  SESSION_SECRET: process.env.SESSION_SECRET,
  NODE_ENV: process.env.NODE_ENV,
});

export const eveSsoConfigured = Boolean(
  env.EVE_CLIENT_ID && env.EVE_CLIENT_SECRET && env.EVE_CALLBACK_URL,
);

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const defaultSessionSecret = DEFAULT_SESSION_SECRET;

