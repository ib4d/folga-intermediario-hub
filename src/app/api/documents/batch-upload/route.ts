import { batchUploadDocuments, smartBatchUpload } from "@/app/actions/documents";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const modeValue = formData.get("mode");
    const mode = typeof modeValue === "string" ? modeValue : "manual";

    const result =
      mode === "smart"
        ? await smartBatchUpload(formData)
        : await batchUploadDocuments(String(formData.get("candidateId") ?? ""), formData);

    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Error al subir documentos en lote.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
