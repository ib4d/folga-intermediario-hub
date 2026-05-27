import { reviewDocumentOcr } from "@/app/actions/documents";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const result = await reviewDocumentOcr(payload);
    return NextResponse.json(result, { status: result.success ? 200 : 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al guardar la revision del documento.";
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
