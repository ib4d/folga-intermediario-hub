import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";

function containsInsensitive(value?: string | null): Prisma.StringFilter | undefined {
  return value ? { contains: value, mode: "insensitive" } : undefined;
}

export async function getBrokerDashboardMetrics(organizationId: string) {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  const [
    totalLeads,
    repliedLeads,
    candidateLeads,
    providerLeads,
    activeBrokers,
    totalInvoices,
    periodInvoices,
    totalEligibleReferrals,
    periodEligibleReferrals,
    totalAmountAggregate,
    periodAmountAggregate,
    leadsBySheet,
    invoicesByBroker,
  ] = await Promise.all([
    prisma.brokerLead.count({ where: { organizationId } }),
    prisma.brokerLead.count({ where: { organizationId, rawStatus: { equals: "Replied", mode: "insensitive" } } }),
    prisma.brokerLead.count({ where: { organizationId, leadType: "CANDIDATE" } }),
    prisma.brokerLead.count({ where: { organizationId, leadType: "PROVIDER" } }),
    prisma.broker.count({ where: { organizationId, status: "ACTIVE" } }),
    prisma.brokerInvoice.count({ where: { organizationId } }),
    prisma.brokerInvoice.count({
      where: {
        organizationId,
        referencePeriodStart: { gte: periodStart },
        referencePeriodEnd: { lte: periodEnd },
      },
    }),
    prisma.workerReferral.count({
      where: {
        organizationId,
        minimumHoursMet: true,
      },
    }),
    prisma.workerReferral.count({
      where: {
        organizationId,
        referencePeriodStart: { gte: periodStart },
        referencePeriodEnd: { lte: periodEnd },
        minimumHoursMet: true,
      },
    }),
    prisma.brokerInvoice.aggregate({
      where: { organizationId },
      _sum: { finalAmount: true },
    }),
    prisma.brokerInvoice.aggregate({
      where: {
        organizationId,
        referencePeriodStart: { gte: periodStart },
        referencePeriodEnd: { lte: periodEnd },
      },
      _sum: { finalAmount: true },
    }),
    prisma.brokerLead.groupBy({
      by: ["sourceCountrySheet"],
      where: { organizationId },
      _count: { _all: true },
    }),
    prisma.brokerInvoice.groupBy({
      by: ["brokerId"],
      where: { organizationId },
      _sum: { finalAmount: true },
      _count: { _all: true },
    }),
  ]);

  const brokerNames = await prisma.broker.findMany({
    where: { organizationId, id: { in: invoicesByBroker.map((item) => item.brokerId) } },
    select: { id: true, displayName: true },
  });

  const nameMap = new Map(brokerNames.map((item) => [item.id, item.displayName]));

  return {
    totalLeads,
    repliedLeads,
    candidateLeads,
    providerLeads,
    activeBrokers,
    totalInvoices,
    periodInvoices,
    totalEligibleReferrals,
    periodEligibleReferrals,
    totalFinalAmount: Number(totalAmountAggregate._sum.finalAmount ?? 0),
    periodFinalAmount: Number(periodAmountAggregate._sum.finalAmount ?? 0),
    leadsBySheet,
    invoicesByBroker: invoicesByBroker.map((item) => ({
      brokerId: item.brokerId,
      brokerName: nameMap.get(item.brokerId) ?? item.brokerId,
      invoiceCount: item._count._all,
      finalAmount: Number(item._sum.finalAmount ?? 0),
    })),
  };
}

export async function listBrokerLeads(
  organizationId: string,
  filters: {
    sourceCountrySheet?: string;
    leadType?: string;
    rawStatus?: string;
    normalizedStatus?: string;
    flowStatus?: string;
    emailStatus?: string;
    query?: string;
  } = {}
) {
  const query = filters.query?.trim();

  return prisma.brokerLead.findMany({
    where: {
      organizationId,
      ...(filters.sourceCountrySheet ? { sourceCountrySheet: filters.sourceCountrySheet } : {}),
      ...(filters.leadType ? { leadType: filters.leadType as never } : {}),
      ...(filters.rawStatus ? { rawStatus: filters.rawStatus } : {}),
      ...(filters.normalizedStatus ? { normalizedStatus: filters.normalizedStatus } : {}),
      ...(filters.flowStatus ? { flowStatus: filters.flowStatus } : {}),
      ...(filters.emailStatus ? { emailStatus: filters.emailStatus } : {}),
      ...(query
        ? {
            OR: [
              { firstName: containsInsensitive(query) },
              { lastName: containsInsensitive(query) },
              { email: containsInsensitive(query) },
              { phone: containsInsensitive(query) },
              { city: containsInsensitive(query) },
            ],
          }
        : {}),
    },
    include: {
      broker: true,
      assignedOwner: { select: { id: true, name: true, email: true } },
      _count: { select: { contactAttempts: true } },
    },
    orderBy: [{ lastReplyDate: "desc" }, { leadDate: "desc" }, { createdAt: "desc" }],
  });
}

