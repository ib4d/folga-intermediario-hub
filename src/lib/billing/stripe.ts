import { Plan } from "@prisma/client";

export type StripeMode = "test" | "live";

export function getStripeSecretKeyMode(value: string | null | undefined): StripeMode | null {
  const key = value?.trim();
  if (!key) return null;

  if (/^(?:sk|rk)_test_/.test(key)) return "test";
  if (/^(?:sk|rk)_live_/.test(key)) return "live";
  return null;
}

export function getStripePublishableKeyMode(value: string | null | undefined): StripeMode | null {
  const key = value?.trim();
  if (!key) return null;

  if (/^pk_test_/.test(key)) return "test";
  if (/^pk_live_/.test(key)) return "live";
  return null;
}

export function getConfiguredStripeMode(
  secretKey = process.env.STRIPE_SECRET_KEY,
  expectedMode = process.env.STRIPE_EXPECTED_MODE,
): StripeMode | null {
  const keyMode = getStripeSecretKeyMode(secretKey);
  if (!keyMode) return null;

  const expected = expectedMode?.trim().toLowerCase();
  if (expected !== "test" && expected !== "live") return null;
  return expected === keyMode ? keyMode : null;
}

const paymentLinkEnvByPlan: Partial<Record<Plan, string>> = {
  [Plan.STARTER]: "STRIPE_PAYMENT_LINK_STARTER",
  [Plan.PRO]: "STRIPE_PAYMENT_LINK_PRO",
  [Plan.BUSINESS]: "STRIPE_PAYMENT_LINK_BUSINESS",
  [Plan.ENTERPRISE]: "STRIPE_PAYMENT_LINK_ENTERPRISE",
};

export function isStripeConfigured() {
  const secretKey = process.env.STRIPE_SECRET_KEY?.trim();
  const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY?.trim();
  const secretMode = getConfiguredStripeMode(secretKey);

  return Boolean(
    secretMode &&
      process.env.STRIPE_WEBHOOK_SECRET?.trim() &&
      getStripePublishableKeyMode(publishableKey) === secretMode
  );
}

export function isStripePortalConfigured() {
  return Boolean(
    getConfiguredStripeMode() &&
      process.env.STRIPE_CUSTOMER_PORTAL_ENABLED?.trim().toLowerCase() === "true"
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
