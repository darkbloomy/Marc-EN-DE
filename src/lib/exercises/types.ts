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
}

export interface FillInTheBlankExercise {
  type: "fill_in_the_blank";
  sentence: string; // Use ___ for the blank
  correctAnswer: string;
  acceptableAnswers?: string[]; // Alternative correct answers
  hint?: string;
  explanation: string;
}

export interface TrueFalseExercise {
  type: "true_false";
  statement: string;
  isTrue: boolean;
  explanation: string;
}

export interface ReorderExercise {
  type: "reorder";
  instruction: string;
  scrambledItems: string[];
  correctOrder: string[];
  explanation: string;
}

export interface FreeTextExercise {
  type: "free_text";
  prompt: string;
  sampleAnswer: string;
  keyPoints: string[]; // Points the answer should cover
  explanation: string;
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
}

export interface ExerciseBatch {
  exercises: GeneratedExercise[];
  language: Language;
  topic: string;
  generatedAt: string; // ISO timestamp
  source: "ai" | "fallback";
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
