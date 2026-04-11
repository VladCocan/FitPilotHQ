import { NextResponse } from "next/server";

import {
  createOAuthState,
  createOAuthStateCookie,
} from "@/lib/auth";
import { env } from "@/lib/env";
import { buildEveAuthorizationUrl } from "@/lib/esi";
import { eveSsoConfigured } from "@/lib/env";

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

export async function GET(request: Request) {
  const appUrl = new URL(env.APP_URL);
  const requestOrigin = getRequestOrigin(request);

  if (requestOrigin !== appUrl.origin) {
    return NextResponse.redirect(new URL("/api/auth/login", env.APP_URL));
  }

  const loginUrl = new URL("/login", env.APP_URL);

  if (!eveSsoConfigured) {
    loginUrl.searchParams.set("error", "sso_not_configured");
    return NextResponse.redirect(loginUrl);
  }

  const state = createOAuthState();
  const response = NextResponse.redirect(buildEveAuthorizationUrl(state));
  response.cookies.set(createOAuthStateCookie(state));

  return response;
}
