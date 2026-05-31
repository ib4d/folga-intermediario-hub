import { prisma } from "@/lib/prisma";
import { getProviderStatus } from "@/lib/provider-status";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    const providerStatus = getProviderStatus();
    const { storageProvider, ocrMode } = providerStatus;
    await storageProvider.checkConnection();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      storage: storageProvider.name,
      ocr: ocrMode,
      providers: {
        storage: storageProvider.name,
        ocr: ocrMode,
      },
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
