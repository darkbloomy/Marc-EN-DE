import type { Exercise, FillInTheBlankExercise } from "./types";

const BLANK = "___";

/**
 * Make a fill-in item's blanks line up with its answers, or return null when
 * they can't be reconciled. Models sometimes write "______" (which would
 * split into two inputs) or several blanks with a single answer.
 */
export function normalizeFillInTheBlank(
  ex: FillInTheBlankExercise,
): FillInTheBlankExercise | null {
  if (typeof ex.sentence !== "string") return null;
  const sentence = ex.sentence.replace(/_{3,}/g, BLANK);
  const blankCount = sentence.split(BLANK).length - 1;
  if (blankCount === 0) return null;

  if (Array.isArray(ex.blanks) && ex.blanks.length > 0) {
    const valid = ex.blanks.every(
      (b) => typeof b?.correctAnswer === "string" && b.correctAnswer.trim(),
    );
    if (!valid || ex.blanks.length !== blankCount) return null;
    return { ...ex, sentence };
  }

  if (typeof ex.correctAnswer !== "string" || !ex.correctAnswer.trim()) return null;
  if (blankCount === 1) return { ...ex, sentence, blanks: undefined };

  const parts = ex.correctAnswer.split("|").map((p) => p.trim());
  if (parts.length !== blankCount || parts.some((p) => !p)) return null;
  return {
    ...ex,
    sentence,
    blanks: parts.map((correctAnswer) => ({ correctAnswer })),
  };
}

/** Drop or repair malformed AI exercises before they reach the student. */
export function sanitizeExercises(exercises: Exercise[]): Exercise[] {
  const out: Exercise[] = [];
  for (const ex of exercises) {
    if (!ex || typeof ex !== "object") continue;
    if (ex.type === "fill_in_the_blank") {
      const fixed = normalizeFillInTheBlank(ex);
      if (fixed) out.push(fixed);
      continue;
    }
    out.push(ex);
  }
  return out;
}
