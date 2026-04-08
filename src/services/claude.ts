import Anthropic from "@anthropic-ai/sdk";
import type { ProcessedTextResult, VisualAnalysis, QualityScores } from "../types";
import { textSummaryPrompt } from "../prompts/text-summary";
import { imageAnalysisPrompt } from "../prompts/image-analysis";
import { qualityPrompt } from "../prompts/quality-prompt";

export class ClaudeService {
  private anthropic: Anthropic;

  constructor(apiKey: string) {
    this.anthropic = new Anthropic({
      apiKey,
    });
  }

  async summarizeTranscript(transcript: string): Promise<ProcessedTextResult> {
    const prompt = textSummaryPrompt(transcript);

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return {
        meetingTitle: "Untitled Meeting",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        topics: [],
      };
    }

    return this.parseTranscriptResponse(content.text);
  }

  async analyzeImage(imageBase64: string, meetingId: string): Promise<VisualAnalysis> {
    const prompt = imageAnalysisPrompt();

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: imageBase64,
              },
            },
            {
              type: "text",
              text: prompt,
            },
          ],
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return {
        title: `Visual Analysis - ${meetingId}`,
        sourceMeetingId: meetingId,
        contextDiscovered: "Unable to analyze",
        intentIdentified: "Unknown",
        analysisDerived: "No analysis available",
        conclusion: "No conclusion",
        confidenceScore: 1,
        imageUrl: "",
      };
    }

    return this.parseImageResponse(content.text, meetingId);
  }

  async scoreQuality(meetingNotes: ProcessedTextResult): Promise<QualityScores> {
    const prompt = qualityPrompt(JSON.stringify(meetingNotes, null, 2));

    const message = await this.anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      return {
        ideaConfidenceScore: 5,
        decisionApprovalScore: 5,
        flags: ["Unexpected response type from Claude"],
      };
    }

    return this.parseQualityResponse(content.text);
  }

  async normalizeNotes(
    meetingNotes: ProcessedTextResult,
    scores: QualityScores
  ): Promise<ProcessedTextResult> {
    const normalized = { ...meetingNotes };

    if (normalized.keyPoints.length === 0 && meetingNotes.topics.length > 0) {
      normalized.keyPoints = meetingNotes.topics;
    }

    if (normalized.decisions.length === 0 && meetingNotes.actionItems.length > 0) {
      normalized.decisions = [];
    }

    return normalized;
  }

  private parseTranscriptResponse(text: string): ProcessedTextResult {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonStr);

      // New format: { summary, key_points, decisions, tasks: [{ title, owner, due, context }] }
      // Legacy format: { meetingTitle, keyPoints, actionItems, decisions, topics }
      const isNewFormat = parsed.summary !== undefined || parsed.key_points !== undefined;

      if (isNewFormat) {
        const tasks: Array<{ title: string; owner: string | null; due: string | null; context: string }> =
          parsed.tasks || [];
        return {
          meetingTitle: parsed.title || "Untitled Meeting",
          keyPoints: parsed.key_points || [],
          actionItems: tasks.map((t) => ({ task: t.title, assignee: t.owner ?? undefined })),
          decisions: parsed.decisions || [],
          topics: [],
          tasks,
        };
      }

      return {
        meetingTitle: parsed.meetingTitle || parsed.title || "Untitled Meeting",
        keyPoints: parsed.keyPoints || parsed.discussion_points || [],
        actionItems: parsed.actionItems || parsed.tasks || [],
        decisions: parsed.decisions || [],
        topics: parsed.topics || parsed.topics_covered || [],
      };
    } catch {
      return {
        meetingTitle: "Untitled Meeting",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        topics: [],
      };
    }
  }

  private parseImageResponse(text: string, meetingId: string): VisualAnalysis {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonStr);

      return {
        title: parsed.title || `Visual Analysis - ${meetingId}`,
        sourceMeetingId: meetingId,
        contextDiscovered: parsed.contextDiscovered || parsed.context || "",
        intentIdentified: parsed.intentIdentified || parsed.intent || "",
        analysisDerived: parsed.analysisDerived || parsed.analysis || "",
        conclusion: parsed.conclusion || "",
        confidenceScore: parsed.confidenceScore || parsed.confidence || 5,
        imageUrl: "",
      };
    } catch {
      return {
        title: `Visual Analysis - ${meetingId}`,
        sourceMeetingId: meetingId,
        contextDiscovered: "Unable to parse analysis",
        intentIdentified: "Unknown",
        analysisDerived: "Error parsing response",
        conclusion: "No conclusion",
        confidenceScore: 3,
        imageUrl: "",
      };
    }
  }

  private parseQualityResponse(text: string): QualityScores {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) || text.match(/(\{[\s\S]*\})/);
      const jsonStr = jsonMatch ? jsonMatch[1] : text;
      const parsed = JSON.parse(jsonStr);

      return {
        ideaConfidenceScore: Math.min(10, Math.max(1, parsed.ideaConfidenceScore || 5)),
        decisionApprovalScore: Math.min(10, Math.max(1, parsed.decisionApprovalScore || 5)),
        flags: parsed.flags || [],
      };
    } catch {
      const ideaMatch = text.match(/idea[_\s]confidence[_\s]score[:\s]*(\d+)/i);
      const decisionMatch = text.match(/decision[_\s]approval[_\s]score[:\s]*(\d+)/i);

      return {
        ideaConfidenceScore: ideaMatch ? parseInt(ideaMatch[1], 10) : 5,
        decisionApprovalScore: decisionMatch ? parseInt(decisionMatch[1], 10) : 5,
        flags: ["Could not parse JSON response"],
      };
    }
  }
}
