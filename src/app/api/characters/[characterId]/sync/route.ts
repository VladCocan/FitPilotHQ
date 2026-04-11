import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { syncCharacterSnapshot } from "@/lib/character-sync";
import { env } from "@/lib/env";

type RouteContext = {
  params: Promise<{
    characterId: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const { characterId } = await context.params;
  const userId = await getCurrentUserId();
  const loginUrl = new URL("/login", env.APP_URL);
  const dashboardUrl = new URL("/dashboard", env.APP_URL);

  if (!userId) {
    loginUrl.searchParams.set("error", "login_required");
    return NextResponse.redirect(loginUrl);
  }

  try {
    await syncCharacterSnapshot(characterId, userId);
    dashboardUrl.searchParams.set("synced", "1");
    return NextResponse.redirect(dashboardUrl);
  } catch (error) {
    const message = error instanceof Error ? error.message : "sync_failed";
    dashboardUrl.searchParams.set("error", message);
    return NextResponse.redirect(dashboardUrl);
  }
}
