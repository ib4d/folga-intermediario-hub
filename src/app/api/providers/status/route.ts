import { getProviderStatus } from "@/lib/provider-status";
import { getAvailableOcrProviders } from "@/lib/providers/ocr";
import { getAvailableStorageProviders } from "@/lib/providers/storage";
import { NextResponse } from "next/server";

export async function GET() {
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
  });
}
