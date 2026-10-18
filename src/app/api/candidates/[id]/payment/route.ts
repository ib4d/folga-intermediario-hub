import { prisma } from "@/lib/prisma";
import { candidateAccessWhere, requireTenant } from "@/lib/tenant";
import { canAccessCandidateByOwnership, canViewCandidatePayment } from "@/lib/permissions";
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
    return NextResponse.json({ error: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const { id } = await params;
  let body: ReturnType<typeof parsePaymentPayload>;

  try {
    body = parsePaymentPayload(await req.json());
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Solicitud invalida" },
      { status: 400, headers: { "Cache-Control": "no-store" } }
    );
  }

  const candidate = await prisma.candidate.findFirst({
    where: candidateAccessWhere(tenant, id),
  });

  if (!candidate) {
    return NextResponse.json(
      { error: "Candidato no encontrado en esta organizacion" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!canAccessCandidateByOwnership(tenant.role, candidate.intermediaryId, tenant.userId)) {
    return NextResponse.json(
      { error: "Sin permisos sobre este candidato" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  if (!canViewCandidatePayment(tenant.role)) {
    return NextResponse.json(
      { error: "Tu rol no puede modificar pagos de candidatos" },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const updatedCandidate = await tx.candidate.update({
        where: {
          id: candidate.id,
          organizationId: tenant.organizationId,
          ...(tenant.role === Role.INTERMEDIARIO ? { intermediaryId: tenant.userId } : {}),
        },
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

      await tx.auditLog.create({
        data: {
          userId: tenant.userId,
          organizationId: tenant.organizationId,
          action: "PAYMENT_UPDATED",
          entityType: "Candidate",
          entityId: id,
          details: {
            paid400pln: body.paid400pln,
            paymentDate: body.paymentDate?.toISOString() ?? null,
          } satisfies Prisma.InputJsonValue,
        },
      });

      return updatedCandidate;
    });

    return NextResponse.json({ success: true, candidate: updated }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[Payment] Failed to update candidate payment", error);
    return NextResponse.json(
      { error: "No se pudo guardar el estado de pago. Intentalo de nuevo." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