export async function getBrokerLeadDetail(organizationId: string, id: string) {
  return prisma.brokerLead.findFirst({
    where: { id, organizationId },
    include: {
      broker: true,
      assignedOwner: { select: { id: true, name: true, email: true } },
      contactAttempts: { orderBy: { attemptNo: "asc" } },
    },
  });
}

export async function listBrokers(organizationId: string) {
  const brokers = await prisma.broker.findMany({
    where: { organizationId },
    include: {
      _count: { select: { referrals: true, leads: true, invoices: true } },
      invoices: { select: { finalAmount: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return brokers.map((broker) => ({
    ...broker,
    accumulatedBilling: broker.invoices.reduce((sum, invoice) => sum + Number(invoice.finalAmount ?? 0), 0),
  }));
}

export async function getBrokerDetail(organizationId: string, id: string) {
  const broker = await prisma.broker.findFirst({
    where: { id, organizationId },
    include: {
      leads: {
        include: {
          _count: { select: { contactAttempts: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      referrals: {
        orderBy: [{ referencePeriodStart: "desc" }, { workerFullName: "asc" }],
      },
      invoices: {
        include: {
          lines: true,
        },
        orderBy: [{ referencePeriodStart: "desc" }, { createdAt: "desc" }],
      },
    },
  });

  if (!broker) return null;

  return {
    ...broker,
    metrics: {
      totalReferrals: broker.referrals.length,
      eligibleReferrals: broker.referrals.filter((referral) => referral.minimumHoursMet).length,
      baseTotal: broker.invoices.reduce((sum, invoice) => sum + Number(invoice.baseTotal), 0),
      finalAmountTotal: broker.invoices.reduce((sum, invoice) => sum + Number(invoice.finalAmount), 0),
    },
  };
}

export async function listBrokerInvoices(
  organizationId: string,
  filters: {
    status?: string;
    brokerId?: string;
    threshold?: string;
    period?: string;
  } = {}
) {
  return prisma.brokerInvoice.findMany({
    where: {
      organizationId,
      ...(filters.status ? { status: filters.status as never } : {}),
      ...(filters.brokerId ? { brokerId: filters.brokerId } : {}),
      ...(filters.threshold ? { minimumHoursThreshold: Number(filters.threshold) } : {}),
      ...(filters.period
        ? {
            OR: [
              { sourceInvoiceSheet: { contains: filters.period, mode: "insensitive" } },
              { notes: { contains: filters.period, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      broker: true,
      _count: { select: { lines: true } },
    },
    orderBy: [{ referencePeriodStart: "desc" }, { updatedAt: "desc" }],
  });
}

export async function getBrokerInvoiceDetail(organizationId: string, id: string) {
  return prisma.brokerInvoice.findFirst({
    where: { id, organizationId },
    include: {
      broker: true,
      lines: {
        include: {
          workerReferral: true,
        },
        orderBy: { workerFullName: "asc" },
      },
    },
  });
}

export async function getBrokerFilterOptions(organizationId: string) {
  const [brokers, leads] = await Promise.all([
    prisma.broker.findMany({
      where: { organizationId },
      select: { id: true, displayName: true },
      orderBy: { displayName: "asc" },
    }),
    prisma.brokerLead.findMany({
      where: { organizationId },
      select: {
        sourceCountrySheet: true,
        rawStatus: true,
        normalizedStatus: true,
        flowStatus: true,
        emailStatus: true,
      },
    }),
  ]);

  return {
    brokers,
    sourceCountrySheets: [...new Set(leads.map((item) => item.sourceCountrySheet).filter((value): value is string => Boolean(value)))].sort(),
    rawStatuses: [...new Set(leads.map((item) => item.rawStatus).filter((value): value is string => Boolean(value)))].sort(),
    normalizedStatuses: [...new Set(leads.map((item) => item.normalizedStatus).filter((value): value is string => Boolean(value)))].sort(),
    flowStatuses: [...new Set(leads.map((item) => item.flowStatus).filter((value): value is string => Boolean(value)))].sort(),
    emailStatuses: [...new Set(leads.map((item) => item.emailStatus).filter((value): value is string => Boolean(value)))].sort(),
  };
}
