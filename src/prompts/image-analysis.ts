export function imageAnalysisPrompt(): string {
  return `You are analyzing a screenshot from a meeting presentation.

Tasks:
1. Describe the context: What is shown? Background, subject, type of content
2. Identify the intent: What is the purpose of this visual? (inform, persuade, compare, explain, etc.)
3. Extract key analysis: What are the main points, data, or information shown?
4. Provide a conclusion: What outcome or recommendation can be drawn from this visual?
5. Assess your confidence in this analysis (1-10, where 10 is very confident)

Format: Return as valid JSON with the following structure:
{
  "contextDiscovered": "string",
  "intentIdentified": "string",
  "analysisDerived": "string",
  "conclusion": "string",
  "confidenceScore": number
}

IMPORTANT: Return ONLY the JSON, no markdown formatting or additional text.`;
}
