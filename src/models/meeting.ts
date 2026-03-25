export function autoPriority(
  ideaConfidenceScore: number,
  decisionApprovalScore: number
): "High" | "Medium" | "Low" {
  if (ideaConfidenceScore <= 3 && decisionApprovalScore <= 3) {
    return "High";
  }

  if (ideaConfidenceScore >= 7 && decisionApprovalScore >= 7) {
    return "Low";
  }

  return "Medium";
}

export function clampScore(score: number): number {
  return Math.min(10, Math.max(1, Math.round(score)));
}

export function calculateQualityScore(
  ideaConfidence: number,
  decisionApproval: number
): number {
  return Math.round((ideaConfidence + decisionApproval) / 2);
}

export function parseActionItems(text: string): Array<{ task: string; assignee?: string }> {
  const items: Array<{ task: string; assignee?: string }> = [];
  const lines = text.split("\n").filter((line) => line.trim());

  for (const line of lines) {
    const cleaned = line.replace(/^[-•*]\s*/, "").trim();
    if (cleaned) {
      const match = cleaned.match(/^(.+?)\s*[-–:]\s*(.+)$/);
      if (match) {
        items.push({ task: match[1].trim(), assignee: match[2].trim() });
      } else {
        items.push({ task: cleaned });
      }
    }
  }

  return items;
}
