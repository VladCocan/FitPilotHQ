import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import { analyzeFitRequestSchema, createAnalyzeFitResponse } from "@/lib/fits/api-contract";
import { analyzeFitForUserCharacter, FitAnalysisServerError } from "@/lib/fits/analyze-fit-server";

function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: unknown,
) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        details,
      },
    },
    { status },
  );
}

export async function POST(request: Request) {
  const userId = await getCurrentUserId();

  if (!userId) {
    return errorResponse(401, "login_required", "Sign in with EVE before analyzing a fit.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  try {
    const payload = analyzeFitRequestSchema.parse(body);
    const result = await analyzeFitForUserCharacter(
      userId,
      payload.characterId,
      payload.fitText,
      {
        includeDebug: payload.includeDebug,
      },
    );

    return NextResponse.json(createAnalyzeFitResponse(result));
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(422, "invalid_request", "Request validation failed.", error.flatten());
    }

    if (error instanceof FitAnalysisServerError) {
      return errorResponse(error.status, error.code, error.message);
    }

    return errorResponse(500, "fit_analysis_failed", error instanceof Error ? error.message : "Fit analysis failed.");
  }
}