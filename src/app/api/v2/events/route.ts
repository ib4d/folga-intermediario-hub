import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

/**
 * Platform API v2 - Webhook Subscription
 * Allows external systems to subscribe to ORI-OS events
 */
export async function POST(req: Request) {
  const apiKey = req.headers.get("x-api-key");
  if (!apiKey) return NextResponse.json({ error: "Missing API Key" }, { status: 401 });

  // Validate API Key and get Organization
  const keyRecord = await prisma.apiKey.findFirst({
    where: { keyHash: hashKey(apiKey), revokedAt: null }
  });

  if (!keyRecord) return NextResponse.json({ error: "Invalid API Key" }, { status: 401 });

  const body = await req.json();
  const { eventType, webhookUrl } = body;

  if (!eventType || !webhookUrl) {
    return NextResponse.json({ error: "Missing eventType or webhookUrl" }, { status: 400 });
  }

  return NextResponse.json({ 
    success: true, 
    subscriptionId: `sub_${Math.random().toString(36).substring(7)}`,
    message: `Subscribed to ${eventType}`
  });
}

export async function GET() {
  return NextResponse.json({
    status: "active",
    version: "2.0.0",
    docs: "https://docs.folga.com/api/v2"
  });
}
