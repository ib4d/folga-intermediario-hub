import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRuntimeMetadata } from "@/lib/operational-status";
import { getProviderStatus } from "@/lib/provider-status";
import { NextResponse } from "next/server";

export async function GET() {
  let isPlatformAdmin = false;

  try {
    const session = await auth();
    const userId = session?.user?.id;

    if (userId) {
      const account = await prisma.user.findUnique({
        where: { id: userId },
        select: { isActive: true, isPlatformAdmin: true },
      });
      isPlatformAdmin = Boolean(account?.isActive && account.isPlatformAdmin);
    }

    await prisma.$queryRaw`SELECT 1`;

    if (!isPlatformAdmin) {
      return NextResponse.json(
        { status: "ok", timestamp: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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
      stripeConfigured: runtime.stripeConfigured,
      stripePortalConfigured: runtime.stripePortalConfigured,
      stripePaymentLinksConfigured: runtime.stripePaymentLinksConfigured,
      release: runtime.release,
      timestamp: new Date().toISOString(),
      version: runtime.version,
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (err: unknown) {
    return NextResponse.json(
      {
        status: "error",
        ...(isPlatformAdmin && err instanceof Error ? { message: err.message } : {}),
        timestamp: new Date().toISOString(),
      },
      { status: 503, headers: { "Cache-Control": "no-store" } }
    );
  }
}
