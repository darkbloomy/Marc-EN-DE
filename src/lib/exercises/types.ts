export type ExerciseType =
  | "multiple_choice"
  | "fill_in_the_blank"
  | "true_false"
  | "reorder"
  | "free_text";

export type Language = "de" | "en";

export type TopicCategory =
  | "grammar"
  | "spelling"
  | "reading"
  | "writing"
  | "vocabulary";

export interface MultipleChoiceExercise {
  type: "multiple_choice";
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  explanationCN?: string;
}

export interface FillInTheBlankExercise {
  type: "fill_in_the_blank";
  sentence: string; // Use ___ for each blank (one or more)
  correctAnswer: string;
  acceptableAnswers?: string[]; // Alternative correct answers (first blank only)
  // Multi-blank items: one entry per "___" in sentence. When present, takes
  // precedence over correctAnswer/acceptableAnswers for grading.
  blanks?: Array<{ correctAnswer: string; acceptableAnswers?: string[] }>;
  hint?: string;
  explanation: string;
  explanationCN?: string;
}

export interface TrueFalseExercise {
  type: "true_false";
  statement: string;
  isTrue: boolean;
  explanation: string;
  explanationCN?: string;
}

export interface ReorderExercise {
  type: "reorder";
  instruction: string;
  scrambledItems: string[];
  correctOrder: string[];
  explanation: string;
  explanationCN?: string;
}

export interface FreeTextExercise {
  type: "free_text";
  prompt: string;
  sampleAnswer: string;
  keyPoints: string[]; // Points the answer should cover
  explanation: string;
  explanationCN?: string;
}

export type Exercise =
  | MultipleChoiceExercise
  | FillInTheBlankExercise
  | TrueFalseExercise
  | ReorderExercise
  | FreeTextExercise;

export interface GeneratedExercise {
  exercise: Exercise;
  language: Language;
  category: TopicCategory;
  topic: string;
  difficulty: number; // 1-5
  source?: "ai" | "fallback" | "db"; // provenance, carried from the batch
  poolId?: string; // Exercise table id when sourced from pool
  contentHash?: string; // type + stem hash for anti-repeat
}

export interface ExerciseBatch {
  exercises: GeneratedExercise[];
  language: Language;
  topic: string;
  generatedAt: string; // ISO timestamp
  source: "ai" | "fallback" | "db";
  /** Other pool answers from this topic, used to build drill multiple-choice. */
  distractorBank?: string[];
}

export const EXERCISE_TYPES: ExerciseType[] = [
  "multiple_choice",
  "fill_in_the_blank",
  "true_false",
  "reorder",
  "free_text",
];

export const POINTS_PER_TYPE: Record<ExerciseType, number> = {
  multiple_choice: 10,
  fill_in_the_blank: 15,
  true_false: 5,
  reorder: 20,
  free_text: 25,
};

/** Hidden drill topic ids (DE + EN). */
export const DRILL_TOPIC_IDS = [
  "de_drill_nouns",
  "de_drill_verbs",
  "de_drill_adjectives",
  "de_drill_prepositions",
  "de_drill_relative",
  "de_drill_adverbial",
  "de_drill_complement",
  "de_drill_infinitive",
  "de_drill_extras",
  "en_drill_plurals",
  "en_drill_verbs",
  "en_drill_adjectives",
  "en_drill_prepositions",
  "en_drill_relative",
  "en_drill_adverbial",
  "en_drill_complement",
  "en_drill_infinitive",
  "en_drill_extras",
] as const;

export function isDrillTopic(topicId: string): boolean {
  return topicId.includes("_drill_");
}
