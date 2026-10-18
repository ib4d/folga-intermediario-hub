import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { Plan, Prisma, StripeBillingIncidentStatus, StripeBillingReviewKind, StripeBillingReviewStatus } from "@prisma/client";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { writeAuditLogWithClient } from "@/lib/audit";
import { normalizeLanguage, t, type TranslationKey } from "@/lib/i18n";
import { getConfiguredStripeMode } from "@/lib/billing/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STRIPE_SIGNATURE_TOLERANCE_SECONDS = 300;
const MAX_STRIPE_WEBHOOK_BODY_BYTES = 1024 * 1024;

type StripeWebhookObject = Record<string, unknown> & {
  metadata?: Record<string, unknown>;
};

type StripeWebhookEvent = {
  id: string;
  type: string;
  livemode: boolean;
  created?: number;
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

async function readBoundedBody(request: Request, maxBytes: number): Promise<string | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) return null;

  if (!request.body) return "";

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;
      if (totalBytes > maxBytes) {
        await reader.cancel();
        return null;
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bodyBytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bodyBytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder().decode(bodyBytes);
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

function getObjectId(value: unknown) {
  if (isString(value) && value.trim()) return value.trim();
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const id = (value as Record<string, unknown>).id;
    if (isString(id) && id.trim()) return id.trim();
  }
  return null;
}

async function lockStripeBillingMappings(tx: Prisma.TransactionClient, keys: Array<string | null>) {
  for (const key of [...new Set(keys.filter((value): value is string => Boolean(value)))].sort()) {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-billing-map:${key}`}, 0))::text`;
  }
}

async function notifyBillingAdmins(
  tx: Prisma.TransactionClient,
  organizationId: string,
  titleKey: TranslationKey,
) {
  const recipients = await tx.membership.findMany({
    where: {
      organizationId,
      isActive: true,
      role: { in: ["ADMIN", "SUPERADMIN"] },
      user: { isActive: true },
    },
    select: { userId: true, user: { select: { settings: true } } },
  });

  if (recipients.length > 0) {
    await tx.notification.createMany({
      data: recipients.map((recipient) => {
        const settings = recipient.user.settings;
        const preferredLanguage = settings && typeof settings === "object" && !Array.isArray(settings)
          ? (settings as Prisma.JsonObject).interfaceLanguage
          : undefined;
        const language = normalizeLanguage(preferredLanguage);
        return {
          userId: recipient.userId,
          organizationId,
          type: "BILLING_SUBSCRIPTION_ATTENTION",
          title: t(language, titleKey),
          message: t(language, "billing.invoiceIncidentNotificationMessage"),
        };
      }),
    });
  }

  return recipients.length;
}

