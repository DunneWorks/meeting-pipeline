export function textSummaryPrompt(transcript: string): string {
  return `Summarize this meeting transcript concisely.

Return JSON:
{
  "meetingTitle": "Brief title (max 60 chars)",
  "keyPoints": ["Max 5 short points, each under 20 words"],
  "actionItems": [{"task": "Brief action", "assignee": "Name if mentioned"}],
  "decisions": ["Max 5 brief decisions"],
  "topics": ["3-5 main topics"]
}

Keep everything SHORT. Use simple language. Skip filler words.

Transcript:
${transcript}`;
}
