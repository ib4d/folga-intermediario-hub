import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { buildBrokersCsv, buildBrokersWorkbook, type BrokerExportRow } from "@/lib/brokers/export";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
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

  const format = (req.nextUrl.searchParams.get("format") || "xlsx").trim().toLowerCase();

  try {
    const brokers = await prisma.broker.findMany({
      where: { organizationId: tenant.organizationId },
      include: {
        _count: { select: { referrals: true, leads: true, invoices: true } },
        invoices: { select: { finalAmount: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    const rows: BrokerExportRow[] = brokers.map((broker) => ({
      displayName: broker.displayName,
      legalOrBillingName: broker.legalOrBillingName,
      country: broker.country,
      city: broker.city,
      primaryEmail: broker.primaryEmail,
      primaryPhone: broker.primaryPhone,
      brokerType: broker.brokerType,
      status: broker.status,
      qualityRating: broker.qualityRating,
      leadCount: broker._count.leads,
      referralCount: broker._count.referrals,
      invoiceCount: broker._count.invoices,
      accumulatedBilling: broker.invoices.reduce((sum, invoice) => sum + Number(invoice.finalAmount ?? 0), 0),
      notes: broker.notes,
      createdAt: broker.createdAt,
      updatedAt: broker.updatedAt,
    }));

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      buffer = Buffer.from(buildBrokersCsv(rows), "utf-8");
      filename = "brokers_export.csv";
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokersWorkbook(rows);
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      filename = "brokers_export.xlsx";
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKERS_EXPORTED",
      entityType: "Broker",
      entityId: filename,
      details: toInputJsonValue({ format, filename, count: rows.length }),
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
    const message = error instanceof Error ? error.message : "No se pudo exportar brokers.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