async function retrieveStripeBillingReviewResource(stripe: Stripe, kind: StripeBillingReviewKind, id: string) {
  if (kind === StripeBillingReviewKind.REFUND) return await stripe.refunds.retrieve(id);
  if (kind === StripeBillingReviewKind.DISPUTE) return await stripe.disputes.retrieve(id);
  return await stripe.radar.earlyFraudWarnings.retrieve(id);
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
  eventId: string;
  eventType: string;
  checkoutSessionId?: string | null;
  eventCreatedAt?: Date | null;
}) {
  const duplicate = await prisma.$transaction(async (tx) => {
    const mappingLocks = [
      input.providerSubscriptionId ? `subscription:${input.providerSubscriptionId}` : null,
      input.providerCustomerId ? `customer:${input.providerCustomerId}` : null,
      input.checkoutSessionId ? `checkout-session:${input.checkoutSessionId}` : null,
      `organization:${input.organizationId}`,
    ];
    await lockStripeBillingMappings(tx, mappingLocks);

    const organization = await tx.organization.findUnique({
      where: { id: input.organizationId },
      select: { id: true, name: true, plan: true },
    });

    if (!organization) throw new Error("STRIPE_ORGANIZATION_NOT_FOUND");

    const inserted = await tx.$executeRaw`
      INSERT INTO "StripeWebhookEvent" ("id", "type", "processedAt")
      VALUES (${input.eventId}, ${input.eventType}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `;
    if (inserted === 0) return true;

    const organizationSubscription = await tx.subscription.findUnique({
      where: { organizationId: input.organizationId },
      select: {
        provider: true,
        providerCustomerId: true,
        providerSubscriptionId: true,
      },
    });
    const conflictingSubscription = input.providerSubscriptionId
      ? await tx.subscription.findFirst({
          where: { provider: "stripe", providerSubscriptionId: input.providerSubscriptionId },
          select: { organizationId: true },
        })
      : null;
    const conflictingCustomer = input.providerCustomerId
      ? await tx.subscription.findFirst({
          where: { provider: "stripe", providerCustomerId: input.providerCustomerId },
          select: { organizationId: true },
        })
      : null;

    if (
      (organizationSubscription?.provider && organizationSubscription.provider.toLowerCase() !== "stripe") ||
      (organizationSubscription?.providerSubscriptionId &&
        input.providerSubscriptionId &&
        organizationSubscription.providerSubscriptionId !== input.providerSubscriptionId) ||
      (organizationSubscription?.providerCustomerId &&
        input.providerCustomerId &&
        organizationSubscription.providerCustomerId !== input.providerCustomerId) ||
      (conflictingSubscription && conflictingSubscription.organizationId !== input.organizationId) ||
      (conflictingCustomer && conflictingCustomer.organizationId !== input.organizationId)
    ) {
      throw new Error("STRIPE_MAPPING_CONFLICT");
    }

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

    const auditWritten = await writeAuditLogWithClient(tx, {
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
    if (!auditWritten) throw new Error("STRIPE_SUBSCRIPTION_AUDIT_FAILED");

    if (input.checkoutSessionId) {
      if (!input.eventCreatedAt) throw new Error("STRIPE_CHECKOUT_EVENT_TIMESTAMP_MISSING");
      const incident = await tx.stripeBillingIncident.findUnique({
        where: { checkoutSessionId: input.checkoutSessionId },
        select: { id: true, status: true },
      });
      if (incident?.status === StripeBillingIncidentStatus.OPEN) {
        await tx.stripeBillingIncident.update({
          where: { checkoutSessionId: input.checkoutSessionId },
          data: {
            status: StripeBillingIncidentStatus.RECOVERED,
            providerSubscriptionId: input.providerSubscriptionId,
            lastEventId: input.eventId,
            lastEventType: input.eventType,
            lastEventCreatedAt: input.eventCreatedAt,
          },
        });
        const recoveryAuditWritten = await writeAuditLogWithClient(tx, {
          organizationId: input.organizationId,
          action: "BILLING_CHECKOUT_PAYMENT_RECOVERED",
          entityType: "StripeBillingIncident",
          entityId: input.checkoutSessionId,
          details: {
            eventId: input.eventId,
            eventType: input.eventType,
            checkoutSessionId: input.checkoutSessionId,
            providerSubscriptionId: input.providerSubscriptionId,
            status: StripeBillingIncidentStatus.RECOVERED,
          } satisfies Prisma.InputJsonValue,
        });
        if (!recoveryAuditWritten) throw new Error("STRIPE_CHECKOUT_RECOVERY_AUDIT_FAILED");
        await notifyBillingAdmins(tx, input.organizationId, "billing.checkoutAsyncPaymentRecovered");
      }
    }

    return false;
  });

  if (duplicate) {
    return NextResponse.json({ received: true, duplicate: true, eventType: input.eventType });
  }

  return null;
}

async function handleCheckoutSessionCompleted(event: StripeWebhookEvent) {
  const object = getWebhookObject(event);
  if (!object) {
    return NextResponse.json({ error: "Checkout session sin objeto valido." }, { status: 400 });
  }

  const paymentStatus = object.payment_status;
  if (paymentStatus !== "paid" && paymentStatus !== "no_payment_required") {
    return NextResponse.json({ received: true, pendingPayment: true, eventType: event.type });
  }

  const metadata = object.metadata ?? {};
  const organizationId = getMetadataString(metadata, "organizationId");
  const plan = normalizePlan(getMetadataString(metadata, "plan"));
  const customerId = getCustomerId(object);
  const subscriptionId = getInvoiceSubscriptionId(object);
  const eventId = event.id;

  if (object.mode !== "subscription" || !subscriptionId || !organizationId || !plan) {
    return NextResponse.json(
      {
        error: "El checkout pagado requiere modo subscription, IDs de subscription y metadata organizationId/plan.",
      },
      { status: 400 }
    );
  }

  const existingStripeMapping = await prisma.subscription.findFirst({
    where: { provider: "stripe", providerSubscriptionId: subscriptionId },
    select: { organizationId: true, status: true },
  });
  if (existingStripeMapping && existingStripeMapping.organizationId !== organizationId) {
    console.error("[stripe webhook] checkout subscription is already linked to another organization", {
      eventId,
      organizationId,
      subscriptionId,
    });
    return NextResponse.json({ error: "La suscripcion ya esta asociada a otra organizacion." }, { status: 409 });
  }

  const response = await persistSubscriptionUpdate({
    organizationId,
    plan,
    status: existingStripeMapping?.status ?? "incomplete",
    providerCustomerId: customerId,
    providerSubscriptionId: subscriptionId,
    currentPeriodStart: null,
    currentPeriodEnd: null,
    action: "BILLING_CHECKOUT_COMPLETED",
    eventId,
    eventType: event.type,
    checkoutSessionId: event.type === "checkout.session.async_payment_succeeded" && isString(object.id)
      ? object.id
      : null,
    eventCreatedAt: parseUnixSeconds(event.created),
  });

  if (response) return response;

  return NextResponse.json({ received: true, eventType: event.type });
}

async function handleCheckoutAsyncPaymentFailed(event: StripeWebhookEvent) {
  const object = getWebhookObject(event);
  const checkoutSessionId = object && isString(object.id) ? object.id : null;
  const createdAt = parseUnixSeconds(event.created);
  const eventMetadata = object?.metadata ?? {};
  const eventOrganizationId = getMetadataString(eventMetadata, "organizationId");
  const eventPlan = normalizePlan(getMetadataString(eventMetadata, "plan"));
  const eventCustomerId = object ? getCustomerId(object) : null;
  const eventSubscriptionId = object ? getInvoiceSubscriptionId(object) : null;

  if (
    !object ||
    !checkoutSessionId ||
    !createdAt ||
    object.mode !== "subscription" ||
    !eventOrganizationId ||
    !eventPlan
  ) {
    return NextResponse.json({ error: "Evento de Checkout diferido sin datos de subscription validos." }, { status: 400 });
  }

  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Stripe API key no configurada para reconciliar Checkout." }, { status: 503 });
  }
  const stripe = new Stripe(apiKey, { maxNetworkRetries: 0, timeout: 5_000 });

  const result = await prisma.$transaction(async (tx) => {
    await lockStripeBillingMappings(tx, [
      `checkout-session:${checkoutSessionId}`,
      eventSubscriptionId ? `subscription:${eventSubscriptionId}` : null,
      eventCustomerId ? `customer:${eventCustomerId}` : null,
      eventOrganizationId ? `organization:${eventOrganizationId}` : null,
    ]);

    const inserted = await tx.$executeRaw`
      INSERT INTO "StripeWebhookEvent" ("id", "type", "processedAt")
      VALUES (${event.id}, ${event.type}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `;
    if (inserted === 0) {
      return { duplicate: true, changed: false, organizationId: eventOrganizationId, recipientCount: 0, status: null };
    }

    // Checkout events can be delivered after a later payment update. Read the
    // current session under the same lock used by the success handler.
    const latestSession = await stripe.checkout.sessions.retrieve(checkoutSessionId);
    const latestObject = latestSession as unknown as StripeWebhookObject;
    const organizationId = getMetadataString(latestObject.metadata, "organizationId");
    const plan = normalizePlan(getMetadataString(latestObject.metadata, "plan"));
    const customerId = getCustomerId(latestObject);
    const subscriptionId = getInvoiceSubscriptionId(latestObject);
    if (
      latestObject.mode !== "subscription" ||
      !organizationId ||
      !plan ||
      organizationId !== eventOrganizationId ||
      plan !== eventPlan ||
      subscriptionId !== eventSubscriptionId ||
      customerId !== eventCustomerId
    ) {
      throw new Error("STRIPE_CHECKOUT_MAPPING_NOT_FOUND");
    }

    const organization = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { id: true },
    });
    if (!organization) throw new Error("STRIPE_ORGANIZATION_NOT_FOUND");

    const organizationSubscription = await tx.subscription.findUnique({
      where: { organizationId },
      select: { provider: true, providerCustomerId: true, providerSubscriptionId: true },
    });
    const conflictingSubscription = subscriptionId
      ? await tx.subscription.findFirst({
          where: { provider: "stripe", providerSubscriptionId: subscriptionId },
          select: { organizationId: true },
        })
      : null;
    const conflictingCustomer = customerId
      ? await tx.subscription.findFirst({
          where: { provider: "stripe", providerCustomerId: customerId },
          select: { organizationId: true },
        })
      : null;
    if (
      (organizationSubscription?.provider && organizationSubscription.provider.toLowerCase() !== "stripe") ||
      (organizationSubscription?.providerSubscriptionId && subscriptionId && organizationSubscription.providerSubscriptionId !== subscriptionId) ||
      (organizationSubscription?.providerCustomerId && customerId && organizationSubscription.providerCustomerId !== customerId) ||
      (conflictingSubscription && conflictingSubscription.organizationId !== organizationId) ||
      (conflictingCustomer && conflictingCustomer.organizationId !== organizationId)
    ) {
      throw new Error("STRIPE_MAPPING_CONFLICT");
    }

    const current = await tx.stripeBillingIncident.findUnique({
      where: { checkoutSessionId },
      select: { id: true, status: true },
    });
    const paid = latestSession.payment_status === "paid" || latestSession.payment_status === "no_payment_required";
    if (paid && !current) {
      return { duplicate: false, changed: false, organizationId, recipientCount: 0, status: StripeBillingIncidentStatus.RECOVERED };
    }

    const status = paid ? StripeBillingIncidentStatus.RECOVERED : StripeBillingIncidentStatus.OPEN;
    if (current?.status === status) {
      return { duplicate: false, changed: false, organizationId, recipientCount: 0, status };
    }
    const update = {
      organizationId,
      providerSubscriptionId: subscriptionId,
      status,
      lastEventId: event.id,
      lastEventType: event.type,
      lastEventCreatedAt: createdAt,
    };
    await tx.stripeBillingIncident.upsert({
      where: { checkoutSessionId },
      update,
      create: { checkoutSessionId, invoiceId: null, ...update },
    });

    const auditWritten = await writeAuditLogWithClient(tx, {
      organizationId,
      action: status === StripeBillingIncidentStatus.OPEN
        ? "BILLING_CHECKOUT_PAYMENT_ATTENTION"
        : "BILLING_CHECKOUT_PAYMENT_RECOVERED",
      entityType: "StripeBillingIncident",
      entityId: checkoutSessionId,
      details: {
        eventId: event.id,
        eventType: event.type,
        checkoutSessionId,
        providerSubscriptionId: subscriptionId,
        status,
        stripePaymentStatus: latestSession.payment_status,
      } satisfies Prisma.InputJsonValue,
    });
    if (!auditWritten) throw new Error("STRIPE_CHECKOUT_INCIDENT_AUDIT_FAILED");

    const recipientCount = await notifyBillingAdmins(
      tx,
      organizationId,
      status === StripeBillingIncidentStatus.OPEN
        ? "billing.checkoutAsyncPaymentFailed"
        : "billing.checkoutAsyncPaymentRecovered",
    );
    return { duplicate: false, changed: true, organizationId, recipientCount, status };
  }, { maxWait: 5_000, timeout: 9_000 });

  if (result.changed && result.recipientCount === 0) {
    console.error("[stripe webhook] Checkout incident has no active tenant billing administrators", {
      eventId: event.id,
      eventType: event.type,
      organizationId: result.organizationId,
      checkoutSessionId,
    });
  }

  return NextResponse.json({
    received: true,
    duplicate: result.duplicate,
    incidentUpdated: result.changed,
    currentStatus: result.status,
    eventType: event.type,
  });
}

