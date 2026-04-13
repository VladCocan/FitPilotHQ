import { NextResponse } from "next/server";

import { getCurrentUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  acceptPendingAlias,
  acceptResolutionCandidate,
  rejectPendingAlias,
  rejectUnknownObservation,
} from "@/lib/reference-data/internal-review";

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
  const action = String(formData.get("action") ?? "");

  try {
    switch (action) {
      case "accept-candidate":
        await acceptResolutionCandidate(prisma, String(formData.get("candidateId") ?? ""));
        return NextResponse.redirect(redirectTo({ message: encodeURIComponent("Candidate accepted.") }));
      case "reject-observation":
        await rejectUnknownObservation(prisma, String(formData.get("observationId") ?? ""));
        return NextResponse.redirect(redirectTo({ message: encodeURIComponent("Observation rejected.") }));
      case "accept-alias":
        await acceptPendingAlias(prisma, String(formData.get("aliasId") ?? ""));
        return NextResponse.redirect(redirectTo({ message: encodeURIComponent("Alias accepted.") }));
      case "reject-alias":
        await rejectPendingAlias(prisma, String(formData.get("aliasId") ?? ""));
        return NextResponse.redirect(redirectTo({ message: encodeURIComponent("Alias rejected.") }));
      default:
        throw new Error("Unknown review action.");
    }
  } catch (error) {
    return NextResponse.redirect(redirectTo({ error: encodeURIComponent(error instanceof Error ? error.message : "Review action failed.") }));
  }
}