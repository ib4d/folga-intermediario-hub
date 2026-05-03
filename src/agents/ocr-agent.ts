import { Agent } from "@/core/registry";
import { SystemEvent } from "@/core/events";
import { enhanceOcrData } from "@/lib/ai/ocr-agent";
import { prisma } from "@/lib/prisma";

export const ocrAgent: Agent = {
  name: "OCR-Agent",
  role: "Intelligence",
  triggers: ["OCR_COMPLETED"],
  execute: async (event: SystemEvent) => {
    console.log(`[OCR-Agent] Processing OCR for document: ${event.payload.documentId}`);
    
    const { documentId, ocrData } = event.payload;

    // 1. AI Enhancement
    const enhanced = await enhanceOcrData(ocrData);

    // 2. Update Document with Clean Data
    await prisma.document.update({
      where: { id: documentId },
      data: {
        extractedData: enhanced.cleanedData as any,
        ocrStatus: enhanced.confidenceScore > 0.9 ? "AUTO_VERIFIED" : "REVIEW_REQUIRED",
        isVerified: enhanced.confidenceScore > 0.9,
      }
    });

    console.log(`[OCR-Agent] Document ${documentId} updated with confidence ${enhanced.confidenceScore}`);
  }
};
