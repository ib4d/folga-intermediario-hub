import { prisma } from "@/lib/prisma";
import { getRuntimeMetadata } from "@/lib/operational-status";
import { getProviderStatus } from "@/lib/provider-status";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Check DB connection
    await prisma.$queryRaw`SELECT 1`;
    const providerStatus = getProviderStatus();
    const runtime = getRuntimeMetadata();
    const { storageProvider, storage, ocr } = providerStatus;
    await storageProvider.checkConnection();

    return NextResponse.json({
      status: "ok",
      db: "connected",
      storage: storage.name,
      ocr: ocr.mode,
      providers: {
        storage: {
          name: storage.name,
          mode: storage.mode,
          statusLabel: storage.statusLabel,
          statusDescription: storage.statusDescription,
        },
        ocr: {
          name: ocr.name,
          mode: ocr.mode,
          supportsAutomaticExtraction: ocr.supportsAutomaticExtraction,
        },
      },
      email: runtime.emailProvider,
      jobs: runtime.jobProvider,
      cronConfigured: runtime.cronConfigured,
      smtpConfigured: runtime.smtpConfigured,
      externalMonitoringConfigured: runtime.externalMonitoringConfigured,
      release: runtime.release,
      timestamp: new Date().toISOString(),
      version: runtime.version,
    });
  } catch (err: unknown) {
    return NextResponse.json({
      status: "error",
      message: err instanceof Error ? err.message : "Error",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}
