import { createHash } from "node:crypto";
import type { Exercise } from "./types";

/** Identifying stem text used for history + result persistence. */
export function getExerciseQuestionText(exercise: Exercise): string {
  switch (exercise.type) {
    case "multiple_choice":
      return exercise.question;
    case "fill_in_the_blank":
      return exercise.sentence;
    case "true_false":
      return exercise.statement;
    case "reorder":
      return `${exercise.instruction}: ${exercise.scrambledItems.join(" ")}`;
    case "free_text":
      return exercise.prompt;
  }
}

/** Stable short hash of exercise type + stem for anti-repeat exclusion. */
export function hashExerciseContent(exercise: Exercise): string {
  const stem = getExerciseQuestionText(exercise);
  return createHash("sha256")
    .update(`${exercise.type}|${stem}`)
    .digest("hex")
    .slice(0, 32);
}
