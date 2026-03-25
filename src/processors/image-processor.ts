import { ClaudeService } from "../services/claude";
import type { VisualAnalysis } from "../types";

export class ImageProcessor {
  private claudeService: ClaudeService;

  constructor(claudeApiKey: string) {
    this.claudeService = new ClaudeService(claudeApiKey);
  }

  async process(
    imageUrls: string[],
    meetingId: string
  ): Promise<VisualAnalysis[]> {
    if (!imageUrls || imageUrls.length === 0) {
      return [];
    }

    const results: VisualAnalysis[] = [];

    for (const imageUrl of imageUrls) {
      try {
        const imageResponse = await fetch(imageUrl);
        const imageData = await imageResponse.arrayBuffer();
        const base64Image = btoa(
          new Uint8Array(imageData).reduce(
            (data, byte) => data + String.fromCharCode(byte),
            ""
          )
        );

        const result = await this.claudeService.analyzeImage(base64Image, meetingId);
        result.imageUrl = imageUrl;
        results.push(result);
      } catch (error) {
        console.error("Error processing image:", imageUrl, error);
        results.push({
          title: `Visual Analysis - ${meetingId}`,
          sourceMeetingId: meetingId,
          contextDiscovered: "Error fetching image",
          intentIdentified: "Unknown",
          analysisDerived: "Error analyzing image",
          conclusion: "Unable to analyze",
          confidenceScore: 1,
          imageUrl,
        });
      }
    }

    return results;
  }

  async processSingle(
    imageUrl: string,
    meetingId: string
  ): Promise<VisualAnalysis> {
    const results = await this.process([imageUrl], meetingId);
    return results[0];
  }
}
