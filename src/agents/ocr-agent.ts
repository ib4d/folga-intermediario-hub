import { Agent } from "@/core/registry";
import { SystemEvent } from "@/core/events";
import { enhanceOcrData } from "@/lib/ai/ocr-agent";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

type OcrCompletedPayload = {
  organizationId: string;
  documentId?: string;
  candidateId?: string;
  ocrData?: Record<string, unknown>;
  ocrStatus?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toInputJsonValue(value: unknown): Prisma.JsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.JsonValue;
}

function getPayload(event: SystemEvent): OcrCompletedPayload {
  const payload = event.payload;

  if (!isRecord(payload)) {
    return { organizationId: event.organizationId };
  }

  return {
    organizationId:
      typeof payload.organizationId === "string"
        ? payload.organizationId
        : event.organizationId,
    documentId: typeof payload.documentId === "string" ? payload.documentId : undefined,
    candidateId: typeof payload.candidateId === "string" ? payload.candidateId : undefined,
    ocrData: isRecord(payload.ocrData) ? payload.ocrData : undefined,
    ocrStatus: typeof payload.ocrStatus === "string" ? payload.ocrStatus : undefined,
  };
}

export const ocrAgent: Agent = {
  name: "OCR-Agent",
  role: "Intelligence",
  triggers: ["OCR_COMPLETED"],

  execute: async (event: SystemEvent) => {
    const payload = getPayload(event);

    if (!payload.organizationId || !payload.documentId) {
      console.warn("[OCR-Agent] Skipped: missing organizationId or documentId");
      return;
    }

    const document = await prisma.document.findFirst({
      where: {
        id: payload.documentId,
        organizationId: payload.organizationId,
      },
      select: {
        id: true,
        extractedData: true,
        ocrStatus: true,
      },
    });

    if (!document) {
      console.warn(`[OCR-Agent] Document not found: ${payload.documentId}`);
      return;
    }

    const sourceOcrData =
      payload.ocrData ??
      (isRecord(document.extractedData) ? document.extractedData : undefined);

    if (!sourceOcrData) {
      console.warn(`[OCR-Agent] No OCR data found for document: ${payload.documentId}`);
      return;
    }

    const enhanced = await enhanceOcrData(sourceOcrData);

    const updatedExtractedData = toInputJsonValue({
      ...sourceOcrData,
      _enhancement: {
        cleanedData: enhanced.cleanedData,
        confidenceScore: enhanced.confidenceScore,
        warnings: enhanced.warnings,
        suggestedUpdates: enhanced.suggestedUpdates,
        documentType: enhanced.documentType,
        processedAt: new Date().toISOString(),
      },
    });

    await prisma.document.update({
      where: { id: document.id },
      data: {
        extractedData: updatedExtractedData as Prisma.InputJsonValue,
        ocrStatus: "REVIEW_REQUIRED",
        isVerified: false,
      },
    });

    await prisma.auditLog.create({
      data: {
        organizationId: payload.organizationId,
        userId: event.userId ?? null,
        action: "OCR_AGENT_ENHANCED",
        entityType: "Document",
        entityId: document.id,
        details: toInputJsonValue({
          confidenceScore: enhanced.confidenceScore,
          warnings: enhanced.warnings,
          documentType: enhanced.documentType,
        }) as Prisma.InputJsonValue,
      },
    });

    console.log(
      `[OCR-Agent] Document ${document.id} enhanced. Confidence: ${enhanced.confidenceScore}`
    );
  },
};