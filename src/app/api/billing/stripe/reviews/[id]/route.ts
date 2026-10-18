import { Role, StripeBillingReviewStatus } from "@prisma/client";
import { NextResponse } from "next/server";
import { writeAuditLogWithClient } from "@/lib/audit";
import { canAccessModule } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BODY_BYTES = 2_048;
const MAX_NOTE_LENGTH = 500;

type ReviewAction = "acknowledge" | "close";

function getConfiguredAppOrigin() {
  const configuredUrl = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isAllowedProtocol = url.protocol === "https:" ||
      (process.env.NODE_ENV !== "production" && isLoopback && url.protocol === "http:");
    if (!isAllowedProtocol || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });
}

function parseRequestBody(rawBody: string): { action: ReviewAction; note: string } | null {
  let body: unknown;
  try {
    body = JSON.parse(rawBody);
  } catch {
    return null;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;

  const record = body as Record<string, unknown>;
  if (record.action !== "acknowledge" && record.action !== "close") return null;
  if (typeof record.note !== "string") return null;
  const note = record.note.trim();
  if (!note || note.length > MAX_NOTE_LENGTH) return null;
  return { action: record.action, note };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const tenant = await getCurrentTenant();
  if (!tenant) return jsonError("authentication_required", 401);
  if (!canAccessModule(tenant.role, "billing")) return jsonError("billing_permission_required", 403);
  if (tenant.role !== Role.ADMIN && tenant.role !== Role.SUPERADMIN) {
    return jsonError("billing_review_admin_required", 403);
  }

  const appOrigin = getConfiguredAppOrigin();
  if (!appOrigin || request.headers.get("origin") !== appOrigin) {
    return jsonError("invalid_request_origin", 403);
  }

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonError("billing_review_invalid_request", 400);
  }

  const rawBody = await request.text();
  if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
    return jsonError("billing_review_invalid_request", 400);
  }
  const body = parseRequestBody(rawBody);
  if (!body) return jsonError("billing_review_note_required", 400);

  const { id } = await params;
  if (!id || id.length > 128) return jsonError("billing_review_not_found", 404);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.stripeBillingReview.findFirst({
        where: { id, organizationId: tenant.organizationId },
        select: { id: true, kind: true, providerObjectId: true, reviewStatus: true },
      });
      if (!existing) return { error: "billing_review_not_found" as const };

      const lockKeys = [
        `organization:${tenant.organizationId}`,
        `review:${existing.kind}:${existing.providerObjectId}`,
      ].sort();
      for (const key of lockKeys) {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-billing-map:${key}`}, 0))::text`;
      }

      const current = await tx.stripeBillingReview.findFirst({
        where: { id, organizationId: tenant.organizationId },
        select: { id: true, kind: true, providerObjectId: true, reviewStatus: true },
      });
      if (!current) return { error: "billing_review_not_found" as const };
      if (current.reviewStatus === StripeBillingReviewStatus.CLOSED) {
        return { error: "billing_review_already_closed" as const };
      }

      const reviewStatus = body.action === "close"
        ? StripeBillingReviewStatus.CLOSED
        : StripeBillingReviewStatus.ACKNOWLEDGED;
      const reviewedAt = new Date();
      await tx.stripeBillingReview.update({
        where: { id: current.id },
        data: {
          reviewStatus,
          reviewedAt,
          reviewedById: tenant.userId,
          reviewNote: body.note,
        },
      });

      const auditWritten = await writeAuditLogWithClient(tx, {
        organizationId: tenant.organizationId,
        userId: tenant.userId,
        action: body.action === "close"
          ? "BILLING_FINANCIAL_REVIEW_CLOSED"
          : "BILLING_FINANCIAL_REVIEW_ACKNOWLEDGED",
        entityType: "StripeBillingReview",
        entityId: current.providerObjectId,
        details: {
          kind: current.kind,
          providerObjectId: current.providerObjectId,
          reviewStatus,
          note: body.note,
          reviewedAt: reviewedAt.toISOString(),
        },
      });
      if (!auditWritten) throw new Error("billing_review_audit_unavailable");

      return { reviewStatus, reviewedAt: reviewedAt.toISOString(), note: body.note };
    }, { maxWait: 5_000, timeout: 10_000 });

    if ("error" in result && typeof result.error === "string") {
      return jsonError(result.error, result.error === "billing_review_not_found" ? 404 : 409);
    }

    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.message === "billing_review_audit_unavailable") {
      return jsonError("billing_audit_unavailable", 503);
    }
    console.error("[billing review] manual review update failed", {
      organizationId: tenant.organizationId,
      reviewId: id,
      action: body.action,
      errorType: error instanceof Error ? error.name : "unknown",
    });
    return jsonError("billing_review_update_failed", 503);
  }
}
