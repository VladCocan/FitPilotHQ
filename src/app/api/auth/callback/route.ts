import { NextResponse } from "next/server";
import { z } from "zod";

import {
  clearOAuthStateCookie,
  createSessionCookie,
  getCurrentUserId,
  getOAuthState,
} from "@/lib/auth";
import { syncCharacterSnapshot } from "@/lib/character-sync";
import { env } from "@/lib/env";
import {
  exchangeAuthorizationCode,
  verifyAccessToken,
} from "@/lib/esi";
import { prisma } from "@/lib/db";
import { isDevelopment } from "@/lib/env";

function getRequestOrigin(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost ?? request.headers.get("host");

  if (!host) {
    return new URL(request.url).origin;
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = forwardedProto ?? new URL(request.url).protocol.replace(":", "");

  return `${protocol}://${host}`;
}

const callbackParamsSchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
});

function redirectTo(pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, env.APP_URL);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const appUrl = new URL(env.APP_URL);
  const requestOrigin = getRequestOrigin(request);

  if (requestOrigin !== appUrl.origin) {
    const canonicalCallbackUrl = new URL(url.pathname, env.APP_URL);
    canonicalCallbackUrl.search = url.search;
    return NextResponse.redirect(canonicalCallbackUrl);
  }

  const params = callbackParamsSchema.parse(
    Object.fromEntries(url.searchParams.entries()),
  );

  if (params.error) {
    return NextResponse.redirect(
      redirectTo("/login", { error: params.error }),
    );
  }

  const expectedState = await getOAuthState();
  const existingUserId = await getCurrentUserId();

  if (!params.code || !params.state || params.state !== expectedState) {
    console.warn("OAuth state verification failed.", {
      callbackOrigin: requestOrigin,
      expectedStatePresent: Boolean(expectedState),
      receivedStatePresent: Boolean(params.state),
      hasExistingUserSession: Boolean(existingUserId),
    });

    if (isDevelopment && existingUserId) {
      return NextResponse.redirect(redirectTo("/dashboard"));
    }

    const response = NextResponse.redirect(
      redirectTo("/login", { error: "invalid_oauth_state" }),
    );
    response.cookies.set(clearOAuthStateCookie());
    return response;
  }

  try {
    const token = await exchangeAuthorizationCode(params.code);
    const verifiedIdentity = await verifyAccessToken(token.access_token);
    const scopes = verifiedIdentity.Scopes?.split(" ").filter(Boolean) ?? [];

    const user = existingUserId
      ? await prisma.user.update({
          where: { id: existingUserId },
          data: { displayName: verifiedIdentity.CharacterName },
        })
      : await prisma.user.create({
          data: {
            displayName: verifiedIdentity.CharacterName,
          },
        });

    const character = await prisma.character.upsert({
      where: { eveCharacterId: BigInt(verifiedIdentity.CharacterID) },
      update: {
        userId: user.id,
        name: verifiedIdentity.CharacterName,
        ownerHash: verifiedIdentity.OwnerHash ?? undefined,
        esiAccessToken: token.access_token,
        esiRefreshToken: token.refresh_token,
        esiScopes: scopes,
        esiTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
      create: {
        userId: user.id,
        eveCharacterId: BigInt(verifiedIdentity.CharacterID),
        name: verifiedIdentity.CharacterName,
        ownerHash: verifiedIdentity.OwnerHash,
        esiAccessToken: token.access_token,
        esiRefreshToken: token.refresh_token,
        esiScopes: scopes,
        esiTokenExpiresAt: new Date(Date.now() + token.expires_in * 1000),
      },
    });

    await syncCharacterSnapshot(character.id, user.id);

    const response = NextResponse.redirect(
      redirectTo("/dashboard", { synced: "1" }),
    );
    response.cookies.set(clearOAuthStateCookie());
    response.cookies.set(createSessionCookie(user.id));

    return response;
  } catch (error) {
    const response = NextResponse.redirect(
      redirectTo("/login", {
        error: error instanceof Error ? error.message : "auth_callback_failed",
      }),
    );
    response.cookies.set(clearOAuthStateCookie());
    return response;
  }
}
