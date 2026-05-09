import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.organizationId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const orgId = session.user.organizationId;
  const body = await req.json();

  const candidate = await prisma.candidate.findUnique({ 
    where: { id, organizationId: orgId } 
  });
  
  if (!candidate) {
    return NextResponse.json({ error: "Candidato no encontrado en esta organización" }, { status: 404 });
  }

  // Only the managing intermediary or admins can update payment
  if (
    session.user.role === "INTERMEDIARIO" &&
    candidate.intermediaryId !== session.user.id
  ) {
    return NextResponse.json({ error: "Sin permisos sobre este candidato" }, { status: 403 });
  }

  await prisma.candidate.update({
    where: { id },
    data: {
      paid400pln: Boolean(body.paid400pln),
      paymentDate: body.paymentDate ? new Date(body.paymentDate) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      userId: session.user.id,
      organizationId: orgId,
      action: "PAYMENT_UPDATED",
      entityType: "Candidate",
      entityId: id,
      details: { paid400pln: body.paid400pln, paymentDate: body.paymentDate } as never,
    },
  });

  return NextResponse.json({ success: true });
}
