import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { recoverPendingUnknownItems } from "@/lib/reference-data/recover-unknown-items";

function redirectTo(params?: Record<string, string>) {
  const url = new URL("/admin/reference-data", process.env.APP_URL ?? "http://localhost:3000");

  for (const [key, value] of Object.entries(params ?? {})) {
    url.searchParams.set(key, value);
  }

  return url;
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return NextResponse.redirect(redirectTo({ error: encodeURIComponent("Login required.") }));
  }

  const formData = await request.formData();
  const limit = Number.parseInt(String(formData.get("limit") ?? "10"), 10);

  try {
    const summary = await recoverPendingUnknownItems(prisma, {
      limit: Number.isFinite(limit) && limit > 0 ? limit : 10,
    });

    return NextResponse.redirect(redirectTo({ message: encodeURIComponent(`Processed ${summary.processed} observations; accepted ${summary.aliasesAccepted} aliases.`) }));
  } catch (error) {
    return NextResponse.redirect(redirectTo({ error: encodeURIComponent(error instanceof Error ? error.message : "Recovery failed.") }));
  }
}