import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { getBrokerInvoiceDetail } from "@/lib/brokers/queries";
import {
  buildBrokerInvoiceCsv,
  buildBrokerInvoiceWorkbook,
} from "@/lib/brokers/invoice-export";
import { writeAuditLog } from "@/lib/audit";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const tenant = await requireTenant();

  if (!canAccessModule(tenant.role, "brokers")) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }

  const { id } = await params;
  const format = (req.nextUrl.searchParams.get("format") || "xlsx").trim().toLowerCase();
  const invoice = await getBrokerInvoiceDetail(tenant.organizationId, id);

  if (!invoice) {
    return NextResponse.json({ error: "Factura de broker no encontrada" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const safeBrokerName = invoice.broker.displayName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 50) || "broker";
    const periodToken = invoice.referencePeriodStart
      ? new Date(invoice.referencePeriodStart).toISOString().slice(0, 7)
      : "sin_periodo";

    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      const csv = buildBrokerInvoiceCsv(invoice);
      buffer = Buffer.from(csv, "utf-8");
      filename = `broker_invoice_${safeBrokerName}_${periodToken}_${invoice.id}.csv`;
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokerInvoiceWorkbook(invoice);
      const xlsxBuffer = await workbook.xlsx.writeBuffer();
      buffer = Buffer.from(xlsxBuffer);
      filename = `broker_invoice_${safeBrokerName}_${periodToken}_${invoice.id}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKER_INVOICE_EXPORTED",
      entityType: "BrokerInvoice",
      entityId: invoice.id,
      details: toInputJsonValue({
        format,
        filename,
        brokerId: invoice.brokerId,
        brokerName: invoice.broker.displayName,
        sourceInvoiceSheet: invoice.sourceInvoiceSheet,
      }),
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
    const message = error instanceof Error ? error.message : "No se pudo exportar la factura.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
