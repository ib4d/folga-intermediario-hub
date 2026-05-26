import { uploadDocument } from "@/app/actions/documents";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const result = await uploadDocument(formData);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al subir documento.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
