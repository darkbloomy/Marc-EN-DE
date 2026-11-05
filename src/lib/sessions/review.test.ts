import { describe, expect, it } from "vitest";
import { toReviewItem } from "./review";

const row = {
  isCorrect: false,
  userAnswer: "wenn",
  pointsEarned: 0,
  question: "Ich bleibe, ___ es regnet.",
  correctAnswer: "weil",
  language: "de",
  category: "grammar",
  topic: "de_drill_adverbial",
  source: "db",
};

describe("toReviewItem", () => {
  it("uses the stored exercise payload when it parses", () => {
    const item = toReviewItem({
      ...row,
      exercisePayload: JSON.stringify({
        type: "fill_in_the_blank",
        sentence: "Ich bleibe, ___ es regnet.",
        correctAnswer: "weil",
        explanation: "weil gives the reason.",
        explanationCN: "weil 表示原因。",
      }),
    });

    expect(item.exercise.exercise).toMatchObject({
      type: "fill_in_the_blank",
      explanation: "weil gives the reason.",
    });
    expect(item.exercise.source).toBe("db");
    expect(item.result.userAnswer).toBe("wenn");
  });

  it("falls back to the stored question and answer when the payload is missing", () => {
    const item = toReviewItem({ ...row, exercisePayload: null });

    expect(item.exercise.exercise).toMatchObject({
      type: "free_text",
      prompt: "Ich bleibe, ___ es regnet.",
      sampleAnswer: "weil",
    });
  });

  it("falls back when the payload is not an exercise", () => {
    const item = toReviewItem({ ...row, exercisePayload: "{\"nope\":true}" });

    expect(item.exercise.exercise.type).toBe("free_text");
  });
});
