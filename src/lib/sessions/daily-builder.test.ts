import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/exercises/generate", () => ({
  generateExercises: vi.fn(),
}));

import {
  buildCustomSession,
  buildDrillsSession,
  distributeDrillMix,
  scaleTypePlan,
} from "./daily-builder";
import {
  emptyDrillCounts,
  DRILL_CATEGORY_KEYS,
} from "./drill-categories";
import { generateExercises } from "@/lib/exercises/generate";
import type { GeneratedExercise } from "@/lib/exercises/types";

const mockedGenerate = vi.mocked(generateExercises);

function fakeExercise(topic: string, n: number): GeneratedExercise {
  return {
    exercise: {
      type: "fill_in_the_blank",
      sentence: `${topic}-${n} ___`,
      correctAnswer: String(n),
      explanation: "x",
    },
    language: topic.startsWith("en_") ? "en" : "de",
    category: "grammar",
    topic,
    difficulty: 2,
  };
}

const zero = emptyDrillCounts();

beforeEach(() => {
  mockedGenerate.mockReset();
  mockedGenerate.mockImplementation(async ({ topicId, count = 0 }) => ({
    exercises: Array.from({ length: count }, (_, i) =>
      fakeExercise(topicId, i + 1),
    ),
    language: topicId.startsWith("en_") ? ("en" as const) : ("de" as const),
    topic: topicId,
    generatedAt: new Date().toISOString(),
    source: "db" as const,
  }));
});

describe("distributeDrillMix", () => {
  it("sums to the requested total and covers all categories when total >= category count", () => {
    const counts = distributeDrillMix(20);
    const sum = DRILL_CATEGORY_KEYS.reduce((s, k) => s + counts[k], 0);
    expect(sum).toBe(20);
    for (const key of DRILL_CATEGORY_KEYS) {
      expect(counts[key]).toBeGreaterThan(0);
    }
  });

  it("returns zeros for total 0", () => {
    expect(distributeDrillMix(0)).toEqual(zero);
  });
});

describe("buildDrillsSession", () => {
  it("requests only DE nouns when other counts are 0", async () => {
    const result = await buildDrillsSession({
      language: "de",
      counts: { ...zero, nouns: 5 },
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "de_drill_nouns",
        count: 5,
        exerciseType: "fill_in_the_blank",
        preferPool: true,
      }),
    );
    expect(result).toHaveLength(5);
  });

  it("requests EN prepositions", async () => {
    const result = await buildDrillsSession({
      language: "en",
      counts: { ...zero, prepositions: 4 },
    });
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "en_drill_prepositions",
        count: 4,
      }),
    );
    expect(result).toHaveLength(4);
  });

  it("requests all DE categories", async () => {
    const result = await buildDrillsSession({
      language: "de",
      counts: {
        ...zero,
        nouns: 1,
        verbs: 1,
        adjectives: 1,
        prepositions: 2,
        relative: 1,
        adverbial: 1,
        complement: 1,
        infinitive: 1,
        extras: 1,
      },
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(DRILL_CATEGORY_KEYS.length);
    expect(result).toHaveLength(10);
    const topics = new Set(result.map((e) => e.topic));
    expect(topics.has("de_drill_prepositions")).toBe(true);
    expect(topics.has("de_drill_relative")).toBe(true);
    expect(topics.has("de_drill_extras")).toBe(true);
  });

  it("forwards difficulty and profileId", async () => {
    await buildDrillsSession({
      language: "de",
      counts: { ...zero, nouns: 2, verbs: 2 },
      difficulty: 4,
      profileId: "prof_1",
    });
    for (const call of mockedGenerate.mock.calls) {
      expect(call[0].difficulty).toBe(4);
      expect(call[0].profileId).toBe("prof_1");
    }
  });

  it("returns empty when all counts are 0", async () => {
    const result = await buildDrillsSession({
      language: "en",
      counts: { ...zero },
    });
    expect(mockedGenerate).not.toHaveBeenCalled();
    expect(result).toHaveLength(0);
  });

  it("keeps every item as fill-in when choicePercent is 0", async () => {
    const result = await buildDrillsSession({
      language: "de",
      counts: { ...zero, adverbial: 10 },
      choicePercent: 0,
    });
    expect(result).toHaveLength(10);
    expect(
      result.every((e) => e.exercise.type === "fill_in_the_blank"),
    ).toBe(true);
  });

  it("converts fill-ins to multiple choice when choicePercent is 100", async () => {
    mockedGenerate.mockImplementation(async ({ topicId, count = 0 }) => {
      const exercises = Array.from({ length: count }, (_, i) =>
        fakeExercise(topicId, i + 1),
      );
      return {
        exercises,
        language: "de" as const,
        topic: topicId,
        generatedAt: new Date().toISOString(),
        source: "db" as const,
        distractorBank: [
          "weil",
          "wenn",
          "als",
          "obwohl",
          "damit",
          "falls",
          "bevor",
          "nachdem",
        ],
      };
    });

    const result = await buildDrillsSession({
      language: "de",
      counts: { ...zero, adverbial: 6 },
      choicePercent: 100,
    });
    expect(result).toHaveLength(6);
    expect(
      result.every((e) => e.exercise.type === "multiple_choice"),
    ).toBe(true);
  });
});

