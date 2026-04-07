import type { FirefliesWebhookPayload, FirefliesSegment } from "../types";

const FIREFLIES_API_BASE = "https://api.fireflies.ai/graphql";

export class FirefliesService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTranscript(meetingId: string): Promise<string> {
    const response = await fetch(`${FIREFLIES_API_BASE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query GetTranscript($meetingId: String!) {
            transcript(meetingId: $meetingId) {
              transcript
            }
          }
        `,
        variables: { meetingId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Fireflies API error: ${response.status}`);
    }

    const data = await response.json() as { data?: { transcript?: { transcript?: string } } };
    return data.data?.transcript?.transcript || "";
  }

  async getSegments(meetingId: string): Promise<FirefliesSegment[]> {
    const response = await fetch(`${FIREFLIES_API_BASE}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        query: `
          query GetTranscript($meetingId: String!) {
            transcript(meetingId: $meetingId) {
              segments {
                speaker_name
                text
                start_time
                end_time
              }
            }
          }
        `,
        variables: { meetingId },
      }),
    });

    if (!response.ok) {
      throw new Error(`Fireflies API error: ${response.status}`);
    }

    const data = await response.json() as { data?: { transcript?: { segments?: FirefliesSegment[] } } };
    return data.data?.transcript?.segments || [];
  }

  parseWebhookPayload(body: unknown): FirefliesWebhookPayload {
    const payload = body as FirefliesWebhookPayload;

    if (!payload.meeting?.id) {
      throw new Error("Invalid Fireflies webhook payload: missing meeting ID");
    }

    return payload;
  }

  extractOwnerEmail(payload: FirefliesWebhookPayload): string | undefined {
    return (
      payload.meeting.owner_email ||
      payload.meeting.host_email ||
      payload.meeting.attendees?.[0]?.email
    );
  }

  extractAttendees(payload: FirefliesWebhookPayload): string[] {
    return (
      payload.meeting.attendees?.map((a) => a.email) || []
    );
  }

  buildFullTranscript(payload: FirefliesWebhookPayload): string {
    if (payload.transcript) {
      return payload.transcript;
    }

    if (payload.transcript_segments) {
      return payload.transcript_segments
        .map((seg) => `${seg.speaker_name}: ${seg.text}`)
        .join("\n");
    }

    return "";
  }

  async validateWebhookSignature(
    payload: string,
    signature: string,
    secret: string
  ): Promise<boolean> {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(payload));
    const hexSig = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return signature === `sha256=${hexSig}`;
  }
}
