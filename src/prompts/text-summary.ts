export function textSummaryPrompt(transcript: string): string {
  return `You are an expert meeting analyst. Analyze the following meeting transcript and extract structured information.

Return ONLY valid JSON in this exact format, with no markdown fencing:
{
  "summary": "A concise 2-3 sentence summary of the meeting",
  "key_points": ["Key point 1", "Key point 2"],
  "decisions": ["Decision 1", "Decision 2"],
  "tasks": [
    {
      "title": "Clear, actionable task description",
      "owner": "Person's full name, or null if unassigned",
      "due": "Due date in YYYY-MM-DD format, or null if not mentioned",
      "context": "One sentence explaining why this task was created"
    }
  ]
}

Rules:
- summary: 2-3 sentences, plain text, no bullet points
- key_points: up to 7 items, each under 20 words
- decisions: only firm decisions that were made, not topics discussed
- tasks: every actionable item mentioned; include tasks even when owner is null

Transcript:
${transcript}`;
}
