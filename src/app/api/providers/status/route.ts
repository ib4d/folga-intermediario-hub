import { getProviderStatus } from "@/lib/provider-status";
import { getAvailableOcrProviders } from "@/lib/providers/ocr";
import { getAvailableStorageProviders } from "@/lib/providers/storage";
import { NextResponse } from "next/server";
import { getCurrentPlatformAdmin } from "@/lib/tenant";

export async function GET() {
  const platformAdmin = await getCurrentPlatformAdmin();
  if (!platformAdmin) {
    return NextResponse.json(
      { error: "Acceso denegado: se requiere administración de plataforma." },
      { status: 403, headers: { "Cache-Control": "no-store" } }
    );
  }

  const providerStatus = getProviderStatus();
  const { storage, ocr } = providerStatus;

  return NextResponse.json({
    current: {
      storage,
      ocr,
    },
    available: {
      storage: getAvailableStorageProviders(),
      ocr: getAvailableOcrProviders(),
    },
    timestamp: new Date().toISOString(),
  }, { headers: { "Cache-Control": "no-store" } });
}
