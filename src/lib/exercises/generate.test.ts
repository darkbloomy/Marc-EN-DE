import { describe, it, expect } from "vitest";
import { parseExerciseResponse } from "./generate";

describe("parseExerciseResponse", () => {
  it("parses a single exercise JSON object", () => {
    const json = JSON.stringify({
      type: "multiple_choice",
      question: "Test?",
      options: ["A", "B", "C", "D"],
      correctIndex: 0,
      explanation: "Because.",
    });
    const result = parseExerciseResponse(json, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("multiple_choice");
  });

  it("parses an array of exercises", () => {
    const json = JSON.stringify([
      {
        type: "true_false",
        statement: "True statement",
        isTrue: true,
        explanation: "Yes.",
      },
      {
        type: "true_false",
        statement: "False statement",
        isTrue: false,
        explanation: "No.",
      },
    ]);
    const result = parseExerciseResponse(json, 2);
    expect(result).toHaveLength(2);
  });

  it("strips markdown code fences", () => {
    const json = '```json\n{"type":"true_false","statement":"Test","isTrue":true,"explanation":"Yes."}\n```';
    const result = parseExerciseResponse(json, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("true_false");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseExerciseResponse("not json", 1)).toThrow();
  });
});
