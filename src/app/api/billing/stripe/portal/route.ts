import Stripe from "stripe";
import { NextResponse } from "next/server";
import { writeAuditLogOrThrow } from "@/lib/audit";
import { canAccessModule } from "@/lib/permissions";
import { isStripePortalConfigured } from "@/lib/billing/stripe";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getConfiguredAppOrigin() {
  const configuredUrl = process.env.AUTH_URL?.trim() || process.env.NEXTAUTH_URL?.trim();
  if (!configuredUrl) return null;

  try {
    const url = new URL(configuredUrl);
    const isLoopback = ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
    const isSyntheticLoopback =
      process.env.SYNTHETIC_WORKSPACE === "1" &&
      process.env.APP_RELEASE === "synthetic-local" &&
      isLoopback;
    const isAllowedProtocol = url.protocol === "https:" ||
      ((process.env.NODE_ENV !== "production" || isSyntheticLoopback) && isLoopback && url.protocol === "http:");
    if (!isAllowedProtocol || url.username || url.password || url.search || url.hash) return null;
    return url.origin;
  } catch {
    return null;
  }
}

function jsonError(error: string, status: number) {
  return NextResponse.json(
    { error },
    { status, headers: { "Cache-Control": "no-store" } }
  );
}

export async function POST(request: Request) {
  const tenant = await getCurrentTenant();
  if (!tenant) return jsonError("authentication_required", 401);
  if (!canAccessModule(tenant.role, "billing")) return jsonError("billing_permission_required", 403);

  const appOrigin = getConfiguredAppOrigin();
  const requestOrigin = request.headers.get("origin");
  if (!appOrigin || !requestOrigin || requestOrigin !== appOrigin) {
    return jsonError("invalid_request_origin", 403);
  }

  if (!isStripePortalConfigured()) return jsonError("stripe_portal_not_enabled", 503);
  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) return jsonError("stripe_not_configured", 503);

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: tenant.organizationId },
    select: {
      provider: true,
      providerCustomerId: true,
    },
  });
  if (
    subscription?.provider?.toLowerCase() !== "stripe" ||
    !subscription.providerCustomerId
  ) {
    return jsonError("stripe_customer_unavailable", 409);
  }

  const returnUrl = new URL("/billing", appOrigin).toString();
  const stripe = new Stripe(apiKey, { maxNetworkRetries: 1, timeout: 10_000 });

  let portalSession: Stripe.BillingPortal.Session;
  try {
    portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.providerCustomerId,
      return_url: returnUrl,
    });
  } catch (error) {
    console.error("[stripe portal] session creation failed", {
      organizationId: tenant.organizationId,
      errorType: error instanceof Stripe.errors.StripeError ? error.type : "unknown",
      errorCode: error instanceof Stripe.errors.StripeError ? error.code : undefined,
      requestId: error instanceof Stripe.errors.StripeError ? error.requestId : undefined,
    });
    return jsonError("stripe_portal_unavailable", 503);
  }

  let portalUrl: URL;
  try {
    portalUrl = new URL(portalSession.url);
  } catch {
    return jsonError("stripe_portal_unavailable", 502);
  }
  if (portalUrl.protocol !== "https:" || portalUrl.hostname !== "billing.stripe.com") {
    return jsonError("stripe_portal_unavailable", 502);
  }

  try {
    await writeAuditLogOrThrow({
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      action: "BILLING_STRIPE_PORTAL_SESSION_CREATED",
      entityType: "Subscription",
      entityId: subscription.providerCustomerId,
      details: {
        provider: "stripe",
        portalSessionId: portalSession.id,
        returnUrl,
      },
    });
  } catch {
    return jsonError("billing_audit_unavailable", 503);
  }

  return NextResponse.json(
    { url: portalUrl.toString() },
    { headers: { "Cache-Control": "no-store" } }
  );
}
