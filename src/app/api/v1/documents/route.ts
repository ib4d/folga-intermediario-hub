import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";

function parsePositiveInteger(value: string | null, fallback: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: NextRequest) {
  const { apiKey, response } = await authenticateApiKey(req);
  if (!apiKey) {
    return response ?? NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parsePositiveInteger(searchParams.get("page"), 1);
  const limit = Math.min(parsePositiveInteger(searchParams.get("limit"), 50), 100);
  const skip = (page - 1) * limit;

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where: { organizationId: apiKey.organizationId },
      select: {
        id: true,
        type: true,
        number: true,
        issuerCountry: true,
        issueDate: true,
        expiryDate: true,
        isVerified: true,
        ocrStatus: true,
        candidateId: true,
        createdAt: true,
      },
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
    }),
    prisma.document.count({ where: { organizationId: apiKey.organizationId } }),
  ]);

  return NextResponse.json({
    data: documents,
    meta: { total, page, limit, pages: Math.ceil(total / limit) },
  });
}
