import { uploadDocument } from "@/app/actions/documents";
import { canUploadCandidateDocuments } from "@/lib/permissions";
import { getCurrentTenant } from "@/lib/tenant";
import { NextResponse } from "next/server";

const MAX_SINGLE_UPLOAD_BODY_BYTES = 11 * 1024 * 1024;

export async function POST(request: Request) {
  let tenant: Awaited<ReturnType<typeof getCurrentTenant>>;
  try {
    tenant = await getCurrentTenant();
  } catch {
    return NextResponse.json({ success: false, message: "No se pudo validar la sesion" }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
  if (!tenant) {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!canUploadCandidateDocuments(tenant.role)) {
    return NextResponse.json({ success: false, message: "Sin permisos para subir documentos" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  }
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SINGLE_UPLOAD_BODY_BYTES) {
    return NextResponse.json({ success: false, message: "La solicitud excede el limite de carga." }, { status: 413, headers: { "Cache-Control": "no-store" } });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ success: false, message: "El formulario de carga no es valido." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  try {
    const result = await uploadDocument(formData);
    return NextResponse.json(result, { status: result.success ? 200 : 400, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir documento.";
    return NextResponse.json({ success: false, message }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
