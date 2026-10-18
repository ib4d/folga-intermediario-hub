import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  try {
    const [signups, rateLimitBucketsDeleted] = await prisma.$transaction([
      prisma.pendingOrganizationSignup.deleteMany({
        where: { expiresAt: { lte: new Date() } },
      }),
      prisma.$executeRaw`
        DELETE FROM "RequestRateLimitBucket"
        WHERE "resetAt" <= NOW()
      `,
    ]);
    return NextResponse.json(
      { ok: true, deleted: signups.count, rateLimitBucketsDeleted },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("[cron:cleanup-expired-organization-signups] failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "No se pudieron limpiar las solicitudes de alta vencidas." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
