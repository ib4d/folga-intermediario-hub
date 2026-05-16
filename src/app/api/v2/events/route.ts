import { NextRequest, NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";

/**
 * Platform API v2 - Webhook Subscription
 * Allows external systems to subscribe to ORI CRUIT HUB events.
 */
export async function POST(req: NextRequest) {
  const { apiKey, response } = await authenticateApiKey(req, { rateLimit: 30 });
  if (!apiKey) {
    return response ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const eventType = typeof body?.eventType === "string" ? body.eventType.trim() : "";
  const webhookUrl = typeof body?.webhookUrl === "string" ? body.webhookUrl.trim() : "";

  if (!eventType || !webhookUrl) {
    return NextResponse.json({ error: "Missing eventType or webhookUrl" }, { status: 400 });
  }

  let parsedWebhookUrl: URL;
  try {
    parsedWebhookUrl = new URL(webhookUrl);
  } catch {
    return NextResponse.json({ error: "webhookUrl invalida" }, { status: 400 });
  }

  if (parsedWebhookUrl.protocol !== "https:") {
    return NextResponse.json({ error: "webhookUrl debe usar https" }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    subscriptionId: `sub_${apiKey.organizationId}_${Date.now()}`,
    message: `Subscribed to ${eventType}`,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    version: "2.0.0",
    docs: "https://docs.oricruithub.com/api/v2",
  });
}
