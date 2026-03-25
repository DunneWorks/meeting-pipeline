import { Client } from "@notionhq/client";
import type {
  PipelineMeeting,
  VisualAnalysis,
  OfficialRecord,
  NotionPage,
} from "../types";

export class NotionService {
  private notion: Client;
  private pipelineDbId: string;
  private visualDbId: string;
  private officialDbId: string;

  constructor(
    apiKey: string,
    pipelineDbId: string,
    visualDbId: string,
    officialDbId: string
  ) {
    console.log("Initializing Notion client with API key:", apiKey ? "key present" : "NO KEY");
    this.notion = new Client({ auth: apiKey });
    this.pipelineDbId = pipelineDbId;
    this.visualDbId = visualDbId;
    this.officialDbId = officialDbId;
    console.log("Database IDs:", { pipelineDbId, visualDbId, officialDbId });
  }

  async createMeetingPage(meeting: PipelineMeeting): Promise<NotionPage> {
    console.log("Creating meeting page:", meeting.meetingTitle);
    
    const meetingTitle = meeting.meetingTitle;
    const status = meeting.status;
    const ideaConfidenceScore = meeting.ideaConfidenceScore;
    const decisionApprovalScore = meeting.decisionApprovalScore;
    const priority = meeting.priority;
    const keyPoints = meeting.keyPoints;
    const actionItems = meeting.actionItems;
    const decisions = meeting.decisions;
    const transcript = meeting.transcript;
    const linkToDb2 = meeting.linkToDb2VisualAnalysis;
    const date = meeting.date;

    const page = await this.notion.pages.create({
      parent: { database_id: this.pipelineDbId },
      properties: {
        "Meeting title": {
          title: [{ text: { content: meetingTitle } }],
        },
        Status: {
          status: { name: status },
        },
        "Idea Confidence Score": {
          number: ideaConfidenceScore ?? null,
        },
        "Decision Approval Score": {
          number: decisionApprovalScore ?? null,
        },
        Priority: {
          select: priority ? { name: priority } : null,
        },
        "Key Points": {
          rich_text: keyPoints
            ? [{ type: "text", text: { content: keyPoints } }]
            : [],
        },
        "Action Items": {
          rich_text: actionItems
            ? [{ type: "text", text: { content: actionItems } }]
            : [],
        },
        Decisions: {
          rich_text: decisions
            ? [{ type: "text", text: { content: decisions } }]
            : [],
        },
        Transcript: {
          rich_text: transcript
            ? [{ type: "text", text: { content: transcript } }]
            : [],
        },
        "Link to DB2 (Visual Analysis)": {
          url: linkToDb2 ?? null,
        },
        ...(date ? { Date: { date: { start: date } } } : {}),
      },
    });

    const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`;

    return {
      id: page.id,
      url: pageUrl,
    };
  }

  async createVisualAnalysisPage(visual: VisualAnalysis): Promise<NotionPage> {
    const page = await this.notion.pages.create({
      parent: { database_id: this.visualDbId },
      properties: {
        title: {
          title: [{ text: { content: visual.title } }],
        },
        "Confidence Score": {
          number: visual.confidenceScore,
        },
      },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: [
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "Context Discovered" } }],
          },
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: visual.contextDiscovered } }],
          },
        },
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "Intent Identified" } }],
          },
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: visual.intentIdentified } }],
          },
        },
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "Analysis Derived" } }],
          },
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: visual.analysisDerived } }],
          },
        },
        {
          type: "heading_2",
          heading_2: {
            rich_text: [{ type: "text", text: { content: "Conclusion" } }],
          },
        },
        {
          type: "paragraph",
          paragraph: {
            rich_text: [{ type: "text", text: { content: visual.conclusion } }],
          },
        },
        {
          type: "image",
          image: {
            type: "external",
            external: { url: visual.imageUrl },
          },
        },
      ],
    });

    const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`;

    return {
      id: page.id,
      url: pageUrl,
    };
  }

  private splitText(text: string, maxLength: number = 1900): string[] {
    const chunks: string[] = [];
    let remaining = text;
    
    while (remaining.length > maxLength) {
      let splitIndex = remaining.lastIndexOf("\n", maxLength);
      if (splitIndex === -1 || splitIndex === 0) {
        splitIndex = maxLength;
      }
      chunks.push(remaining.substring(0, splitIndex).trim());
      remaining = remaining.substring(splitIndex).trim();
    }
    
    if (remaining.length > 0) {
      chunks.push(remaining);
    }
    
    return chunks;
  }

  async createOfficialRecord(record: OfficialRecord): Promise<NotionPage> {
    const page = await this.notion.pages.create({
      parent: { database_id: this.officialDbId },
      properties: {
        title: {
          title: [{ text: { content: record.title } }],
        },
        "Quality Score": {
          number: record.qualityScore,
        },
        "Review Status": {
          select: { name: record.reviewStatus },
        },
      },
    });

    const blocks: Record<string, unknown>[] = [];

    blocks.push({
      type: "heading_1",
      heading_1: {
        rich_text: [{ type: "text" as const, text: { content: "📋 Meeting Summary" } }],
      },
    });

    blocks.push({ type: "divider", divider: {} });

    blocks.push({
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text" as const, text: { content: "Combined Context" } }],
      },
    });

    const contextChunks = this.splitText(record.combinedContext);
    for (const chunk of contextChunks) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text" as const, text: { content: chunk } }],
        },
      });
    }

    blocks.push({ type: "divider", divider: {} });

    blocks.push({
      type: "heading_2",
      heading_2: {
        rich_text: [{ type: "text" as const, text: { content: "📌 Categorized Findings" } }],
      },
    });

    const findingsChunks = this.splitText(record.categorizedFindings);
    for (const chunk of findingsChunks) {
      blocks.push({
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text" as const, text: { content: chunk } }],
        },
      });
    }

    blocks.push({ type: "divider", divider: {} });

    const statusColor = record.qualityScore >= 7 ? "green" : record.qualityScore >= 4 ? "yellow" : "red";
    const statusIcon = record.qualityScore >= 7 ? "✅" : record.qualityScore >= 4 ? "⚠️" : "❌";

    blocks.push({
      type: "callout",
      callout: {
        rich_text: [{
          type: "text",
          text: { content: `Quality Score: ${record.qualityScore}/10 | Status: ${record.reviewStatus}` }
        }],
        icon: { emoji: statusIcon },
        color: statusColor,
      },
    });

    await this.notion.blocks.children.append({
      block_id: page.id,
      children: blocks,
    });

    const pageUrl = `https://www.notion.so/${page.id.replace(/-/g, "")}`;

    return {
      id: page.id,
      url: pageUrl,
    };
  }

  async linkToSourceMeeting(
    pageId: string,
    sourceMeetingId: string,
    relationType: "pipeline" | "visual"
  ): Promise<void> {
    const pageUrl = `https://www.notion.so/${sourceMeetingId.replace(/-/g, "")}`;
    await this.notion.pages.update({
      page_id: pageId,
      properties: {
        "Source Meeting": {
          rich_text: [{ type: "text", text: { content: pageUrl } }],
        },
      },
    });
  }

  async updatePage(
    pageId: string,
    properties: Parameters<typeof this.notion.pages.update>[0]["properties"]
  ): Promise<void> {
    await this.notion.pages.update({
      page_id: pageId,
      properties,
    });
  }
}
