import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;

  const rawKey = authHeader.slice(7);
  const keyHash = hashKey(rawKey);
  const apiKey = await prisma.apiKey.findFirst({ where: { keyHash, revokedAt: null } });
  if (!apiKey) return null;

  prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } }).catch(() => {});
  return apiKey;
}

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "API key invalida o revocada" }, { status: 401 });
  }

  const org = await prisma.organization.findUnique({
    where: { id: apiKey.organizationId },
    select: {
      name: true,
      plan: true,
      isActive: true,
      _count: {
        select: {
          candidates: true,
          documents: true,
          memberships: true,
        },
      },
    },
  });

  return NextResponse.json({
    status: "ok",
    organization: {
      name: org?.name,
      plan: org?.plan,
      isActive: org?.isActive,
      stats: org?._count,
    },
    version: "v1",
    timestamp: new Date().toISOString(),
  });
}
