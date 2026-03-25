import { ClaudeService } from "../services/claude";
import type { ProcessedTextResult } from "../types";

export class TextProcessor {
  private claudeService: ClaudeService;

  constructor(claudeApiKey: string) {
    this.claudeService = new ClaudeService(claudeApiKey);
  }

  async process(transcript: string): Promise<ProcessedTextResult> {
    if (!transcript || transcript.trim().length === 0) {
      return {
        meetingTitle: "Untitled Meeting",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        topics: [],
      };
    }

    const result = await this.claudeService.summarizeTranscript(transcript);
    return result;
  }

  formatKeyPoints(points: string[]): string {
    if (points.length === 0) return "";
    return points.map((p) => `- ${p}`).join("\n");
  }

  formatActionItems(
    items: Array<{ task: string; assignee?: string }>
  ): string {
    if (items.length === 0) return "";
    return items
      .map((item) => {
        if (item.assignee) {
          return `- ${item.task} (Assigned: ${item.assignee})`;
        }
        return `- ${item.task}`;
      })
      .join("\n");
  }

  formatDecisions(decisions: string[]): string {
    if (decisions.length === 0) return "";
    return decisions.map((d) => `- ${d}`).join("\n");
  }
}
