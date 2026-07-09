import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { getBrokerDetail } from "@/lib/brokers/queries";
import { buildBrokerDetailCsv, buildBrokerDetailWorkbook } from "@/lib/brokers/export";

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
  const broker = await getBrokerDetail(tenant.organizationId, id);

  if (!broker) {
    return NextResponse.json({ error: "Broker no encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const safeName = broker.displayName.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "broker";
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      buffer = Buffer.from(buildBrokerDetailCsv(broker), "utf-8");
      filename = `broker_${safeName}_${broker.id}.csv`;
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokerDetailWorkbook(broker);
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      filename = `broker_${safeName}_${broker.id}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKER_EXPORTED",
      entityType: "Broker",
      entityId: broker.id,
      details: toInputJsonValue({ format, filename, brokerName: broker.displayName }),
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
    const message = error instanceof Error ? error.message : "No se pudo exportar broker.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
