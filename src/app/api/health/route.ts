import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;

    return Response.json({
      status: "ok",
      database: "connected",
      service: "fitpilothq",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return Response.json(
      {
        status: "error",
        database: "disconnected",
        service: "fitpilothq",
        message:
          error instanceof Error ? error.message : "Database connection failed.",
      },
      { status: 503 },
    );
  }
}