async function handleStripeBillingReviewEvent(event: StripeWebhookEvent) {
  const object = getWebhookObject(event);
  const providerObjectId = object && isString(object.id) ? object.id : null;
  const createdAt = parseUnixSeconds(event.created);
  const kind = event.type.startsWith("refund.")
    ? StripeBillingReviewKind.REFUND
    : event.type.startsWith("charge.dispute.")
      ? StripeBillingReviewKind.DISPUTE
      : event.type.startsWith("radar.early_fraud_warning.")
        ? StripeBillingReviewKind.EARLY_FRAUD_WARNING
        : null;

  if (!object || !providerObjectId || !createdAt || !kind) {
    return NextResponse.json({ error: "Evento de revisión financiera sin datos validos." }, { status: 400 });
  }

  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Stripe API key no configurada para revisar el recurso." }, { status: 503 });
  }
  const stripe = new Stripe(apiKey, { maxNetworkRetries: 0, timeout: 5_000 });
  const latestResource = await retrieveStripeBillingReviewResource(stripe, kind, providerObjectId);
  const latestObject = latestResource as unknown as StripeWebhookObject;
  const chargeId = getObjectId(latestObject.charge) ?? getObjectId(object.charge);
  const paymentIntentId = getObjectId(latestObject.payment_intent) ?? getObjectId(object.payment_intent);
  const charge = chargeId ? await stripe.charges.retrieve(chargeId) : null;
  const chargeCustomerId = charge ? getCustomerId(charge as unknown as StripeWebhookObject) : null;
  const paymentIntent = !chargeCustomerId && paymentIntentId
    ? await stripe.paymentIntents.retrieve(paymentIntentId)
    : null;
  const customerId = chargeCustomerId ?? (paymentIntent
    ? getCustomerId(paymentIntent as unknown as StripeWebhookObject)
    : null);

  if (!customerId) throw new Error("STRIPE_BILLING_REVIEW_MAPPING_NOT_FOUND");

  const result = await prisma.$transaction(async (tx) => {
    await lockStripeBillingMappings(tx, [`customer:${customerId}`]);
    const subscriptions = await tx.subscription.findMany({
      where: { provider: "stripe", providerCustomerId: customerId },
      select: { organizationId: true },
      take: 2,
    });
    if (subscriptions.length !== 1) throw new Error("STRIPE_BILLING_REVIEW_MAPPING_NOT_FOUND");
    const organizationId = subscriptions[0].organizationId;
    await lockStripeBillingMappings(tx, [
      `organization:${organizationId}`,
      `review:${kind}:${providerObjectId}`,
    ]);

    const inserted = await tx.$executeRaw`
      INSERT INTO "StripeWebhookEvent" ("id", "type", "processedAt")
      VALUES (${event.id}, ${event.type}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `;
    if (inserted === 0) {
      return { duplicate: true, changed: false, organizationId, recipientCount: 0 };
    }

    // Read the provider resource again while holding its local lock. The review
    // queue is observational; out-of-order deliveries must still show current state.
    const currentResource = await retrieveStripeBillingReviewResource(stripe, kind, providerObjectId);
    const currentObject = currentResource as unknown as StripeWebhookObject;
    const currentChargeId = getObjectId(currentObject.charge);
    if (currentChargeId !== chargeId) {
      throw new Error("STRIPE_BILLING_REVIEW_RESOURCE_CONFLICT");
    }
    const resourceStatus = isString(currentObject.status) ? currentObject.status : null;
    const actionable = typeof currentObject.actionable === "boolean" ? currentObject.actionable : null;
    const evidenceDetails = currentObject.evidence_details;
    const actionDueAt = evidenceDetails && typeof evidenceDetails === "object" && !Array.isArray(evidenceDetails)
      ? parseUnixSeconds((evidenceDetails as Record<string, unknown>).due_by)
      : null;

    const current = await tx.stripeBillingReview.findUnique({
      where: { providerObjectId },
      select: {
        id: true,
        kind: true,
        resourceStatus: true,
        actionable: true,
        actionDueAt: true,
      },
    });
    if (current && current.kind !== kind) {
      throw new Error("STRIPE_BILLING_REVIEW_RESOURCE_CONFLICT");
    }
    const changed = !current ||
      current.resourceStatus !== resourceStatus ||
      current.actionable !== actionable ||
      current.actionDueAt?.getTime() !== actionDueAt?.getTime();

    await tx.stripeBillingReview.upsert({
      where: { providerObjectId },
      update: {
        organizationId,
        providerChargeId: chargeId,
        resourceStatus,
        actionable,
        actionDueAt,
        ...(changed ? {
          reviewStatus: StripeBillingReviewStatus.OPEN,
          reviewedAt: null,
          reviewedById: null,
          reviewNote: null,
        } : {}),
        lastEventId: event.id,
        lastEventType: event.type,
        lastEventCreatedAt: createdAt,
      },
      create: {
        organizationId,
        kind,
        providerObjectId,
        providerChargeId: chargeId,
        resourceStatus,
        actionable,
        actionDueAt,
        lastEventId: event.id,
        lastEventType: event.type,
        lastEventCreatedAt: createdAt,
      },
    });

    const auditWritten = await writeAuditLogWithClient(tx, {
      organizationId,
      action: "BILLING_FINANCIAL_REVIEW_SIGNAL",
      entityType: "StripeBillingReview",
      entityId: providerObjectId,
      details: {
        eventId: event.id,
        eventType: event.type,
        kind,
        providerObjectId,
        providerChargeId: chargeId,
        resourceStatus,
        actionable,
        actionDueAt: actionDueAt?.toISOString() ?? null,
      } satisfies Prisma.InputJsonValue,
    });
    if (!auditWritten) throw new Error("STRIPE_BILLING_REVIEW_AUDIT_FAILED");

    const titleKey = kind === StripeBillingReviewKind.REFUND
      ? "billing.reviewRefundTitle"
      : kind === StripeBillingReviewKind.DISPUTE
        ? "billing.reviewDisputeTitle"
        : "billing.reviewFraudTitle";
    const recipientCount = changed
      ? await notifyBillingAdmins(tx, organizationId, titleKey)
      : 0;
    return { duplicate: false, changed, organizationId, recipientCount };
  }, { maxWait: 5_000, timeout: 10_000 });

  if (result.changed && result.recipientCount === 0) {
    console.error("[stripe webhook] financial review has no active tenant billing administrators", {
      eventId: event.id,
      eventType: event.type,
      organizationId: result.organizationId,
      providerObjectId,
    });
  }

  return NextResponse.json({
    received: true,
    duplicate: result.duplicate,
    reviewUpdated: result.changed,
    eventType: event.type,
  });
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
      : event.type.split(".").pop() ?? "updated";
  const currentPeriodStart = parseUnixSeconds(object.current_period_start);
  const currentPeriodEnd = parseUnixSeconds(object.current_period_end);
  const eventId = event.id;

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
    eventType: event.type,
  });

  if (response) return response;

  return NextResponse.json({ received: true, eventType: event.type });
}

