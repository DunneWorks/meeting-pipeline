import { TextProcessor } from "./processors/text-processor";
import { ImageProcessor } from "./processors/image-processor";
import { FirefliesService } from "./services/fireflies";
import { AsanaService } from "./services/asana";
import type { AsanaTaskResult } from "./services/asana";
import type { FirefliesWebhookPayload, VisualAnalysis } from "./types";

export interface PipelineConfig {
  firefliesApiKey: string;
  anthropicApiKey: string;
  notificationEmail: string;
  asanaAccessToken?: string;
  asanaProjectGid?: string;
}

export interface ProcessingResult {
  meetingTitle: string;
  asanaTasks: AsanaTaskResult[];
  visualAnalyses: VisualAnalysis[];
}

export class MeetingPipeline {
  private fireflies: FirefliesService;
  private asana: AsanaService | null;
  private textProcessor: TextProcessor;
  private imageProcessor: ImageProcessor;

  constructor(config: PipelineConfig) {
    this.fireflies = new FirefliesService(config.firefliesApiKey);
    this.asana =
      config.asanaAccessToken && config.asanaProjectGid
        ? new AsanaService(config.asanaAccessToken, config.asanaProjectGid)
        : null;
    this.textProcessor = new TextProcessor(config.anthropicApiKey);
    this.imageProcessor = new ImageProcessor(config.anthropicApiKey);
  }

  async processMeeting(payload: FirefliesWebhookPayload): Promise<ProcessingResult> {
    const transcript = this.fireflies.buildFullTranscript(payload);
    const textResult = await this.textProcessor.process(transcript);

    const asanaTasks: AsanaTaskResult[] = [];
    if (this.asana && textResult.tasks && textResult.tasks.length > 0) {
      const results = await Promise.all(
        textResult.tasks.map((task) =>
          this.asana!.createTask(task).catch((err) => {
            console.error(`Failed to create Asana task "${task.title}":`, err);
            return null;
          })
        )
      );
      asanaTasks.push(...(results.filter(Boolean) as AsanaTaskResult[]));
    }

    const visualAnalyses: VisualAnalysis[] = [];
    if (payload.screenshots && payload.screenshots.length > 0) {
      const analyses = await this.imageProcessor.process(
        payload.screenshots,
        payload.meeting.id
      );
      visualAnalyses.push(...analyses);
    }

    return {
      meetingTitle: textResult.meetingTitle,
      asanaTasks,
      visualAnalyses,
    };
  }

  async analyzeImageOnDemand(imageUrl: string, meetingId?: string): Promise<VisualAnalysis> {
    return this.imageProcessor.processSingle(imageUrl, meetingId || `on-demand-${Date.now()}`);
  }

  async analyzeVideoFrames(frames: string[], meetingId?: string): Promise<VisualAnalysis[]> {
    return this.imageProcessor.process(frames, meetingId || `video-${Date.now()}`);
  }
}

export async function sendNotification(
  ownerEmail: string,
  meetingTitle: string,
  webhookUrl?: string
): Promise<void> {
  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `Meeting processed: *${meetingTitle}*`,
      }),
    });
  }

  console.log(`Notification for ${ownerEmail} — Meeting: ${meetingTitle}`);
}
