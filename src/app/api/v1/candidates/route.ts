import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

function hashKey(raw: string) {
  return crypto.createHash("sha256").update(raw).digest("hex");
}

async function authenticateApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const rawKey = authHeader.slice(7);
  const keyHash = hashKey(rawKey);

  const apiKey = await prisma.apiKey.findFirst({
    where: {
      keyHash,
      revokedAt: null,
    },
    include: { organization: true },
  });

  if (!apiKey) return null;

  // Update lastUsedAt asynchronously (don't await)
  prisma.apiKey.update({
    where: { id: apiKey.id },
    data: { lastUsedAt: new Date() },
  }).catch(() => {});

  return apiKey;
}

export async function GET(req: NextRequest) {
  const apiKey = await authenticateApiKey(req);
  if (!apiKey) {
    return NextResponse.json({ error: "API key inválida o revocada" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const skip = (page - 1) * limit;

  const [candidates, total] = await Promise.all([
    prisma.candidate.findMany({
      where: { organizationId: apiKey.organizationId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        status: true,
        country: true,
        locationStatus: true,
        passportNumber: true,
        passportExpiry: true,
        createdAt: true,
        updatedAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.candidate.count({ where: { organizationId: apiKey.organizationId } }),
  ]);

  return NextResponse.json({
    data: candidates,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