describe("scaleTypePlan", () => {
  it("matches the free-practice mix at 10", () => {
    expect(scaleTypePlan(10)).toEqual({
      multiple_choice: 3,
      fill_in_the_blank: 2,
      true_false: 2,
      reorder: 2,
      free_text: 1,
    });
  });

  it("always sums to the requested count", () => {
    for (const count of [1, 3, 5, 7, 10, 15, 20, 37, 50]) {
      const plan = scaleTypePlan(count);
      const sum = Object.values(plan).reduce((a, b) => a + b, 0);
      expect(sum, `count ${count}`).toBe(count);
    }
  });

  it("assigns a single exercise to multiple choice", () => {
    const plan = scaleTypePlan(1);
    expect(plan.multiple_choice).toBe(1);
    expect(plan.fill_in_the_blank + plan.true_false + plan.reorder + plan.free_text).toBe(0);
  });

  it("leaves out excluded types", () => {
    const plan = scaleTypePlan(10, {
      exerciseTypes: ["fill_in_the_blank", "true_false", "reorder", "free_text"],
    });
    expect(plan.multiple_choice).toBe(0);
    expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(10);
  });

  it("fixes the multiple-choice share when a percent is given", () => {
    const plan = scaleTypePlan(10, { multipleChoicePercent: 50 });
    expect(plan.multiple_choice).toBe(5);
    expect(Object.values(plan).reduce((a, b) => a + b, 0)).toBe(10);
    expect(scaleTypePlan(10, { multipleChoicePercent: 0 }).multiple_choice).toBe(0);
  });

  it("keeps multiple choice as the largest share", () => {
    for (const count of [11, 13, 20, 25, 49]) {
      const plan = scaleTypePlan(count);
      expect(plan.multiple_choice).toBeGreaterThanOrEqual(
        Math.ceil((3 / 10) * count) - 1,
      );
    }
  });
});

describe("buildCustomSession", () => {
  it("builds one regular topic with a scaled type mix", async () => {
    const result = await buildCustomSession({
      plan: [{ topicId: "en_simple_past", count: 20 }],
    });
    expect(result).toHaveLength(20);
    expect(new Set(result.map((e) => e.topic))).toEqual(
      new Set(["en_simple_past"]),
    );
    // 20 → mc 6 / fill 4 / tf 4 / reorder 4 / free 2
    const calls = mockedGenerate.mock.calls.map((c) => c[0]);
    const byType = calls.reduce<Record<string, number>>((acc, c) => {
      acc[c.exerciseType] = (acc[c.exerciseType] ?? 0) + 1;
      return acc;
    }, {});
    const countsByType = calls.reduce<Record<string, number>>((acc, c) => {
      acc[c.exerciseType] = (acc[c.exerciseType] ?? 0) + (c.count ?? 0);
      return acc;
    }, {});
    expect(countsByType.multiple_choice).toBe(6);
    expect(countsByType.fill_in_the_blank).toBe(4);
    expect(countsByType.true_false).toBe(4);
    expect(countsByType.reorder).toBe(4);
    expect(countsByType.free_text).toBe(2);
    expect(byType.multiple_choice).toBe(1);
  });

  it("mixes multiple topics in one session", async () => {
    const result = await buildCustomSession({
      plan: [
        { topicId: "en_simple_past", count: 10 },
        { topicId: "en_pronouns", count: 10 },
      ],
    });
    expect(result).toHaveLength(20);
    const topics = new Set(result.map((e) => e.topic));
    expect(topics.has("en_simple_past")).toBe(true);
    expect(topics.has("en_pronouns")).toBe(true);
  });

  it("routes drill topics through the pool-first fill-in path", async () => {
    const result = await buildCustomSession({
      plan: [{ topicId: "de_drill_relative", count: 5 }],
    });
    expect(result).toHaveLength(5);
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "de_drill_relative",
        exerciseType: "fill_in_the_blank",
        count: 5,
        preferPool: true,
      }),
    );
  });

  it("never asks for multiple choice when it is excluded", async () => {
    const result = await buildCustomSession({
      plan: [
        { topicId: "en_pronouns", count: 10 },
        { topicId: "en_drill_relative", count: 10 },
      ],
      exerciseTypes: ["fill_in_the_blank", "true_false", "reorder", "free_text"],
    });
    const types = mockedGenerate.mock.calls.map((c) => c[0].exerciseType);
    expect(types).not.toContain("multiple_choice");
    expect(result.filter((e) => e.exercise.type === "multiple_choice")).toHaveLength(0);
  });

  it("throws on an unknown topic", async () => {
    await expect(
      buildCustomSession({ plan: [{ topicId: "en_bogus", count: 5 }] }),
    ).rejects.toThrow(/Unknown topic/);
  });

  it("forwards difficulty and profileId", async () => {
    await buildCustomSession({
      plan: [{ topicId: "en_simple_past", count: 4 }],
      difficulty: 4,
      profileId: "prof_1",
    });
    for (const call of mockedGenerate.mock.calls) {
      expect(call[0].difficulty).toBe(4);
      expect(call[0].profileId).toBe("prof_1");
    }
  });
});
