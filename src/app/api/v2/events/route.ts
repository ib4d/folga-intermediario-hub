import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";

export async function POST(req: NextRequest) {
  const { apiKey, response } = await authenticateApiKey(req, { rateLimit: 30 });
  if (!apiKey) {
    return response ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  return NextResponse.json({
    error: "NOT_IMPLEMENTED",
    message: "Las suscripciones de eventos todavía no están disponibles. No se creó ninguna suscripción.",
  }, { status: 501, headers: { "Cache-Control": "no-store" } });
}

export async function GET() {
  return NextResponse.json({
    error: "NOT_IMPLEMENTED",
    message: "El endpoint de suscripciones de eventos todavía no está disponible.",
  }, { status: 501, headers: { "Cache-Control": "no-store" } });
}
