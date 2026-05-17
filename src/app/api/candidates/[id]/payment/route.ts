import { prisma } from "@/lib/prisma";
import { writeAuditLog } from "@/lib/audit";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import { Prisma, Role } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";

function parsePaymentPayload(value: unknown) {
  if (!value || typeof value !== "object") {
    return { paid400pln: false, paymentDate: null };
  }

  const payload = value as { paid400pln?: unknown; paymentDate?: unknown };
  const paid400pln = payload.paid400pln === true;
  const rawDate = typeof payload.paymentDate === "string" ? payload.paymentDate : null;
  const paymentDate = rawDate ? new Date(rawDate) : null;

  if (paymentDate && Number.isNaN(paymentDate.getTime())) {
    throw new Error("Fecha de pago invalida");
  }

  return {
    paid400pln,
    paymentDate: paid400pln ? paymentDate ?? new Date() : null,
  };
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  let tenant;

  try {
    tenant = await requireTenant();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  let body: ReturnType<typeof parsePaymentPayload>;

  try {
    body = parsePaymentPayload(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud invalida" },
      { status: 400 }
    );
  }

  const candidate = await prisma.candidate.findFirst({
    where: candidateAccessWhere(tenant, id),
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidato no encontrado en esta organizacion" },
      { status: 404 }
    );
  }

  if (tenant.role === Role.INTERMEDIARIO && candidate.intermediaryId !== tenant.userId) {
    return NextResponse.json(
      { error: "Sin permisos sobre este candidato" },
      { status: 403 }
    );
  }

  try {
    const updated = await prisma.candidate.update({
      where: { id: candidate.id },
      data: {
        paid400pln: body.paid400pln,
        paymentDate: body.paymentDate,
      },
      select: {
        id: true,
        paid400pln: true,
        paymentDate: true,
      },
    });

    await writeAuditLog({
      userId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "PAYMENT_UPDATED",
      entityType: "Candidate",
      entityId: id,
      details: {
        paid400pln: body.paid400pln,
        paymentDate: body.paymentDate?.toISOString() ?? null,
      } satisfies Prisma.InputJsonValue,
    });

    return NextResponse.json({ success: true, candidate: updated });
  } catch (error) {
    console.error("[Payment] Failed to update candidate payment", error);
    return NextResponse.json(
      { error: "No se pudo guardar el estado de pago. Intentalo de nuevo." },
      { status: 500 }
    );
  }
}
