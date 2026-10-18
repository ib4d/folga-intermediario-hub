import { NextResponse } from "next/server";

import { processDueStorageDeletionJobs } from "@/lib/storage-deletion-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const summary = await processDueStorageDeletionJobs();
    const hasPending = summary.pending > 0;
    return NextResponse.json(
      { ok: !hasPending, ...summary },
      { status: hasPending ? 503 : 200, headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("[cron:process-storage-deletions] run failed", {
      errorName: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { ok: false, error: "No se pudo procesar la cola de eliminación de archivos." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
