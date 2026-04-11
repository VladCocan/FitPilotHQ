import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCurrentUserId } from "@/lib/auth";
import {
  compareFitRequestSchema,
  createCompareFitResponse,
} from "@/lib/fits/api-contract";
import { compareFitForUserCharacters, FitAnalysisServerError } from "@/lib/fits/analyze-fit-server";

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
    return errorResponse(401, "login_required", "Sign in with EVE before comparing a fit.");
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(400, "invalid_json", "Request body must be valid JSON.");
  }

  try {
    const payload = compareFitRequestSchema.parse(body);
    const result = await compareFitForUserCharacters(
      userId,
      payload.characterIds,
      payload.fitText,
      {
        includeDebug: payload.includeDebug,
      },
    );

    return NextResponse.json(createCompareFitResponse(result));
  } catch (error) {
    if (error instanceof ZodError) {
      return errorResponse(422, "invalid_request", "Request validation failed.", error.flatten());
    }

    if (error instanceof FitAnalysisServerError) {
      return errorResponse(error.status, error.code, error.message);
    }

    return errorResponse(500, "fit_compare_failed", error instanceof Error ? error.message : "Fit comparison failed.");
  }
}