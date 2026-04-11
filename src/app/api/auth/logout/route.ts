import { NextResponse } from "next/server";

import { clearOAuthStateCookie, clearSessionCookie } from "@/lib/auth";
import { env } from "@/lib/env";

function redirectTo(pathname: string, params?: Record<string, string>) {
  const url = new URL(pathname, env.APP_URL);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function POST() {
  const response = NextResponse.redirect(
    redirectTo("/login", { logged_out: "1" }),
  );

  response.cookies.set(clearSessionCookie());
  response.cookies.set(clearOAuthStateCookie());

  return response;
}