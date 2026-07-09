import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import {
  buildBrokerInvoicesCsv,
  buildBrokerInvoicesWorkbook,
  type BrokerInvoiceListExportRow,
} from "@/lib/brokers/invoice-export";

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
  const status = searchParams.get("status") || undefined;
  const brokerId = searchParams.get("brokerId") || undefined;
  const threshold = searchParams.get("threshold") || undefined;
  const period = searchParams.get("period") || undefined;

  const where: Prisma.BrokerInvoiceWhereInput = {
    organizationId: tenant.organizationId,
    ...(status ? { status: status as never } : {}),
    ...(brokerId ? { brokerId } : {}),
    ...(threshold ? { minimumHoursThreshold: Number(threshold) } : {}),
    ...(period
      ? {
          OR: [
            { sourceInvoiceSheet: containsInsensitive(period) },
            { notes: containsInsensitive(period) },
          ],
        }
      : {}),
  };

  try {
    const invoices = await prisma.brokerInvoice.findMany({
      where,
      include: {
        broker: true,
      },
      orderBy: [{ referencePeriodStart: "desc" }, { updatedAt: "desc" }],
    });

    const rows: BrokerInvoiceListExportRow[] = invoices.map((invoice) => ({
      brokerName: invoice.broker.displayName,
      periodStart: invoice.referencePeriodStart,
      periodEnd: invoice.referencePeriodEnd,
      invoiceType: invoice.invoiceType,
      minimumHoursThreshold: invoice.minimumHoursThreshold,
      candidateCountEligible: invoice.candidateCountEligible,
      baseTotal: invoice.baseTotal,
      vatAmount: invoice.vatAmount,
      finalAmount: invoice.finalAmount,
      status: invoice.status,
      sourceInvoiceSheet: invoice.sourceInvoiceSheet,
      sourceFileName: invoice.sourceFileName,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    }));

    const safeSuffix = `status-${status || "all"}_broker-${brokerId || "all"}_threshold-${threshold || "all"}_period-${period || "all"}`.replace(/[^a-zA-Z0-9._-]+/g, "_");
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      const csv = buildBrokerInvoicesCsv(rows);
      buffer = Buffer.from(csv, "utf-8");
      filename = `broker_invoices_${safeSuffix}.csv`;
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokerInvoicesWorkbook(rows);
      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      buffer = Buffer.from(xlsxBuffer);
      filename = `broker_invoices_${safeSuffix}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKER_INVOICES_EXPORTED",
      entityType: "BrokerInvoice",
      entityId: filename,
      details: toInputJsonValue({ format, filename, filters: { status, brokerId, threshold, period }, count: rows.length }),
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
    const message = error instanceof Error ? error.message : "No se pudo exportar la lista de facturas.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
