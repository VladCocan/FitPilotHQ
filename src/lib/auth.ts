import "server-only";

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";

import { env, isProduction } from "@/lib/env";

type CookieDefinition = {
  name: string;
  value: string;
  maxAge: number;
  httpOnly: boolean;
  sameSite: "lax";
  secure: boolean;
  path: string;
};

const SESSION_COOKIE_NAME = isProduction
  ? "__Host-fitpilothq_session"
  : "fitpilothq_session";
const OAUTH_STATE_COOKIE_NAME = isProduction
  ? "__Host-fitpilothq_oauth_state"
  : "fitpilothq_oauth_state";

const cookieBase = {
  httpOnly: true,
  sameSite: "lax" as const,
  secure: env.NODE_ENV === "production",
  path: "/",
};

function signValue(value: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(value).digest("base64url");
}

function encodeSignedValue(value: string) {
  return `${value}.${signValue(value)}`;
}

function decodeSignedValue(rawValue: string | undefined) {
  if (!rawValue) {
    return null;
  }

  const separatorIndex = rawValue.lastIndexOf(".");

  if (separatorIndex <= 0) {
    return null;
  }

  const value = rawValue.slice(0, separatorIndex);
  const signature = rawValue.slice(separatorIndex + 1);
  const expectedSignature = signValue(value);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length) {
    return null;
  }

  if (!timingSafeEqual(received, expected)) {
    return null;
  }

  return value;
}

export async function getCurrentUserId() {
  const cookieStore = await cookies();
  return decodeSignedValue(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}

export function createSessionCookie(userId: string): CookieDefinition {
  return {
    name: SESSION_COOKIE_NAME,
    value: encodeSignedValue(userId),
    maxAge: 60 * 60 * 24 * 30,
    ...cookieBase,
  };
}

export function clearSessionCookie(): CookieDefinition {
  return {
    name: SESSION_COOKIE_NAME,
    value: "",
    maxAge: 0,
    ...cookieBase,
  };
}

export function createOAuthState() {
  return randomBytes(24).toString("hex");
}

export function createOAuthStateCookie(state: string): CookieDefinition {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: encodeSignedValue(state),
    maxAge: 60 * 10,
    ...cookieBase,
  };
}

export function clearOAuthStateCookie(): CookieDefinition {
  return {
    name: OAUTH_STATE_COOKIE_NAME,
    value: "",
    maxAge: 0,
    ...cookieBase,
  };
}

export async function getOAuthState() {
  const cookieStore = await cookies();
  return decodeSignedValue(cookieStore.get(OAUTH_STATE_COOKIE_NAME)?.value);
}
