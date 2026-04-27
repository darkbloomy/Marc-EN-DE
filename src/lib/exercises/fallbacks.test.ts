import { describe, it, expect } from "vitest";
import { getFallbackExercises } from "./fallbacks";
import type { ExerciseType } from "./types";

const EXERCISE_TYPES: ExerciseType[] = [
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "reorder",
  "free_text",
];

describe("fallback exercises", () => {
  it("returns exercises for every type in German", () => {
    for (const type of EXERCISE_TYPES) {
      const exercises = getFallbackExercises("de", "de_noun_cases", type, 1);
      expect(exercises.length).toBe(1);
      expect(exercises[0].type).toBe(type);
    }
  });

  it("returns exercises for every type in English", () => {
    for (const type of EXERCISE_TYPES) {
      const exercises = getFallbackExercises("en", "en_tenses", type, 1);
      expect(exercises.length).toBe(1);
      expect(exercises[0].type).toBe(type);
    }
  });

  it("returns requested count by cycling", () => {
    const exercises = getFallbackExercises(
      "de",
      "de_noun_cases",
      "multiple_choice",
      5
    );
    expect(exercises.length).toBe(5);
    // Each exercise has the correct type
    expect(exercises.every((e) => e.type === "multiple_choice")).toBe(true);
  });

  it("multiple choice exercises have 4 options and valid correctIndex", () => {
    const exercises = getFallbackExercises(
      "en",
      "en_tenses",
      "multiple_choice",
      3
    );
    for (const ex of exercises) {
      if (ex.type === "multiple_choice") {
        expect(ex.options.length).toBe(4);
        expect(ex.correctIndex).toBeGreaterThanOrEqual(0);
        expect(ex.correctIndex).toBeLessThan(4);
      }
    }
  });

  it("fill_in_the_blank exercises have blanks in sentence", () => {
    const exercises = getFallbackExercises(
      "de",
      "de_verb_conjugation",
      "fill_in_the_blank",
      3
    );
    for (const ex of exercises) {
      if (ex.type === "fill_in_the_blank") {
        expect(ex.sentence).toContain("___");
        expect(ex.correctAnswer).toBeTruthy();
      }
    }
  });
});
