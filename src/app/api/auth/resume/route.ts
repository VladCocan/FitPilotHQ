import { NextResponse } from "next/server";
import { notFound } from "next/navigation";

import { createSessionCookie } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { env, isDevelopment } from "@/lib/env";

function redirectTo(pathname: string, request: Request, params?: Record<string, string>) {
  const url = new URL(pathname, env.APP_URL);

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function GET(request: Request) {
  if (!isDevelopment) {
    notFound();
  }

  const character = await prisma.character.findFirst({
    include: {
      user: true,
    },
    orderBy: [
      { lastSyncedAt: "desc" },
      { updatedAt: "desc" },
    ],
  });

  if (!character?.userId) {
    return NextResponse.redirect(
      redirectTo("/login", request, { error: "resume_not_available" }),
    );
  }

  const response = NextResponse.redirect(
    redirectTo("/dashboard", request, { resumed: "1" }),
  );
  response.cookies.set(createSessionCookie(character.userId));

  return response;
}