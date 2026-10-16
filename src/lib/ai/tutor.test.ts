import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exerciseResult: { findMany: vi.fn().mockResolvedValue([]) },
  },
}));

import {
  buildTutorSystemPrompt,
  describePlan,
  planReadyText,
  validatePracticePlan,
  PROPOSE_PLAN_TOOL,
  MAX_PLAN_EXERCISES,
} from "./tutor";

describe("validatePracticePlan", () => {
  it("accepts a valid single-topic plan", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [{ topicId: "en_simple_past", count: 20 }],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan).toEqual({
        language: "en",
        topics: [{ topicId: "en_simple_past", count: 20 }],
        difficulty: undefined,
      });
    }
  });

  it("accepts multi-topic plans with difficulty", () => {
    const result = validatePracticePlan({
      language: "de",
      topics: [
        { topicId: "de_articles", count: 5 },
        { topicId: "de_prepositions", count: 10 },
      ],
      difficulty: 2,
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.topics).toHaveLength(2);
      expect(result.plan.difficulty).toBe(2);
    }
  });

  it("rejects unknown topics", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [{ topicId: "en_bogus", count: 5 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/Unknown topic/);
  });

  it("rejects topic/language mismatch", () => {
    const result = validatePracticePlan({
      language: "de",
      topics: [{ topicId: "en_simple_past", count: 5 }],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toMatch(/plan language is de/);
  });

  it("rejects more than 3 topics", () => {
    const result = validatePracticePlan({
      language: "de",
      topics: [
        { topicId: "de_articles", count: 1 },
        { topicId: "de_prepositions", count: 1 },
        { topicId: "de_noun_cases", count: 1 },
        { topicId: "de_vocabulary_school", count: 1 },
      ],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects totals above the max", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [
        { topicId: "en_simple_past", count: 30 },
        { topicId: "en_pronouns", count: 30 },
      ],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toMatch(`maximum of ${MAX_PLAN_EXERCISES}`);
    }
  });

  it("rejects out-of-range per-topic counts", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [{ topicId: "en_simple_past", count: 60 }],
    });
    expect(result.ok).toBe(false);
    const result0 = validatePracticePlan({
      language: "en",
      topics: [{ topicId: "en_simple_past", count: 0 }],
    });
    expect(result0.ok).toBe(false);
  });

  it("merges duplicate topics before summing", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [
        { topicId: "en_simple_past", count: 10 },
        { topicId: "en_simple_past", count: 10 },
      ],
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.plan.topics).toEqual([
        { topicId: "en_simple_past", count: 20 },
      ]);
    }
  });

  it("drops invalid difficulty instead of failing", () => {
    const result = validatePracticePlan({
      language: "en",
      topics: [{ topicId: "en_simple_past", count: 5 }],
      difficulty: 9,
    });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.plan.difficulty).toBeUndefined();
  });

  it("rejects non-object input", () => {
    expect(validatePracticePlan(null).ok).toBe(false);
    expect(validatePracticePlan("hi").ok).toBe(false);
    expect(
      validatePracticePlan({ language: "en", topics: [] }).ok,
    ).toBe(false);
  });
});

describe("describePlan", () => {
  it("renders topic labels, counts, and difficulty", () => {
    const text = describePlan({
      language: "en",
      topics: [
        { topicId: "en_simple_past", count: 10 },
        { topicId: "en_pronouns", count: 10 },
      ],
      difficulty: 3,
    });
    expect(text).toBe(
      "20 exercises · English · Simple Past (Regular & Irregular) × 10 + Pronouns × 10 · d3",
    );
  });
});

describe("planReadyText", () => {
  it("matches the language of the user's request", () => {
    expect(planReadyText("重新生成")).toMatch(/练习计划/);
    expect(planReadyText("Mach mir 15 Übungen zu Relativsätzen")).toMatch(/Hier ist dein Plan/);
    expect(planReadyText("Generate 20 exercises for simple past")).toMatch(/Here is your plan/);
  });
});

describe("buildTutorSystemPrompt", () => {
  it("includes the topic registry and mistakes context", () => {
    const prompt = buildTutorSystemPrompt({
      recentMistakes: "1. [WRONG] Simple Past: went/went",
      lastPlan: null,
    });
    expect(prompt).toContain("en_simple_past");
    expect(prompt).toContain("de_drill_relative");
    expect(prompt).toContain("(drill)");
    expect(prompt).toContain("1. [WRONG] Simple Past: went/went");
    expect(prompt).not.toContain("LAST PROPOSED PLAN");
  });

  it("includes the last plan when provided", () => {
    const prompt = buildTutorSystemPrompt({
      recentMistakes: "(none)",
      lastPlan: "20 exercises · English · Simple Past × 20",
    });
    expect(prompt).toContain("LAST PROPOSED PLAN: 20 exercises");
  });
});

describe("PROPOSE_PLAN_TOOL", () => {
  it("has a stable name and required language+topics", () => {
    expect(PROPOSE_PLAN_TOOL.name).toBe("propose_practice_plan");
    expect(PROPOSE_PLAN_TOOL.input_schema.required).toEqual([
      "language",
      "topics",
    ]);
  });
});
