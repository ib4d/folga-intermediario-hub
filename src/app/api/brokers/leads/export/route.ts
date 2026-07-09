import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  buildBrokerLeadsCsv,
  buildBrokerLeadsWorkbook,
  type BrokerLeadExportRow,
} from "@/lib/brokers/export";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

function containsInsensitive(value?: string | null): Prisma.StringFilter | undefined {
  return value ? { contains: value, mode: "insensitive" } : undefined;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const tenant = await requireTenant();
  if (!canAccessModule(tenant.role, "brokers")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const { searchParams } = new URL(req.url);
  const format = (searchParams.get("format") || "xlsx").trim().toLowerCase();
  const where: Prisma.BrokerLeadWhereInput = {
    organizationId: tenant.organizationId,
    ...(typeof searchParams.get("sourceCountrySheet") === "string" && searchParams.get("sourceCountrySheet")
      ? { sourceCountrySheet: searchParams.get("sourceCountrySheet")! }
      : {}),
    ...(typeof searchParams.get("leadType") === "string" && searchParams.get("leadType")
      ? { leadType: searchParams.get("leadType") as never }
      : {}),
    ...(typeof searchParams.get("rawStatus") === "string" && searchParams.get("rawStatus")
      ? { rawStatus: searchParams.get("rawStatus")! }
      : {}),
    ...(typeof searchParams.get("normalizedStatus") === "string" && searchParams.get("normalizedStatus")
      ? { normalizedStatus: searchParams.get("normalizedStatus")! }
      : {}),
    ...(typeof searchParams.get("flowStatus") === "string" && searchParams.get("flowStatus")
      ? { flowStatus: searchParams.get("flowStatus")! }
      : {}),
    ...(typeof searchParams.get("emailStatus") === "string" && searchParams.get("emailStatus")
      ? { emailStatus: searchParams.get("emailStatus")! }
      : {}),
    ...(searchParams.get("query")
      ? {
          OR: [
            { firstName: containsInsensitive(searchParams.get("query")) },
            { lastName: containsInsensitive(searchParams.get("query")) },
            { email: containsInsensitive(searchParams.get("query")) },
            { phone: containsInsensitive(searchParams.get("query")) },
            { city: containsInsensitive(searchParams.get("query")) },
          ],
        }
      : {}),
  };

  try {
    const leads = await prisma.brokerLead.findMany({
      where,
      include: {
        broker: true,
        assignedOwner: { select: { name: true } },
        _count: { select: { contactAttempts: true } },
      },
      orderBy: [{ lastReplyDate: "desc" }, { leadDate: "desc" }, { createdAt: "desc" }],
    });

    const rows: BrokerLeadExportRow[] = leads.map((lead) => ({
      leadDate: lead.leadDate,
      firstName: lead.firstName,
      lastName: lead.lastName,
      email: lead.email,
      phone: lead.phone,
      city: lead.city,
      sourceCountrySheet: lead.sourceCountrySheet,
      leadType: lead.leadType,
      rawStatus: lead.rawStatus,
      normalizedStatus: lead.normalizedStatus,
      flowStatus: lead.flowStatus,
      emailStatus: lead.emailStatus,
      lastReplyDate: lead.lastReplyDate,
      contactAttempts: lead._count.contactAttempts,
      brokerName: lead.broker?.displayName ?? null,
      assignedOwnerName: lead.assignedOwner?.name ?? null,
    }));

    const querySuffix = new URLSearchParams();
    ["sourceCountrySheet", "leadType", "rawStatus", "normalizedStatus", "flowStatus", "emailStatus", "query"].forEach((key) => {
      const value = searchParams.get(key);
      if (value) querySuffix.set(key, value);
    });

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      buffer = Buffer.from(buildBrokerLeadsCsv(rows), "utf-8");
      filename = `broker_leads_${querySuffix.toString() || "all"}.csv`;
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokerLeadsWorkbook(rows);
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      filename = `broker_leads_${querySuffix.toString() || "all"}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKER_LEADS_EXPORTED",
      entityType: "BrokerLead",
      entityId: filename,
      details: toInputJsonValue({ format, filename, count: rows.length, filters: Object.fromEntries(querySuffix.entries()) }),
    });

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo exportar leads.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
