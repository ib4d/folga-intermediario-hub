import { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { inferBrokerLeadType } from "./utils";

function containsInsensitive(value?: string | null): Prisma.StringFilter | undefined {
  return value ? { contains: value, mode: "insensitive" } : undefined;
}

function resolvePagination(totalItems: number, requestedPage: number, requestedPageSize: number) {
  const pageSize = Math.max(1, requestedPageSize || 20);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const pageNumber = Math.min(Math.max(1, requestedPage || 1), totalPages);
  const skip = totalItems === 0 ? 0 : (pageNumber - 1) * pageSize;

  return { pageNumber, pageSize, totalPages, skip };
}

type BrokerLeadWithRelations = Prisma.BrokerLeadGetPayload<{
  include: {
    broker: true;
    assignedOwner: { select: { id: true; name: true; email: true } };
    _count: { select: { contactAttempts: true } };
  };
}>;

type BrokerWithRelations = Prisma.BrokerGetPayload<{
  include: {
    _count: { select: { referrals: true; leads: true; invoices: true } };
    invoices: { select: { finalAmount: true } };
  };
}>;

type BrokerInvoiceWithRelations = Prisma.BrokerInvoiceGetPayload<{
  include: {
    broker: true;
    _count: { select: { lines: true } };
  };
}>;

export async function getBrokerDashboardMetrics(organizationId: string) {
  const now = new Date();
  const periodStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const periodEnd = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));

  const [
    repliedLeads,
    activeBrokers,
    totalInvoices,
    periodInvoices,
    totalEligibleReferrals,
    periodEligibleReferrals,
    totalAmountAggregate,
    periodAmountAggregate,
    leadsBySheet,
    invoicesByBroker,
    leadTypeInputs,
  ] = await Promise.all([
    prisma.brokerLead.count({ where: { organizationId, rawStatus: { equals: "Replied", mode: "insensitive" } } }),
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
    prisma.brokerLead.findMany({
      where: { organizationId },
      select: {
        leadType: true,
        rawStatus: true,
        normalizedStatus: true,
        declaredSupplyText: true,
        firstName: true,
        lastName: true,
        city: true,
        phone: true,
        email: true,
      },
    }),
  ]);

  const brokerNames = await prisma.broker.findMany({
    where: { organizationId, id: { in: invoicesByBroker.map((item) => item.brokerId) } },
    select: { id: true, displayName: true },
  });

  const nameMap = new Map(brokerNames.map((item) => [item.id, item.displayName]));

  const inferredLeadTypes = leadTypeInputs.map((lead) =>
    inferBrokerLeadType({
      explicitLeadType: lead.leadType,
      rawStatus: lead.rawStatus,
      normalizedStatus: lead.normalizedStatus,
      declaredSupplyText: lead.declaredSupplyText,
      firstName: lead.firstName,
      lastName: lead.lastName,
      city: lead.city,
      phone: lead.phone,
      email: lead.email,
    })
  );

  const totalLeads = inferredLeadTypes.length;
  const candidateLeads = inferredLeadTypes.filter((value) => value === "CANDIDATE").length;
  const providerLeads = inferredLeadTypes.filter((value) => value === "PROVIDER").length;

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
    page?: number;
    pageSize?: number;
  } = {}
) {
  const query = filters.query?.trim();
  const where: Prisma.BrokerLeadWhereInput = {
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
  };

  const totalItems = await prisma.brokerLead.count({ where });
  const { pageNumber, pageSize, totalPages, skip } = resolvePagination(totalItems, filters.page ?? 1, filters.pageSize ?? 20);
  const leads: BrokerLeadWithRelations[] = await prisma.brokerLead.findMany({
    where,
    include: {
      broker: true,
      assignedOwner: { select: { id: true, name: true, email: true } },
      _count: { select: { contactAttempts: true } },
    },
    take: pageSize,
    skip,
    orderBy: [{ lastReplyDate: "desc" }, { leadDate: "desc" }, { createdAt: "desc" }],
  });

  return {
    items: leads.map((lead) => ({
      ...lead,
      leadType: inferBrokerLeadType({
        explicitLeadType: lead.leadType,
        rawStatus: lead.rawStatus,
        normalizedStatus: lead.normalizedStatus,
        declaredSupplyText: lead.declaredSupplyText,
        firstName: lead.firstName,
        lastName: lead.lastName,
        city: lead.city,
        phone: lead.phone,
        email: lead.email,
      }),
    })),
    totalItems,
    pageNumber,
    pageSize,
    totalPages,
  };
}

export async function getBrokerLeadDetail(organizationId: string, id: string) {
  const lead = await prisma.brokerLead.findFirst({
    where: { id, organizationId },
    include: {
      broker: true,
      assignedOwner: { select: { id: true, name: true, email: true } },
      contactAttempts: { orderBy: { attemptNo: "asc" } },
    },
  });

  if (!lead) return null;

  return {
    ...lead,
    leadType: inferBrokerLeadType({
      explicitLeadType: lead.leadType,
      rawStatus: lead.rawStatus,
      normalizedStatus: lead.normalizedStatus,
      declaredSupplyText: lead.declaredSupplyText,
      firstName: lead.firstName,
      lastName: lead.lastName,
      city: lead.city,
      phone: lead.phone,
      email: lead.email,
    }),
  };
}

export async function listBrokers(
  organizationId: string,
  options: { page?: number; pageSize?: number } = {},
) {
  const where: Prisma.BrokerWhereInput = { organizationId };
  const totalItems = await prisma.broker.count({ where });
  const { pageNumber, pageSize, totalPages, skip } = resolvePagination(totalItems, options.page ?? 1, options.pageSize ?? 20);
  const brokers: BrokerWithRelations[] = await prisma.broker.findMany({
    where,
    include: {
      _count: { select: { referrals: true, leads: true, invoices: true } },
      invoices: { select: { finalAmount: true } },
    },
    take: pageSize,
    skip,
    orderBy: { updatedAt: "desc" },
  });

  return {
    items: brokers.map((broker) => ({
      ...broker,
      accumulatedBilling: broker.invoices.reduce((sum, invoice) => sum + Number(invoice.finalAmount ?? 0), 0),
    })),
    totalItems,
    pageNumber,
    pageSize,
    totalPages,
  };
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
    page?: number;
    pageSize?: number;
  } = {}
) {
  const where: Prisma.BrokerInvoiceWhereInput = {
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
  };

  const totalItems = await prisma.brokerInvoice.count({ where });
  const { pageNumber, pageSize, totalPages, skip } = resolvePagination(totalItems, filters.page ?? 1, filters.pageSize ?? 20);

  const items: BrokerInvoiceWithRelations[] = await prisma.brokerInvoice.findMany({
    where,
    include: {
      broker: true,
      _count: { select: { lines: true } },
    },
    take: pageSize,
    skip,
    orderBy: [{ referencePeriodStart: "desc" }, { updatedAt: "desc" }],
  });

  return {
    items,
    totalItems,
    pageNumber,
    pageSize,
    totalPages,
  };
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
