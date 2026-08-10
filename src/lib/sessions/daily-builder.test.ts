import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/exercises/generate", () => ({
  generateExercises: vi.fn(),
}));

import { buildDrillsSession, distributeDrillMix } from "./daily-builder";
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

const zero = {
  nouns: 0,
  verbs: 0,
  adjectives: 0,
  subclauses: 0,
  prepositions: 0,
};

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
  it("sums to the requested total and covers all categories when total >= 5", () => {
    const counts = distributeDrillMix(20);
    const sum =
      counts.nouns +
      counts.verbs +
      counts.adjectives +
      counts.subclauses +
      counts.prepositions;
    expect(sum).toBe(20);
    expect(counts.nouns).toBeGreaterThan(0);
    expect(counts.verbs).toBeGreaterThan(0);
    expect(counts.adjectives).toBeGreaterThan(0);
    expect(counts.subclauses).toBeGreaterThan(0);
    expect(counts.prepositions).toBeGreaterThan(0);
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

  it("requests all five DE categories", async () => {
    const result = await buildDrillsSession({
      language: "de",
      counts: {
        nouns: 1,
        verbs: 1,
        adjectives: 1,
        subclauses: 1,
        prepositions: 2,
      },
    });
    expect(mockedGenerate).toHaveBeenCalledTimes(5);
    expect(result).toHaveLength(6);
    const topics = new Set(result.map((e) => e.topic));
    expect(topics.has("de_drill_prepositions")).toBe(true);
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
});
