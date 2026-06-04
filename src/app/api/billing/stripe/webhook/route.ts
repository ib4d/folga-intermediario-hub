import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Plan, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { writeAuditLogWithClient } from "@/lib/audit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;

type StripeWebhookObject = Record<string, unknown> & {
  metadata?: Record<string, unknown>;
};

type StripeWebhookEvent = {
  id?: unknown;
  type?: unknown;
  data?: {
    object?: StripeWebhookObject;
  };
};

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function normalizePlan(value: unknown): Plan | null {
  if (!isString(value)) return null;
  const candidate = value.trim().toUpperCase();
  return (Object.values(Plan) as string[]).includes(candidate) ? (candidate as Plan) : null;
}

function parseUnixSeconds(value: unknown): Date | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    const date = new Date(value * 1000);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  if (isString(value) && value.trim()) {
    const numeric = Number(value);
    if (!Number.isNaN(numeric)) {
      const date = new Date(numeric * 1000);
      return Number.isNaN(date.getTime()) ? null : date;
    }
  }

  return null;
}

function getMetadataString(metadata: unknown, key: string): string | null {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  if (!isString(value)) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getStripeSignatureParts(signatureHeader: string) {
  const parts = signatureHeader.split(",").reduce<Record<string, string[]>>((acc, part) => {
    const [rawKey, ...rest] = part.split("=");
    const key = rawKey?.trim();
    const value = rest.join("=").trim();
    if (!key || !value) return acc;
    acc[key] ??= [];
    acc[key].push(value);
    return acc;
  }, {});

  const timestamp = Number(parts.t?.[0]);
  const signatures = parts.v1 ?? [];

  if (!Number.isFinite(timestamp) || signatures.length === 0) {
    return null;
  }

  return { timestamp, signatures };
}

function timingSafeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");
  if (leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function verifyStripeSignature(rawBody: string, signatureHeader: string, secret: string) {
  const parsed = getStripeSignatureParts(signatureHeader);
  if (!parsed) return false;

  const ageInSeconds = Math.abs(Date.now() / 1000 - parsed.timestamp);
  if (ageInSeconds > STRIPE_SIGNATURE_TOLERANCE_SECONDS) return false;

  const signedPayload = `${parsed.timestamp}.${rawBody}`;
  const expectedSignature = crypto.createHmac("sha256", secret).update(signedPayload).digest("hex");

  return parsed.signatures.some((candidateSignature) =>
    timingSafeEqualHex(expectedSignature, candidateSignature)
  );
}

function getWebhookObject(event: StripeWebhookEvent) {
  const object = event.data?.object;
  if (!object || typeof object !== "object") return null;
  return object;
}

function getCustomerId(object: StripeWebhookObject) {
  const customer = object.customer;
  if (isString(customer)) return customer;
  if (customer && typeof customer === "object" && isString((customer as Record<string, unknown>).id)) {
    return (customer as Record<string, unknown>).id as string;
  }
  return null;
}

async function persistSubscriptionUpdate(input: {
  organizationId: string;
  plan?: Plan | null;
  status: string;
  providerCustomerId: string | null;
  providerSubscriptionId: string | null;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  action: string;
  eventId: string | null;
  eventType: string;
}) {
  const organization = await prisma.organization.findUnique({
    where: { id: input.organizationId },
    select: { id: true, name: true, plan: true },
  });

  if (!organization) {
    return NextResponse.json(
      { error: "Organizacion no encontrada para sincronizar Stripe." },
      { status: 404 }
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.subscription.upsert({
      where: {
        organizationId: input.organizationId,
      },
      update: {
        plan: input.plan ?? undefined,
        status: input.status,
        provider: "stripe",
        providerCustomerId: input.providerCustomerId ?? undefined,
        providerSubscriptionId: input.providerSubscriptionId ?? undefined,
        currentPeriodStart: input.currentPeriodStart ?? undefined,
        currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      },
      create: {
        organizationId: input.organizationId,
        plan: input.plan ?? organization.plan,
        status: input.status,
        provider: "stripe",
        providerCustomerId: input.providerCustomerId ?? undefined,
        providerSubscriptionId: input.providerSubscriptionId ?? undefined,
        currentPeriodStart: input.currentPeriodStart ?? undefined,
        currentPeriodEnd: input.currentPeriodEnd ?? undefined,
      },
    });

    if (input.plan) {
      await tx.organization.update({
        where: { id: input.organizationId },
        data: { plan: input.plan },
      });
    }

    await writeAuditLogWithClient(tx, {
      organizationId: input.organizationId,
      action: input.action,
      entityType: "Subscription",
      entityId: input.providerSubscriptionId ?? input.organizationId,
      details: {
        eventId: input.eventId,
        eventType: input.eventType,
        plan: input.plan ?? organization.plan,
        status: input.status,
        providerCustomerId: input.providerCustomerId,
        providerSubscriptionId: input.providerSubscriptionId,
      } satisfies Prisma.InputJsonValue,
    });
  });

  return null;
}

async function handleCheckoutSessionCompleted(event: StripeWebhookEvent, rawBody: string) {
  const object = getWebhookObject(event);
  if (!object) {
    return NextResponse.json({ error: "checkout.session.completed sin objeto valido." }, { status: 400 });
  }

  const metadata = object.metadata ?? {};
  const organizationId = getMetadataString(metadata, "organizationId");
  const plan = normalizePlan(getMetadataString(metadata, "plan"));
  const customerId = getCustomerId(object);
  const subscriptionId = isString(object.subscription) ? object.subscription : null;
  const eventId = isString(event.id) ? event.id : null;
  const status = isString(object.status) ? object.status : "completed";

  if (!organizationId || !plan) {
    return NextResponse.json(
      {
        error: "Faltan organizationId o plan en metadata para sincronizar el checkout.",
      },
      { status: 400 }
    );
  }

  const response = await persistSubscriptionUpdate({
    organizationId,
    plan,
    status,
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    action: "BILLING_CHECKOUT_COMPLETED",
    eventId,
    eventType: String(event.type ?? "checkout.session.completed"),
  });

  if (response) return response;

  return NextResponse.json({ received: true, eventType: event.type, rawLength: rawBody.length });
}

async function handleSubscriptionEvent(event: StripeWebhookEvent) {
  const object = getWebhookObject(event);
  if (!object) {
    return NextResponse.json({ error: "Evento de subscription sin objeto valido." }, { status: 400 });
  }

  const metadata = object.metadata ?? {};
  const organizationId = getMetadataString(metadata, "organizationId");
  const metadataPlan = normalizePlan(getMetadataString(metadata, "plan"));
  const plan = event.type === "customer.subscription.deleted" ? Plan.FREE : metadataPlan;
  const providerSubscriptionId = isString(object.id) ? object.id : null;
  const providerCustomerId = getCustomerId(object);
  const status = event.type === "customer.subscription.deleted"
    ? "canceled"
    : isString(object.status)
      ? object.status
      : String(event.type ?? "updated").split(".").pop() ?? "updated";
  const currentPeriodStart = parseUnixSeconds(object.current_period_start);
  const currentPeriodEnd = parseUnixSeconds(object.current_period_end);
  const eventId = isString(event.id) ? event.id : null;

  if (!organizationId) {
    return NextResponse.json(
      { error: "Falta organizationId en metadata de la subscription." },
      { status: 400 }
    );
  }

  const response = await persistSubscriptionUpdate({
    organizationId,
    plan,
    status,
    providerCustomerId,
    providerSubscriptionId,
    currentPeriodStart,
    currentPeriodEnd,
    action:
      event.type === "customer.subscription.deleted"
        ? "BILLING_SUBSCRIPTION_CANCELED"
        : "BILLING_SUBSCRIPTION_UPDATED",
    eventId,
    eventType: String(event.type ?? "customer.subscription.updated"),
  });

  if (response) return response;

  return NextResponse.json({ received: true, eventType: event.type });
}

export async function POST(request: Request) {
  const signatureSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signatureSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret no configurado." },
      { status: 503 }
    );
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Falta la firma de Stripe." }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyStripeSignature(rawBody, signatureHeader, signatureSecret)) {
    return NextResponse.json({ error: "Firma de Stripe invalida." }, { status: 400 });
  }

  let event: StripeWebhookEvent;
  try {
    event = JSON.parse(rawBody) as StripeWebhookEvent;
  } catch {
    return NextResponse.json({ error: "Payload de Stripe invalido." }, { status: 400 });
  }

  switch (String(event.type ?? "")) {
    case "checkout.session.completed":
      return handleCheckoutSessionCompleted(event, rawBody);
    case "customer.subscription.created":
    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      return handleSubscriptionEvent(event);
    default:
      return NextResponse.json({
        received: true,
        ignored: true,
        eventType: event.type ?? "unknown",
      });
  }
}
