import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";

import { auth } from "@/auth";
import { canAccessModule } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenant";
import { writeAuditLog } from "@/lib/audit";
import { getBrokerLeadDetail } from "@/lib/brokers/queries";
import { buildBrokerLeadDetailCsv, buildBrokerLeadDetailWorkbook } from "@/lib/brokers/export";

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
  const lead = await getBrokerLeadDetail(tenant.organizationId, id);

  if (!lead) {
    return NextResponse.json({ error: "Lead no encontrado" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const exportData = {
      ...lead,
      brokerName: lead.broker?.displayName ?? null,
      assignedOwnerName: lead.assignedOwner?.name ?? lead.assignedOwner?.email ?? null,
    };
    const safeName = `${lead.firstName ?? ""}_${lead.lastName ?? ""}`.trim().toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || "lead";
    let buffer: Buffer;
    let filename: string;
    let contentType: string;

    if (format === "csv") {
      buffer = Buffer.from(buildBrokerLeadDetailCsv(exportData), "utf-8");
      filename = `broker_lead_${safeName}_${lead.id}.csv`;
      contentType = "text/csv; charset=utf-8";
    } else {
      const workbook = await buildBrokerLeadDetailWorkbook(exportData);
      buffer = Buffer.from(await workbook.xlsx.writeBuffer());
      filename = `broker_lead_${safeName}_${lead.id}.xlsx`;
      contentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    }

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "BROKER_LEAD_EXPORTED",
      entityType: "BrokerLead",
      entityId: lead.id,
      details: toInputJsonValue({ format, filename, leadName: `${lead.firstName ?? ""} ${lead.lastName ?? ""}`.trim() }),
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
    const message = error instanceof Error ? error.message : "No se pudo exportar lead.";
    return NextResponse.json({ error: message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
