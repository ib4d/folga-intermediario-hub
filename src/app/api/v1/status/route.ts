import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { authenticateApiKey } from "@/lib/api-auth";
import { resolveEffectivePlan } from "@/lib/billing/entitlements";

export async function GET(req: NextRequest) {
  const { apiKey, response } = await authenticateApiKey(req);
  if (!apiKey) {
    return response ?? NextResponse.json(
      { error: "No autorizado" },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const org = await prisma.organization.findUnique({
    where: { id: apiKey.organizationId },
    select: {
      name: true,
      plan: true,
      isActive: true,
      subscription: {
        select: {
          plan: true,
          status: true,
          provider: true,
          currentPeriodStart: true,
          currentPeriodEnd: true,
        },
      },
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
      plan: org ? resolveEffectivePlan(org.plan, org.subscription) : undefined,
      isActive: org?.isActive,
      stats: org?._count,
    },
    version: "v1",
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
