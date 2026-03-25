import { ClaudeService } from "../services/claude";
import type { QualityScores, ProcessedTextResult } from "../types";
import { autoPriority, clampScore } from "../models/meeting";

export class QualityScorer {
  private claudeService: ClaudeService;

  constructor(anthropicApiKey: string) {
    this.claudeService = new ClaudeService(anthropicApiKey);
  }

  async score(meetingNotes: ProcessedTextResult): Promise<{
    scores: QualityScores;
    normalizedNotes: ProcessedTextResult;
  }> {
    const scores = await this.claudeService.scoreQuality(meetingNotes);

    scores.ideaConfidenceScore = clampScore(scores.ideaConfidenceScore);
    scores.decisionApprovalScore = clampScore(scores.decisionApprovalScore);

    const normalizedNotes = await this.claudeService.normalizeNotes(
      meetingNotes,
      scores
    );

    return { scores, normalizedNotes };
  }

  determinePriority(
    ideaConfidenceScore: number,
    decisionApprovalScore: number
  ): "High" | "Medium" | "Low" {
    return autoPriority(ideaConfidenceScore, decisionApprovalScore);
  }

  calculateOverallQuality(
    ideaConfidenceScore: number,
    decisionApprovalScore: number
  ): number {
    return Math.round((ideaConfidenceScore + decisionApprovalScore) / 2);
  }
}
