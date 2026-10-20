import { getTopic } from "@/lib/exercises/topics";
import { EXERCISE_TYPES, type ExerciseType, type Language } from "@/lib/exercises/types";

export interface PracticePlan {
  language: Language;
  topics: { topicId: string; count: number }[];
  difficulty?: number;
  /** Allowed exercise types; omitted = all five. */
  exerciseTypes?: ExerciseType[];
  /** Share of multiple-choice questions (1-99); omitted = default mix. */
  multipleChoicePercent?: number;
}

export const EXERCISE_TYPE_LABELS: Record<ExerciseType, string> = {
  multiple_choice: "multiple choice",
  fill_in_the_blank: "fill-in",
  true_false: "true/false",
  reorder: "word order",
  free_text: "free writing",
};

function typeMixLabel(plan: PracticePlan): string {
  const parts: string[] = [];
  const types = plan.exerciseTypes;
  if (types && types.length > 0 && types.length < EXERCISE_TYPES.length) {
    const missing = EXERCISE_TYPES.filter((t) => !types.includes(t));
    parts.push(
      missing.length <= 2
        ? `no ${missing.map((t) => EXERCISE_TYPE_LABELS[t]).join(" / ")}`
        : `only ${types.map((t) => EXERCISE_TYPE_LABELS[t]).join(" + ")}`,
    );
  }
  if (plan.multipleChoicePercent !== undefined) {
    parts.push(`${plan.multipleChoicePercent}% multiple choice`);
  }
  return parts.map((p) => ` · ${p}`).join("");
}

export function describePlan(plan: PracticePlan): string {
  const topics = plan.topics
    .map((t) => `${getTopic(t.topicId)?.labelEN ?? t.topicId} × ${t.count}`)
    .join(" + ");
  const difficulty = plan.difficulty ? ` · difficulty ${plan.difficulty}` : "";
  return `${plan.topics.reduce((s, t) => s + t.count, 0)} exercises · ${
    plan.language === "de" ? "German" : "English"
  } · ${topics}${difficulty}${typeMixLabel(plan)}`;
}