function getInvoiceSubscriptionId(object: StripeWebhookObject) {
  const directSubscription = object.subscription;
  if (isString(directSubscription)) return directSubscription;
  if (directSubscription && typeof directSubscription === "object") {
    const id = (directSubscription as Record<string, unknown>).id;
    if (isString(id)) return id;
  }

  const parent = object.parent;
  if (!parent || typeof parent !== "object" || Array.isArray(parent)) return null;
  const subscriptionDetails = (parent as Record<string, unknown>).subscription_details;
  if (!subscriptionDetails || typeof subscriptionDetails !== "object" || Array.isArray(subscriptionDetails)) {
    return null;
  }

  const subscription = (subscriptionDetails as Record<string, unknown>).subscription;
  if (isString(subscription)) return subscription;
  if (subscription && typeof subscription === "object") {
    const id = (subscription as Record<string, unknown>).id;
    if (isString(id)) return id;
  }
  return null;
}

async function handleInvoiceEvent(event: StripeWebhookEvent) {
  const object = getWebhookObject(event);
  const invoiceId = object && isString(object.id) ? object.id : null;
  const createdAt = parseUnixSeconds(event.created);

  if (!object || !invoiceId || !createdAt) {
    return NextResponse.json({ error: "Evento de factura sin identificadores validos." }, { status: 400 });
  }

  const apiKey = process.env.STRIPE_SECRET_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ error: "Stripe API key no configurada para reconciliar facturas." }, { status: 503 });
  }
  const stripe = new Stripe(apiKey, { maxNetworkRetries: 0, timeout: 5_000 });

  const result = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`stripe-billing-incident:${invoiceId}`}, 0))::text`;

    const inserted = await tx.$executeRaw`
      INSERT INTO "StripeWebhookEvent" ("id", "type", "processedAt")
      VALUES (${event.id}, ${event.type}, NOW())
      ON CONFLICT ("id") DO NOTHING
    `;
    if (inserted === 0) {
      return { duplicate: true, changed: false, recipientCount: 0, status: null, organizationId: null };
    }

    // Retrieve the live invoice while holding its per-invoice lock. Event delivery
    // is unordered, so the event snapshot cannot be used as the source of truth.
    const latestInvoice = await stripe.invoices.retrieve(invoiceId);
    const latestInvoiceObject = latestInvoice as unknown as StripeWebhookObject;
    const subscriptionId = getInvoiceSubscriptionId(latestInvoiceObject);
    const customerId = getCustomerId(latestInvoiceObject);
    if (!subscriptionId && !customerId) {
      throw new Error("STRIPE_INVOICE_MAPPING_NOT_FOUND");
    }

    const matchingSubscriptions = subscriptionId
      ? await tx.subscription.findFirst({
          where: {
            provider: "stripe",
            providerSubscriptionId: subscriptionId,
            ...(customerId ? { providerCustomerId: customerId } : {}),
          },
          select: { organizationId: true, providerSubscriptionId: true },
        })
      : await tx.subscription.findMany({
          where: { provider: "stripe", providerCustomerId: customerId! },
          select: { organizationId: true, providerSubscriptionId: true },
          take: 2,
        });
    const subscription = Array.isArray(matchingSubscriptions)
      ? matchingSubscriptions.length === 1 ? matchingSubscriptions[0] : null
      : matchingSubscriptions;

    if (!subscription) {
      // Roll back the deduplication insert so Stripe can retry after the mapping
      // is repaired by an operator.
      throw new Error("STRIPE_INVOICE_MAPPING_NOT_FOUND");
    }

    const incidentStatus = latestInvoice.status === "paid"
      ? StripeBillingIncidentStatus.RECOVERED
      : latestInvoice.status === "void"
        ? StripeBillingIncidentStatus.CLOSED
        : StripeBillingIncidentStatus.OPEN;
    const current = await tx.stripeBillingIncident.findUnique({
      where: { invoiceId },
      select: { id: true, status: true },
    });

    if (incidentStatus !== StripeBillingIncidentStatus.OPEN && !current) {
      return {
        duplicate: false,
        changed: false,
        recipientCount: 0,
        status: incidentStatus,
        organizationId: subscription.organizationId,
      };
    }

    const update = {
      organizationId: subscription.organizationId,
      providerSubscriptionId: subscription.providerSubscriptionId,
      status: incidentStatus,
      lastEventId: event.id,
      lastEventType: event.type,
      lastEventCreatedAt: createdAt,
    };
    await tx.stripeBillingIncident.upsert({
      where: { invoiceId },
      update,
      create: { invoiceId, ...update },
    });

    const auditWritten = await writeAuditLogWithClient(tx, {
      organizationId: subscription.organizationId,
      action: incidentStatus === StripeBillingIncidentStatus.OPEN
        ? "BILLING_INVOICE_ATTENTION"
        : incidentStatus === StripeBillingIncidentStatus.CLOSED
          ? "BILLING_INVOICE_CLOSED"
          : "BILLING_INVOICE_RECOVERED",
      entityType: "StripeBillingIncident",
      entityId: invoiceId,
      details: {
        eventId: event.id,
        eventType: event.type,
        providerSubscriptionId: subscription.providerSubscriptionId,
        status: incidentStatus,
        stripeInvoiceStatus: latestInvoice.status,
      } satisfies Prisma.InputJsonValue,
    });
    if (!auditWritten) throw new Error("No se pudo auditar la incidencia de pago de Stripe.");

    const titleKey = incidentStatus === StripeBillingIncidentStatus.CLOSED
      ? "billing.invoiceIncidentClosed"
      : incidentStatus === StripeBillingIncidentStatus.RECOVERED
        ? "billing.invoiceIncidentRecovered"
        : event.type === "invoice.finalization_failed"
          ? "billing.invoiceIncidentFinalizationFailed"
          : event.type === "invoice.payment_action_required"
            ? "billing.invoiceIncidentActionRequired"
            : "billing.invoiceIncidentPaymentFailed";
    const recipientCount = await notifyBillingAdmins(tx, subscription.organizationId, titleKey);

    return {
      duplicate: false,
      changed: true,
      recipientCount,
      status: incidentStatus,
      organizationId: subscription.organizationId,
    };
  }, { maxWait: 5_000, timeout: 9_000 });

  if (result.changed && result.recipientCount === 0) {
    console.error("[stripe webhook] invoice incident has no active tenant billing administrators", {
      eventId: event.id,
      eventType: event.type,
      organizationId: result.organizationId,
      invoiceId,
    });
  }

  return NextResponse.json({
    received: true,
    duplicate: result.duplicate,
    incidentUpdated: result.changed,
    currentStatus: result.status,
    eventType: event.type,
  });
}

export async function POST(request: Request) {
  const signatureSecret = process.env.STRIPE_WEBHOOK_SECRET?.trim();
  if (!signatureSecret) {
    return NextResponse.json(
      { error: "Stripe webhook secret no configurado." },
      { status: 503 }
    );
  }

  const configuredMode = getConfiguredStripeMode();
  if (!configuredMode) {
    return NextResponse.json(
      { error: "La clave secreta de Stripe no coincide con el modo esperado del entorno." },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }

  const signatureHeader = request.headers.get("stripe-signature");
  if (!signatureHeader) {
    return NextResponse.json({ error: "Falta la firma de Stripe." }, { status: 400 });
  }

  const rawBody = await readBoundedBody(request, MAX_STRIPE_WEBHOOK_BODY_BYTES);
  if (rawBody === null) {
    return NextResponse.json(
      { error: "El payload de Stripe excede el limite permitido." },
      { status: 413, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!verifyStripeSignature(rawBody, signatureHeader, signatureSecret)) {
    return NextResponse.json({ error: "Firma de Stripe invalida." }, { status: 400 });
  }

  let parsedEvent: unknown;
  try {
    parsedEvent = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Payload de Stripe invalido." }, { status: 400 });
  }

  if (!parsedEvent || typeof parsedEvent !== "object" || Array.isArray(parsedEvent)) {
    return NextResponse.json({ error: "El evento de Stripe no es valido." }, { status: 400 });
  }

  const eventRecord = parsedEvent as Record<string, unknown>;
  if (
    typeof eventRecord.id !== "string" ||
    eventRecord.id.trim().length === 0 ||
    typeof eventRecord.type !== "string" ||
    eventRecord.type.trim().length === 0 ||
    typeof eventRecord.livemode !== "boolean"
  ) {
    return NextResponse.json(
      { error: "El evento de Stripe no contiene un ID, tipo o modo valido." },
      { status: 400 }
    );
  }

  const event = parsedEvent as StripeWebhookEvent;
  const eventMode = event.livemode ? "live" : "test";
  if (eventMode !== configuredMode) {
    console.error("[stripe webhook] event mode does not match configured API key", {
      eventId: event.id,
      eventType: event.type,
      eventMode,
      configuredMode,
    });
    return NextResponse.json(
      { error: "El modo del evento no coincide con la clave Stripe configurada." },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return await handleCheckoutSessionCompleted(event);
      case "checkout.session.async_payment_failed":
        return await handleCheckoutAsyncPaymentFailed(event);
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
        return await handleSubscriptionEvent(event);
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
      case "invoice.paid":
      case "invoice.payment_succeeded":
      case "invoice.finalization_failed":
      case "invoice.voided":
        return await handleInvoiceEvent(event);
      case "refund.created":
      case "refund.updated":
      case "refund.failed":
      case "charge.dispute.created":
      case "charge.dispute.updated":
      case "charge.dispute.closed":
      case "charge.dispute.funds_withdrawn":
      case "charge.dispute.funds_reinstated":
      case "radar.early_fraud_warning.created":
      case "radar.early_fraud_warning.updated":
        return await handleStripeBillingReviewEvent(event);
      default:
        return NextResponse.json({
          received: true,
          ignored: true,
          eventType: event.type,
        });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "STRIPE_ORGANIZATION_NOT_FOUND") {
      return NextResponse.json(
        { error: "Organizacion no encontrada para sincronizar Stripe." },
        { status: 404 }
      );
    }
    if (error instanceof Error && error.message === "STRIPE_MAPPING_CONFLICT") {
      console.error("[stripe webhook] subscription/customer mapping conflicts with an existing tenant billing record", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "La suscripcion o el cliente Stripe ya esta asociado a otra facturacion." },
        { status: 409 }
      );
    }
    if (error instanceof Error && error.message === "STRIPE_INVOICE_MAPPING_NOT_FOUND") {
      console.error("[stripe webhook] current invoice could not be mapped to an organization", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "No se pudo asociar la factura actual a una organizacion." },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message === "STRIPE_CHECKOUT_MAPPING_NOT_FOUND") {
      console.error("[stripe webhook] current Checkout session could not be mapped to an organization", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "No se pudo asociar la sesion Checkout actual a una organizacion." },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message === "STRIPE_BILLING_REVIEW_MAPPING_NOT_FOUND") {
      console.error("[stripe webhook] financial review resource could not be mapped to one tenant", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "No se pudo asociar el recurso financiero a una unica organizacion." },
        { status: 500 }
      );
    }
    if (error instanceof Error && error.message === "STRIPE_BILLING_REVIEW_RESOURCE_CONFLICT") {
      console.error("[stripe webhook] financial review resource is already stored with another kind", {
        eventId: event.id,
        eventType: event.type,
      });
      return NextResponse.json(
        { error: "El recurso financiero ya existe con otro tipo de revision." },
        { status: 409 }
      );
    }
    console.error("[stripe webhook] event processing failed", {
      eventId: event.id,
      eventType: event.type,
      errorName: error instanceof Error ? error.name : "unknown",
      errorCode: error instanceof Prisma.PrismaClientKnownRequestError ? error.code : undefined,
    });
    return NextResponse.json(
      { error: "No se pudo procesar el evento de Stripe." },
      { status: 500 }
    );
  }
}
