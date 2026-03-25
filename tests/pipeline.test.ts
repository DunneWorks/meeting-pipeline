import { describe, it, expect } from "vitest";
import { autoPriority, clampScore, calculateQualityScore, parseActionItems } from "../src/models/meeting";

describe("Meeting Model Utilities", () => {
  describe("autoPriority", () => {
    it("should return High when both scores are low (≤3)", () => {
      expect(autoPriority(2, 3)).toBe("High");
      expect(autoPriority(1, 1)).toBe("High");
      expect(autoPriority(3, 2)).toBe("High");
    });

    it("should return Low when both scores are high (≥7)", () => {
      expect(autoPriority(7, 8)).toBe("Low");
      expect(autoPriority(10, 10)).toBe("Low");
      expect(autoPriority(9, 7)).toBe("Low");
    });

    it("should return Medium for mixed scores", () => {
      expect(autoPriority(5, 5)).toBe("Medium");
      expect(autoPriority(2, 7)).toBe("Medium");
      expect(autoPriority(8, 3)).toBe("Medium");
    });
  });

  describe("clampScore", () => {
    it("should clamp scores to 1-10 range", () => {
      expect(clampScore(0)).toBe(1);
      expect(clampScore(5)).toBe(5);
      expect(clampScore(15)).toBe(10);
      expect(clampScore(-5)).toBe(1);
    });
  });

  describe("calculateQualityScore", () => {
    it("should average the two scores", () => {
      expect(calculateQualityScore(8, 6)).toBe(7);
      expect(calculateQualityScore(10, 10)).toBe(10);
      expect(calculateQualityScore(1, 3)).toBe(2);
    });
  });

  describe("parseActionItems", () => {
    it("should parse simple action items", () => {
      const text = "Review the document\nFinalize the presentation";
      const items = parseActionItems(text);
      expect(items).toHaveLength(2);
      expect(items[0].task).toBe("Review the document");
    });

    it("should extract assignees when present", () => {
      const text = "Send report - John\nReview budget - Sarah";
      const items = parseActionItems(text);
      expect(items[0].assignee).toBe("John");
      expect(items[1].assignee).toBe("Sarah");
    });

    it("should handle bullet points", () => {
      const text = "- Complete task\n- Another task";
      const items = parseActionItems(text);
      expect(items).toHaveLength(2);
    });
  });
});

describe("Pipeline Types", () => {
  it("should have correct PipelineMeeting structure", () => {
    const meeting = {
      meetingTitle: "Test Meeting",
      date: "2026-03-25",
      status: "Needs Review" as const,
      ideaConfidenceScore: 7,
      decisionApprovalScore: 6,
    };

    expect(meeting.meetingTitle).toBe("Test Meeting");
    expect(meeting.status).toBe("Needs Review");
  });
});
