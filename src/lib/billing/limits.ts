import { Plan } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export interface PlanLimits {
  candidates: number;
  users: number;
  documentsPerMonth: number;
  ocrPerMonth: number;
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  [Plan.FREE]: {
    candidates: 25,
    users: 2,
    documentsPerMonth: 50,
    ocrPerMonth: 10,
  },
  [Plan.STARTER]: {
    candidates: 250,
    users: 5,
    documentsPerMonth: 500,
    ocrPerMonth: 100,
  },
  [Plan.PRO]: {
    candidates: 2500,
    users: 20,
    documentsPerMonth: 5000,
    ocrPerMonth: 1000,
  },
  [Plan.BUSINESS]: {
    candidates: 10000,
    users: 50,
    documentsPerMonth: 20000,
    ocrPerMonth: 5000,
  },
  [Plan.ENTERPRISE]: {
    candidates: Infinity,
    users: Infinity,
    documentsPerMonth: Infinity,
    ocrPerMonth: Infinity,
  },
};

/**
 * Gets the limits for a specific plan.
 */
export function getPlanLimits(plan: Plan): PlanLimits {
  return PLAN_LIMITS[plan] || PLAN_LIMITS[Plan.FREE];
}

/**
 * Asserts that an organization is within its plan limits for a given feature.
 */
export async function assertWithinPlanLimit(
  organizationId: string,
  feature: keyof PlanLimits
) {
  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { plan: true },
  });

  if (!organization) throw new Error("Organización no encontrada");

  const limits = getPlanLimits(organization.plan);
  const currentLimit = limits[feature];

  if (currentLimit === Infinity) return true;

  let currentUsage = 0;

  switch (feature) {
    case "candidates":
      currentUsage = await prisma.candidate.count({ where: { organizationId } });
      break;
    case "users":
      currentUsage = await prisma.membership.count({ where: { organizationId, isActive: true } });
      break;
    case "documentsPerMonth":
    case "ocrPerMonth":
      // Monthly limits check (basic implementation)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      if (feature === "documentsPerMonth") {
        currentUsage = await prisma.document.count({
          where: { organizationId, createdAt: { gte: startOfMonth } },
        });
      } else {
        currentUsage = await prisma.auditLog.count({
          where: {
            organizationId,
            action: { in: ["OCR_EXTRACTED_PENDING_REVIEW", "OCR_FAILED"] },
            createdAt: { gte: startOfMonth },
          },
        });
      }
      break;
  }

  if (currentUsage >= currentLimit) {
    throw new Error(
      `Límite de plan alcanzado (${feature}). Su plan actual (${organization.plan}) permite hasta ${currentLimit}.`
    );
  }

  return true;
}
