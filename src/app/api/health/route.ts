import { prisma } from "@/lib/prisma";
import { getOcrProviderName } from "@/lib/providers/ocr";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    const ocrProvider = getOcrProviderName();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      storage: process.env.STORAGE_PROVIDER || "supabase",
      ocr: ocrProvider,
      email: process.env.EMAIL_PROVIDER || "smtp",
      jobs: process.env.JOB_PROVIDER || "inline",
      timestamp: new Date().toISOString(),
      version: "1.0.0-p3"
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
