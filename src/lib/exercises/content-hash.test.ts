import { describe, it, expect } from "vitest";
import { getExerciseQuestionText, hashExerciseContent } from "./content-hash";

describe("content-hash", () => {
  it("extracts stems for each exercise type", () => {
    expect(
      getExerciseQuestionText({
        type: "multiple_choice",
        question: "Q?",
        options: ["A", "B", "C", "D"],
        correctIndex: 0,
        explanation: "e",
      }),
    ).toBe("Q?");
    expect(
      getExerciseQuestionText({
        type: "fill_in_the_blank",
        sentence: "I ___ home.",
        correctAnswer: "go",
        explanation: "e",
      }),
    ).toBe("I ___ home.");
  });

  it("produces stable hashes for the same stem", () => {
    const ex = {
      type: "fill_in_the_blank" as const,
      sentence: "Singular: cat. Plural: ___",
      correctAnswer: "cats",
      explanation: "e",
    };
    expect(hashExerciseContent(ex)).toBe(hashExerciseContent(ex));
    expect(hashExerciseContent(ex)).toHaveLength(32);
  });

  it("differs when stem changes", () => {
    const a = hashExerciseContent({
      type: "fill_in_the_blank",
      sentence: "A ___",
      correctAnswer: "x",
      explanation: "e",
    });
    const b = hashExerciseContent({
      type: "fill_in_the_blank",
      sentence: "B ___",
      correctAnswer: "x",
      explanation: "e",
    });
    expect(a).not.toBe(b);
  });
});
