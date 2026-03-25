export function qualityPrompt(meetingNotesJson: string): string {
  return `Score these meeting notes for quality. Return JSON only.

Scoring:
- decisionApprovalScore (1-10): 1-3=proposed, 4-6=aligned, 7-10=approved
- ideaConfidenceScore (1-10): 1-3=tentative, 4-6=forming, 7-10=confirmed

Flags: Only flag critical issues (conflicting info, missing assignee on action item).

Return:
{
  "decisionApprovalScore": number,
  "ideaConfidenceScore": number,
  "flags": ["brief issue"] (empty array if fine)
}

Notes:
${meetingNotesJson}`;
}
