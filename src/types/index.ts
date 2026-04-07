export type PipelinePriority = "High" | "Medium" | "Low";

export type PipelineStatus =
  | "Needs Review"
  | "In Progress"
  | "Completed"
  | "Archived";

export type OfficialStatus = "Needs Review" | "Official";

export interface PipelineMeeting {
  meetingTitle: string;
  date?: string | null;
  priority?: PipelinePriority | null;
  status: PipelineStatus;
  ideaConfidenceScore?: number | null;
  decisionApprovalScore?: number | null;
  attendees?: string[] | null;
  ownerEmail?: string | null;
  keyPoints?: string | null;
  actionItems?: string | null;
  decisions?: string | null;
  transcript?: string | null;
  linkToDb2VisualAnalysis?: string | null;
}

export interface VisualAnalysis {
  title: string;
  sourceMeetingId: string;
  contextDiscovered: string;
  intentIdentified: string;
  analysisDerived: string;
  conclusion: string;
  confidenceScore: number;
  imageUrl: string;
}

export interface OfficialRecord {
  title: string;
  sourceMeetingId: string;
  sourceVisualAnalysisId?: string;
  combinedContext: string;
  categorizedFindings: string;
  qualityScore: number;
  reviewStatus: OfficialStatus;
  officialDate?: string;
  approvedBy?: string;
}

export interface FirefliesWebhookPayload {
  meeting: {
    id: string;
    title: string;
    date: string;
    duration: number;
    attendees: Array<{
      name: string;
      email: string;
    }>;
    host_email?: string;
    owner_email?: string;
  };
  transcript_url?: string;
  transcript?: string;
  transcript_segments?: FirefliesSegment[];
  screenshots?: string[];
  video_url?: string;
}

export interface FirefliesSegment {
  speaker_name: string;
  text: string;
  start_time: number;
  end_time: number;
}

export interface ExtractedTask {
  title: string;
  owner: string | null;
  due: string | null;
  context: string;
}

export interface ProcessedTextResult {
  meetingTitle: string;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee?: string;
  }>;
  decisions: string[];
  topics: string[];
  tasks?: ExtractedTask[];
}

export interface QualityScores {
  ideaConfidenceScore: number;
  decisionApprovalScore: number;
  flags: string[];
}

export interface NotionPage {
  id: string;
  url: string;
}
