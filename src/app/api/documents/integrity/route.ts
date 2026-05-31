import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { canAccessModule } from "@/lib/permissions";
import { candidateVisibilityWhere, requireTenant } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { inspectDocumentIntegrity, toDocumentIntegrityRecords } from "@/lib/document-integrity";
import { writeAuditLog } from "@/lib/audit";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET() {
  try {
    const tenant = await requireTenant();
    if (!canAccessModule(tenant.role, "documents")) {
      return NextResponse.json({ success: false, message: "Sin permisos" }, { status: 403 });
    }

    const documents = await prisma.document.findMany({
      where: {
        organizationId: tenant.organizationId,
        candidate: candidateVisibilityWhere(tenant),
      },
      select: {
        id: true,
        type: true,
        number: true,
        url: true,
        candidateId: true,
        ocrStatus: true,
        isVerified: true,
        candidate: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const integrity = await inspectDocumentIntegrity(toDocumentIntegrityRecords(documents));

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "DOCUMENT_INTEGRITY_CHECKED",
      entityType: "Document",
      entityId: "integrity-check",
      details: toInputJsonValue({
        totalDocuments: integrity.totalDocuments,
        accessibleDocuments: integrity.accessibleDocuments,
        brokenDocuments: integrity.brokenDocuments,
      }),
    });

    return NextResponse.json({
      success: true,
      integrity,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "No se pudo comprobar la integridad documental.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
