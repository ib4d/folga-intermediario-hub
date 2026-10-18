import { reviewDocumentOcr } from "@/app/actions/documents";
import { requireRoleApi } from "@/lib/security/requireRole";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { errorResponse } = await requireRoleApi([Role.SUPERADMIN, Role.ADMIN, Role.LEGAL]);
  if (errorResponse) return errorResponse;

  try {
    const payload = await request.json();
    const result = await reviewDocumentOcr(payload);
    return NextResponse.json(result, { status: result.success ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar la revision del documento.";
    return NextResponse.json({ success: false, message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
