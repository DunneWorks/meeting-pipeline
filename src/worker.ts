import { MeetingPipeline, sendNotification } from "./index";
import { ImageProcessor } from "./processors/image-processor";
import type { FirefliesWebhookPayload } from "./types";

interface Env {
  FIREFLIES_API_KEY: string;
  FIREFLIES_WEBHOOK_SECRET: string;
  ANTHROPIC_API_KEY: string;
  NOTIFICATION_EMAIL: string;
  ASANA_ACCESS_TOKEN?: string;
  ASANA_PROJECT_GID?: string;
  SLACK_WEBHOOK_URL?: string;
}

function createPipeline(env: Env): MeetingPipeline {
  return new MeetingPipeline({
    firefliesApiKey: env.FIREFLIES_API_KEY,
    anthropicApiKey: env.ANTHROPIC_API_KEY,
    notificationEmail: env.NOTIFICATION_EMAIL,
    asanaAccessToken: env.ASANA_ACCESS_TOKEN,
    asanaProjectGid: env.ASANA_PROJECT_GID,
  });
}

async function handleWebhook(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as FirefliesWebhookPayload;

    if (!body.meeting?.id) {
      return new Response(
        JSON.stringify({ error: "Invalid payload: missing meeting ID" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const pipeline = createPipeline(env);
    const result = await pipeline.processMeeting(body);

    const ownerEmail =
      body.meeting.owner_email ||
      body.meeting.host_email ||
      env.NOTIFICATION_EMAIL;

    await sendNotification(ownerEmail, result.meetingTitle, env.SLACK_WEBHOOK_URL);

    return new Response(
      JSON.stringify({
        success: true,
        meetingTitle: result.meetingTitle,
        asanaTasksCreated: result.asanaTasks.length,
        visualAnalyses: result.visualAnalyses.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Pipeline error:", error);
    return new Response(
      JSON.stringify({
        error: "Pipeline processing failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleHealth(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: "healthy",
      timestamp: new Date().toISOString(),
      service: "meeting-pipeline",
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}

async function handleAnalyzeImage(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as { imageUrl: string; meetingId?: string };

    if (!body.imageUrl) {
      return new Response(
        JSON.stringify({ error: "Missing imageUrl" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const imageProcessor = new ImageProcessor(env.ANTHROPIC_API_KEY);
    const meetingId = body.meetingId || `manual-${Date.now()}`;
    const result = await imageProcessor.processSingle(body.imageUrl, meetingId);

    return new Response(
      JSON.stringify({ analysis: result }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Image analysis error:", error);
    return new Response(
      JSON.stringify({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function handleAnalyzeVideo(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  try {
    const body = await request.json() as { videoUrl: string; frames?: string[]; meetingId?: string };

    if (!body.videoUrl && (!body.frames || body.frames.length === 0)) {
      return new Response(
        JSON.stringify({ error: "Missing videoUrl or frames array" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const imageProcessor = new ImageProcessor(env.ANTHROPIC_API_KEY);
    const meetingId = body.meetingId || `video-${Date.now()}`;
    const framesToAnalyze = body.frames && body.frames.length > 0 ? body.frames : [body.videoUrl];
    const results = await imageProcessor.process(framesToAnalyze, meetingId);

    return new Response(
      JSON.stringify({ frameCount: results.length, analyses: results }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Video analysis error:", error);
    return new Response(
      JSON.stringify({
        error: "Analysis failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

export default {
  async fetch(request: Request, env: Env, _ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/health") return handleHealth();
    if (url.pathname === "/webhook/fireflies" && request.method === "POST") return handleWebhook(request, env);
    if (url.pathname === "/analyze-image" && request.method === "POST") return handleAnalyzeImage(request, env);
    if (url.pathname === "/analyze-video" && request.method === "POST") return handleAnalyzeVideo(request, env);

    return new Response("Not found", { status: 404 });
  },
};
