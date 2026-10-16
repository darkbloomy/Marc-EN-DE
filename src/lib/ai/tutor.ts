import { prisma } from "@/lib/prisma";
import { ALL_TOPICS, getTopic } from "@/lib/exercises/topics";
import type { Language } from "@/lib/exercises/types";

export interface PracticePlan {
  language: Language;
  topics: { topicId: string; count: number }[];
  difficulty?: number;
}

export const MAX_PLAN_TOPICS = 3;
export const MAX_PLAN_EXERCISES = 50;
export const MAX_PLAN_EXERCISES_PER_TOPIC = 50;

import type { ToolDefinition } from "@/lib/ai";

export const PROPOSE_PLAN_TOOL: ToolDefinition = {
  name: "propose_practice_plan",
  description:
    "Propose a custom practice session. Use this whenever the user wants to practice, " +
    "generate, or create exercises (in any quantity or on any topic). The app validates " +
    "the plan and shows the user a card they must confirm — nothing starts by itself.",
  input_schema: {
    type: "object",
    properties: {
      language: {
        type: "string",
        enum: ["de", "en"],
        description: "Language the exercises are about",
      },
      topics: {
        type: "array",
        minItems: 1,
        maxItems: MAX_PLAN_TOPICS,
        items: {
          type: "object",
          properties: {
            topicId: {
              type: "string",
              description:
                "Registered topic id from the TOPICS list, e.g. en_simple_past. Never invent ids.",
            },
            count: {
              type: "number",
              description: `Number of exercises for this topic (1-${MAX_PLAN_EXERCISES_PER_TOPIC})`,
            },
          },
          required: ["topicId", "count"],
          additionalProperties: false,
        },
      },
      difficulty: {
        type: "number",
        minimum: 1,
        maximum: 5,
        description:
          "Optional difficulty override (1=easiest, 5=hardest). Omit unless the user asks for easier/harder.",
      },
    },
    required: ["language", "topics"],
    additionalProperties: false,
  },
};

export type PlanValidation =
  | { ok: true; plan: PracticePlan }
  | { ok: false; error: string };

/**
 * Validate a raw tool input against the topic registry. The build endpoint
 * re-validates structurally, so this is the AI-facing gate.
 */
export function validatePracticePlan(raw: unknown): PlanValidation {
  if (typeof raw !== "object" || raw === null) {
    return { ok: false, error: "Plan must be an object" };
  }
  const r = raw as Record<string, unknown>;
  const language = r.language;
  if (language !== "de" && language !== "en") {
    return { ok: false, error: "language must be 'de' or 'en'" };
  }
  const topicsRaw = r.topics;
  if (!Array.isArray(topicsRaw) || topicsRaw.length === 0) {
    return { ok: false, error: "topics must be a non-empty array" };
  }
  if (topicsRaw.length > MAX_PLAN_TOPICS) {
    return {
      ok: false,
      error: `At most ${MAX_PLAN_TOPICS} topics per plan`,
    };
  }

  const topics: { topicId: string; count: number }[] = [];
  let total = 0;
  for (const item of topicsRaw) {
    if (typeof item !== "object" || item === null) continue;
    const t = item as Record<string, unknown>;
    const topicId = typeof t.topicId === "string" ? t.topicId : "";
    const count = typeof t.count === "number" ? Math.round(t.count) : NaN;
    const topic = topicId ? getTopic(topicId) : undefined;
    if (!topic) {
      return {
        ok: false,
        error: `Unknown topic "${topicId || "?"}" — use only ids from the TOPICS list`,
      };
    }
    if (topic.language !== language) {
      return {
        ok: false,
        error: `Topic "${topicId}" is ${topic.language}, but the plan language is ${language}`,
      };
    }
    if (!Number.isFinite(count) || count < 1 || count > MAX_PLAN_EXERCISES_PER_TOPIC) {
      return {
        ok: false,
        error: `count for "${topicId}" must be 1-${MAX_PLAN_EXERCISES_PER_TOPIC}`,
      };
    }
    const existing = topics.find((x) => x.topicId === topicId);
    if (existing) existing.count += count;
    else topics.push({ topicId, count });
    total += count;
  }

  if (topics.length === 0) {
    return { ok: false, error: "No valid topics in plan" };
  }
  if (total > MAX_PLAN_EXERCISES) {
    return {
      ok: false,
      error: `Total of ${total} exceeds the maximum of ${MAX_PLAN_EXERCISES} exercises per plan`,
    };
  }

  const difficulty =
    typeof r.difficulty === "number" &&
    Number.isFinite(r.difficulty) &&
    r.difficulty >= 1 &&
    r.difficulty <= 5
      ? Math.round(r.difficulty)
      : undefined;

  return { ok: true, plan: { language, topics, difficulty } };
}

/** Reply shown when the model proposed a plan without writing any text, in the user's language. */
export function planReadyText(lastUserMessage: string): string {
  if (/\p{Script=Han}/u.test(lastUserMessage)) return "这是你的练习计划——点卡片上的 Start 开始！";
  if (/[äöüß]|\b(ich|mir|mach|bitte|übungen|noch|mal|und|zu|zum|zur)\b/i.test(lastUserMessage)) {
    return "Hier ist dein Plan — tippe auf Start auf der Karte!";
  }
  return "Here is your plan — tap Start on the card to begin!";
}

