import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { exportCandidatesXLSX, exportLegalReviewXLSX, exportLogisticsArrivalsXLSX } from "@/app/actions/exports";
import { writeAuditLog } from "@/lib/audit";
import { Prisma } from "@prisma/client";

function toInputJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "full";
  
  try {
    let result: { base64: string; filename: string; error?: string } | null = null;
    let base64 = "";
    let filename = "export.xlsx";

    if (type === "legal") {
      result = await exportLegalReviewXLSX();
      if (result) {
        base64 = result.base64;
        filename = result.filename;
      }
    } else if (type === "logistics") {
      result = await exportLogisticsArrivalsXLSX();
      if (result) {
        base64 = result.base64;
        filename = result.filename;
      }
    } else {
      const filters = {
        status: searchParams.get("status"),
        country: searchParams.get("country"),
        paid400pln: searchParams.get("paid400pln"),
      };
      result = await exportCandidatesXLSX(filters);
      if (result) {
        base64 = result.base64;
        filename = result.filename;
      }
    }

    if (!base64) {
      return NextResponse.json(
        { error: "No se pudo generar el archivo o no tiene permisos" },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const buffer = Buffer.from(base64, "base64");
    const organizationId = session.user.organizationId;

    if (session.user.id && organizationId) {
      await writeAuditLog({
        userId: session.user.id,
        organizationId,
        action: "CANDIDATES_EXPORTED",
        entityType: "Export",
        entityId: filename,
        details: toInputJsonValue({
          type,
          filters: {
            status: searchParams.get("status"),
            country: searchParams.get("country"),
            paid400pln: searchParams.get("paid400pln"),
          },
          filename,
        }),
      });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error desconocido" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
