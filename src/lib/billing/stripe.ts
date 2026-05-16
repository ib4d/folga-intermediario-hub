import { Plan } from "@prisma/client";

const paymentLinkEnvByPlan: Partial<Record<Plan, string>> = {
  [Plan.STARTER]: "STRIPE_PAYMENT_LINK_STARTER",
  [Plan.PRO]: "STRIPE_PAYMENT_LINK_PRO",
  [Plan.BUSINESS]: "STRIPE_PAYMENT_LINK_BUSINESS",
  [Plan.ENTERPRISE]: "STRIPE_PAYMENT_LINK_ENTERPRISE",
};

export function isStripeConfigured() {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim()
  );
}

export function getStripePaymentLink(plan: Plan) {
  const envKey = paymentLinkEnvByPlan[plan];
  if (!envKey) return null;

  const value = process.env[envKey]?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}

export function getStripePortalUrl() {
  const value = process.env.STRIPE_CUSTOMER_PORTAL_URL?.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? value : null;
  } catch {
    return null;
  }
}
