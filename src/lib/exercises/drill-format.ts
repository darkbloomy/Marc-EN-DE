import type {
  Exercise,
  FillInTheBlankExercise,
  GeneratedExercise,
  MultipleChoiceExercise,
} from "./types";

const CHOICE_COUNT = 4;

/** Conjunctions, relatives, prepositions, articles — not inflected verbs. */
const FUNCTION_WORDS = new Set(
  [
    "weil", "wenn", "als", "obwohl", "obgleich", "damit", "dass", "falls",
    "bevor", "nachdem", "während", "sobald", "bis", "da", "seitdem", "sofern",
    "zumal", "sodass", "so dass", "indem", "wie", "wo", "was", "wer", "wen",
    "wem", "wessen", "warum", "wann", "ob", "der", "die", "das", "den", "dem",
    "denen", "dessen", "deren", "um", "ohne", "statt", "anstatt", "zu", "auf",
    "vor", "an", "in", "mit", "bei", "von", "für", "nach", "aus", "über",
    "unter", "zwischen", "auch wenn", "als ob", "als wenn", "an dem", "in der",
    "kaum dass", "solange",
    "because", "if", "when", "while", "until", "before", "after", "although",
    "unless", "whether", "that", "who", "which", "whose", "whom", "where",
    "why", "how", "to", "once", "since", "even though", "so that", "in case",
    "as long as", "provided that", "as soon as", "in order to", "so as not to",
    "instead of", "as if", "as though", "by the time", "now that",
    "rather than", "without", "the", "a", "an",
  ].map((s) => s.toLowerCase()),
);

function answerClass(s: string): "pair" | "func" | "content" {
  const n = normalize(s);
  if (n.includes("|")) return "pair";
  if (FUNCTION_WORDS.has(n)) return "func";
  return "content";
}

function normalize(s: string): string {
  return s.trim().toLowerCase().replace(/\s+/g, " ");
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function fillAnswerLabel(ex: FillInTheBlankExercise): string {
  if (ex.blanks && ex.blanks.length > 0) {
    return ex.blanks.map((b) => b.correctAnswer).join(" | ");
  }
  return ex.correctAnswer;
}

function answerVariants(ex: FillInTheBlankExercise): string[] {
  const variants = [fillAnswerLabel(ex)];
  if (ex.acceptableAnswers) variants.push(...ex.acceptableAnswers);
  if (ex.blanks) {
    for (const b of ex.blanks) {
      variants.push(b.correctAnswer);
      if (b.acceptableAnswers) variants.push(...b.acceptableAnswers);
    }
  }
  return variants;
}

export function answersOf(exercise: Exercise): string[] {
  if (exercise.type !== "fill_in_the_blank") return [];
  return [fillAnswerLabel(exercise)];
}

function isSameAnswer(candidate: string, ex: FillInTheBlankExercise): boolean {
  const target = normalize(candidate);
  return answerVariants(ex).some((v) => normalize(v) === target);
}

export function fillToMultipleChoice(
  ex: FillInTheBlankExercise,
  distractorBank: string[],
  rng: () => number = Math.random,
): MultipleChoiceExercise | null {
  const correct = fillAnswerLabel(ex).trim();
  if (!correct) return null;

  const wanted = answerClass(correct);
  const seen = new Set<string>([normalize(correct)]);
  const distractors: string[] = [];

  const takeFrom = (pool: string[]) => {
    for (const raw of shuffle(pool, rng)) {
      if (distractors.length >= CHOICE_COUNT - 1) return;
      const option = raw.trim();
      if (!option || isSameAnswer(option, ex)) continue;
      const key = normalize(option);
      if (seen.has(key)) continue;
      seen.add(key);
      distractors.push(option);
    }
  };

  takeFrom(distractorBank.filter((d) => answerClass(d) === wanted));
  if (distractors.length < CHOICE_COUNT - 1) takeFrom(distractorBank);
  if (distractors.length < CHOICE_COUNT - 1) return null;

  const options = shuffle([correct, ...distractors], rng);
  return {
    type: "multiple_choice",
    question: ex.sentence,
    options,
    correctIndex: options.indexOf(correct),
    explanation: ex.explanation,
    explanationCN: ex.explanationCN,
  };
}

export type DrillDistractorBank =
  | string[]
  | ((item: GeneratedExercise) => string[]);

export function clampChoicePercent(n: number): number {
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function bankFor(
  item: GeneratedExercise,
  distractorBank: DrillDistractorBank,
): string[] {
  return typeof distractorBank === "function"
    ? distractorBank(item)
    : distractorBank;
}

/**
 * Convert a `choicePercent` slice of fill-in drills to 4-option multiple
 * choice (0 = all fill-in, 100 = all choice). Items stay fill-in when there
 * are not enough distinct wrong answers.
 */
export function applyRandomDrillFormat(
  items: GeneratedExercise[],
  distractorBank: DrillDistractorBank,
  rng: () => number = Math.random,
  choicePercent: number = 50,
): GeneratedExercise[] {
  const pct = clampChoicePercent(choicePercent);
  if (pct <= 0) return items;

  const fillIndexes = items
    .map((item, i) => (item.exercise.type === "fill_in_the_blank" ? i : -1))
    .filter((i) => i >= 0);
  const target = Math.round((fillIndexes.length * pct) / 100);
  if (target <= 0) return items;

  const convertedByIndex = new Map<number, MultipleChoiceExercise>();
  for (const i of shuffle(fillIndexes, rng)) {
    if (convertedByIndex.size >= target) break;
    const item = items[i];
    if (item.exercise.type !== "fill_in_the_blank") continue;
    const converted = fillToMultipleChoice(
      item.exercise,
      bankFor(item, distractorBank),
      rng,
    );
    if (!converted) continue;
    convertedByIndex.set(i, converted);
  }

  if (convertedByIndex.size === 0) return items;

  return items.map((item, i) => {
    const converted = convertedByIndex.get(i);
    if (!converted) return item;
    return { ...item, exercise: converted };
  });
}
