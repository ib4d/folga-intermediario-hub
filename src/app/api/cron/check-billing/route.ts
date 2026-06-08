import { NextResponse } from "next/server";

import { syncBillingAutomationNotifications } from "@/lib/billing-automation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const summary = await syncBillingAutomationNotifications();

  return NextResponse.json({
    ok: true,
    ...summary,
  });
}
