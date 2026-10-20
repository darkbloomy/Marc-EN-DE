import { describe, it, expect } from "vitest";
import { normalizeFillInTheBlank, sanitizeExercises } from "./sanitize";
import type { Exercise, FillInTheBlankExercise } from "./types";

function fill(sentence: string, extra: Partial<FillInTheBlankExercise> = {}): FillInTheBlankExercise {
  return { type: "fill_in_the_blank", sentence, correctAnswer: "him", explanation: "x", ...extra };
}

describe("normalizeFillInTheBlank", () => {
  it("keeps a valid single blank", () => {
    expect(normalizeFillInTheBlank(fill("I saw ___ yesterday."))?.sentence).toBe(
      "I saw ___ yesterday.",
    );
  });

  it("collapses long underscore runs into one blank", () => {
    expect(normalizeFillInTheBlank(fill("I saw ______ yesterday."))?.sentence).toBe(
      "I saw ___ yesterday.",
    );
  });

  it("splits a pipe-separated answer across several blanks", () => {
    const fixed = normalizeFillInTheBlank(
      fill("___ gave ___ the book.", { correctAnswer: "She | him" }),
    );
    expect(fixed?.blanks).toEqual([{ correctAnswer: "She" }, { correctAnswer: "him" }]);
  });

  it("drops items whose blanks and answers don't line up", () => {
    expect(normalizeFillInTheBlank(fill("___ gave ___ the book."))).toBeNull();
    expect(
      normalizeFillInTheBlank(
        fill("___ gave ___ the book.", { blanks: [{ correctAnswer: "She" }] }),
      ),
    ).toBeNull();
    expect(normalizeFillInTheBlank(fill("No blank here."))).toBeNull();
    expect(normalizeFillInTheBlank(fill("I saw ___.", { correctAnswer: "" }))).toBeNull();
  });
});

describe("sanitizeExercises", () => {
  it("drops broken fill-ins and keeps other types", () => {
    const tf: Exercise = { type: "true_false", statement: "s", isTrue: true, explanation: "x" };
    const out = sanitizeExercises([fill("___ and ___"), fill("I saw ___."), tf]);
    expect(out.map((e) => e.type)).toEqual(["fill_in_the_blank", "true_false"]);
  });
});
