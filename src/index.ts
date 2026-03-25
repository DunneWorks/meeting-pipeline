import { TextProcessor } from "./processors/text-processor";
import { ImageProcessor } from "./processors/image-processor";
import { QualityScorer } from "./processors/quality-scorer";
import { FirefliesService } from "./services/fireflies";
import { NotionService } from "./services/notion";
import type {
  FirefliesWebhookPayload,
  PipelineMeeting,
  VisualAnalysis,
  OfficialRecord,
  NotionPage,
} from "./types";

export interface PipelineConfig {
  firefliesApiKey: string;
  notionApiKey: string;
  anthropicApiKey: string;
  notionPipelineDbId: string;
  notionVisualDbId: string;
  notionOfficialDbId: string;
  notificationEmail: string;
}

export class MeetingPipeline {
  private fireflies: FirefliesService;
  private notion: NotionService;
  private textProcessor: TextProcessor;
  private imageProcessor: ImageProcessor;
  private qualityScorer: QualityScorer;
  private config: PipelineConfig;

  constructor(config: PipelineConfig) {
    this.config = config;
    this.fireflies = new FirefliesService(config.firefliesApiKey);
    this.notion = new NotionService(
      config.notionApiKey,
      config.notionPipelineDbId,
      config.notionVisualDbId,
      config.notionOfficialDbId
    );
    this.textProcessor = new TextProcessor(config.anthropicApiKey);
    this.imageProcessor = new ImageProcessor(config.anthropicApiKey);
    this.qualityScorer = new QualityScorer(config.anthropicApiKey);
  }

  async processMeeting(
    payload: FirefliesWebhookPayload
  ): Promise<{
    pipelinePage: NotionPage;
    visualPages: NotionPage[];
    officialPage: NotionPage;
  }> {
    const meetingId = payload.meeting.id;
    const ownerEmail =
      this.fireflies.extractOwnerEmail(payload) ||
      this.config.notificationEmail;
    const attendees = this.fireflies.extractAttendees(payload);
    const transcript = this.fireflies.buildFullTranscript(payload);

    const textResult = await this.textProcessor.process(transcript);

    const { scores, normalizedNotes } = await this.qualityScorer.score(
      textResult
    );

    const priority = this.qualityScorer.determinePriority(
      scores.ideaConfidenceScore,
      scores.decisionApprovalScore
    );

    const visualResults: VisualAnalysis[] = [];
    const visualPages: NotionPage[] = [];

    if (payload.screenshots && payload.screenshots.length > 0) {
      const visualAnalyses = await this.imageProcessor.process(
        payload.screenshots,
        meetingId
      );
      visualResults.push(...visualAnalyses);
    }

    const meetingPageData: PipelineMeeting = {
      meetingTitle: textResult.meetingTitle,
      date: payload.meeting.date,
      status: "Needs Review",
      priority,
      ideaConfidenceScore: scores.ideaConfidenceScore,
      decisionApprovalScore: scores.decisionApprovalScore,
      ownerEmail,
      attendees,
      keyPoints: this.textProcessor.formatKeyPoints(normalizedNotes.keyPoints),
      actionItems: this.textProcessor.formatActionItems(
        normalizedNotes.actionItems
      ),
      decisions: this.textProcessor.formatDecisions(normalizedNotes.decisions),
      transcript,
    };

    const pipelinePage = await this.notion.createMeetingPage(meetingPageData);

    for (const visual of visualResults) {
      const page = await this.notion.createVisualAnalysisPage(visual);
      await this.notion.linkToSourceMeeting(
        page.id,
        pipelinePage.id,
        "visual"
      );
      visualPages.push(page);
    }

    if (visualPages.length > 0) {
      await this.notion.updatePage(pipelinePage.id, {
        "Link to DB2 (Visual Analysis)": {
          url: visualPages[0].url,
        },
      });
    }

    const overallQuality = this.qualityScorer.calculateOverallQuality(
      scores.ideaConfidenceScore,
      scores.decisionApprovalScore
    );

    const officialRecord: OfficialRecord = {
      title: `Official: ${textResult.meetingTitle}`,
      sourceMeetingId: pipelinePage.id,
      sourceVisualAnalysisId: visualPages[0]?.id,
      combinedContext: this.buildCombinedContext(textResult, visualResults),
      categorizedFindings: this.buildCategorizedFindings(
        normalizedNotes,
        visualResults
      ),
      qualityScore: overallQuality,
      reviewStatus: "Needs Review",
    };

    const officialPage = await this.notion.createOfficialRecord(officialRecord);
    await this.notion.linkToSourceMeeting(
      officialPage.id,
      pipelinePage.id,
      "pipeline"
    );

    return {
      pipelinePage,
      visualPages,
      officialPage,
    };
  }

  private buildCombinedContext(
    textResult: {
      meetingTitle: string;
      keyPoints: string[];
      topics: string[];
    },
    visualResults: VisualAnalysis[]
  ): string {
    const parts: string[] = [];

    parts.push(`Meeting: ${textResult.meetingTitle}`);

    if (textResult.keyPoints.length > 0) {
      parts.push("Key Points:");
      textResult.keyPoints.slice(0, 5).forEach((p) => parts.push(`• ${p}`));
    }

    if (textResult.topics.length > 0) {
      parts.push("");
      parts.push("Topics: " + textResult.topics.slice(0, 5).join(", "));
    }

    if (visualResults.length > 0) {
      parts.push("");
      parts.push("Visuals:");
      visualResults.forEach((v) => parts.push(`• ${v.title}: ${v.conclusion}`));
    }

    return parts.join("\n");
  }

  private buildCategorizedFindings(
    textResult: {
      meetingTitle: string;
      keyPoints: string[];
      actionItems: Array<{ task: string; assignee?: string }>;
      decisions: string[];
      topics: string[];
    },
    visualResults: VisualAnalysis[]
  ): string {
    const parts: string[] = [];

    if (textResult.actionItems.length > 0) {
      textResult.actionItems.slice(0, 5).forEach((item) => {
        const assignee = item.assignee ? ` (${item.assignee})` : "";
        parts.push(`☐ ${item.task}${assignee}`);
      });
    }

    if (textResult.decisions.length > 0) {
      textResult.decisions.slice(0, 5).forEach((d) => parts.push(`✓ ${d}`));
    }

    return parts.join("\n");
  }
}

export async function sendNotification(
  ownerEmail: string,
  meetingTitle: string,
  pipelinePageUrl: string,
  webhookUrl?: string
): Promise<void> {
  const subject = `Meeting Processed: ${meetingTitle} - Review Required`;
  const body = `
A new meeting has been processed and requires your review.

Meeting: ${meetingTitle}
Status: Needs Review

Please review the meeting notes here: ${pipelinePageUrl}

---

This is an automated message from the Meeting Pipeline.
  `.trim();

  if (webhookUrl) {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: `📋 *Meeting Processed: ${meetingTitle}*\nReview required: ${pipelinePageUrl}`,
      }),
    });
  }

  console.log(`Notification would be sent to ${ownerEmail}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
}