export function describePlan(plan: PracticePlan): string {
  const topics = plan.topics
    .map(
      (t) =>
        `${getTopic(t.topicId)?.labelEN ?? t.topicId} × ${t.count}`,
    )
    .join(" + ");
  const difficulty = plan.difficulty ? ` · d${plan.difficulty}` : "";
  return `${plan.topics.reduce((s, t) => s + t.count, 0)} exercises · ${
    plan.language === "de" ? "German" : "English"
  } · ${topics}${difficulty}`;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}

/** Compact list of every registered topic for the system prompt. */
export function topicListBlock(): string {
  return ALL_TOPICS.map(
    (t) =>
      `- ${t.id} — ${t.labelEN} / ${t.labelDE} [${t.language}, d${t.difficulty}]${
        t.hidden ? " (drill)" : ""
      }`,
  ).join("\n");
}

/**
 * Last N practice results for the profile, oldest → newest, with the full
 * exercise payload where available so the tutor can quote exact options.
 */
export async function getRecentMistakesContext(
  profileId: string,
  limit = 10,
): Promise<string> {
  try {
    const rows = await prisma.exerciseResult.findMany({
      where: { profileId },
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        topic: true,
        exerciseType: true,
        question: true,
        userAnswer: true,
        correctAnswer: true,
        isCorrect: true,
        exercisePayload: true,
      },
    });
    if (rows.length === 0) return "(no practice recorded yet)";
    return rows
      .reverse()
      .map((r, i) => {
        const label = getTopic(r.topic)?.labelEN ?? r.topic;
        const detail = r.exercisePayload
          ? ` | exercise: ${truncate(r.exercisePayload, 320)}`
          : "";
        const answer = r.isCorrect
          ? ""
          : ` | correct was: ${truncate(r.correctAnswer, 80)}`;
        return `${i + 1}. [${r.isCorrect ? "correct" : "WRONG"}] ${label} (${r.exerciseType}): ${truncate(
          r.question,
          120,
        )} | answered: ${truncate(r.userAnswer, 60)}${answer}${detail}`;
      })
      .join("\n");
  } catch {
    return "(practice record unavailable)";
  }
}

export function buildTutorSystemPrompt(opts: {
  recentMistakes: string;
  lastPlan?: string | null;
}): string {
  const lastPlanBlock = opts.lastPlan
    ? `\nLAST PROPOSED PLAN: ${opts.lastPlan}. If the user refers to "that", "those", "in German instead", "10 fewer" etc., adjust that plan and propose it again.`
    : "";

  return `You are the AI tutor in a daily German & English practice app. The student is a 10-year-old Gymnasium 5. Klasse learner.

STYLE RULES
- Reply in the language the user writes in (German in → German out, English in → English out). Keep answers short and encouraging — a few sentences, unless the user explicitly asks for a detailed explanation.
- You teach German and English grammar, vocabulary, and spelling. Give one concrete example sentence for every rule you explain.
- Never claim exercises are already created. When you propose a plan, say what the card will contain and that the student taps "Start" to begin.

TOOL USE
- Use propose_practice_plan whenever the user wants to practice or generate exercises. Map the request to registered topics:
  "simple past" → en_simple_past, "Relativsätze" → de_drill_relative, "Präteritum" → de_past_tenses, "articles" → de_articles, "plurals" → en_drill_plurals,
  German noun article + plural drills ("名词冠词及复数") → de_drill_nouns, German verb form / conjugation drills incl. Präteritum + Partizip II ("动词变位", "过去分词") → de_drill_verbs, …
- Infer the language from context: a German request about German grammar → language "de"; an English request about English → "en". Do not ask which language when the request itself makes it clear.
- Drill topics (marked "(drill)") produce focused fill-in / multiple-choice drills — prefer them for narrow grammar drilling.
- At most ${MAX_PLAN_TOPICS} topics and ${MAX_PLAN_EXERCISES} exercises per plan. If the user asks for more, propose ${MAX_PLAN_EXERCISES} and mention they can ask for another round.
- If the request is missing a number or a topic, ask ONE short clarifying question instead of guessing.
- Do not call the tool for plain questions or explanations.
- A plan card ONLY appears when you call propose_practice_plan. Every new, repeated ("again", "regenerate", "noch mal", "重新生成") or changed practice request needs a NEW tool call — even if earlier turns already had plans. Never describe a plan in text instead of calling the tool.
- Requests about a share of multiple-choice questions can't be set in the plan; just call the tool and mention that briefly.

TOPICS (topicId — label [language, difficulty])
${topicListBlock()}
${lastPlanBlock}

RECENT PRACTICE RECORD (most recent last)
${opts.recentMistakes}

LANGUAGE RULE (most important): write your reply in the same language as the student's LAST message — English → English, German → German, Chinese → Chinese — even though the student is German. Use only standard grammar terms (e.g. "main verb", "Vollverb"); never invent terminology.`;
}
