import { Agent } from "@/core/registry";
import { SystemEvent } from "@/core/events";
import { calculateCandidateScore } from "@/lib/ai/candidate-scoring";

export const scoringAgent: Agent = {
  name: "Scoring-Agent",
  role: "Analytics",
  triggers: ["STATUS_CHANGED", "OCR_COMPLETED", "DOCUMENT_UPLOADED"],
  execute: async (event: SystemEvent) => {
    const candidateId = event.payload.candidateId as string;
    if (!candidateId) return;

    console.log(`[Scoring-Agent] Recalculating score for candidate: ${candidateId}`);
    
    await calculateCandidateScore(candidateId).catch(err => 
      console.error(`[Scoring-Agent] Failed for candidate ${candidateId}:`, err)
    );
  }
};
