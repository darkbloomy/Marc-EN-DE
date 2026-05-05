import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/exercises/generate", () => ({
  generateExercises: vi.fn(),
}));

import { buildDrillsSession } from "./daily-builder";
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
    language: "de",
    category: "grammar",
    topic,
    difficulty: 2,
  };
}

beforeEach(() => {
  mockedGenerate.mockReset();
  mockedGenerate.mockImplementation(async ({ topicId, count }) => ({
    exercises: Array.from({ length: count }, (_, i) =>
      fakeExercise(topicId, i + 1)
    ),
    language: "de" as const,
    topic: topicId,
    generatedAt: new Date().toISOString(),
    source: "db" as const,
  }));
});

describe("buildDrillsSession", () => {
  it("requests only nouns when verbCount is 0", async () => {
    const result = await buildDrillsSession({ nounCount: 5, verbCount: 0 });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({
        topicId: "de_drill_nouns",
        count: 5,
        exerciseType: "fill_in_the_blank",
      })
    );
    expect(result).toHaveLength(5);
    expect(result.every((e) => e.topic === "de_drill_nouns")).toBe(true);
  });

  it("requests only verbs when nounCount is 0", async () => {
    const result = await buildDrillsSession({ nounCount: 0, verbCount: 5 });
    expect(mockedGenerate).toHaveBeenCalledTimes(1);
    expect(mockedGenerate).toHaveBeenCalledWith(
      expect.objectContaining({ topicId: "de_drill_verbs", count: 5 })
    );
    expect(result).toHaveLength(5);
    expect(result.every((e) => e.topic === "de_drill_verbs")).toBe(true);
  });

  it("merges and shuffles when both counts are positive", async () => {
    const result = await buildDrillsSession({ nounCount: 3, verbCount: 4 });
    expect(mockedGenerate).toHaveBeenCalledTimes(2);
    expect(result).toHaveLength(7);
    const topics = new Set(result.map((e) => e.topic));
    expect(topics.has("de_drill_nouns")).toBe(true);
    expect(topics.has("de_drill_verbs")).toBe(true);
  });

  it("forwards difficulty to generateExercises", async () => {
    await buildDrillsSession({ nounCount: 2, verbCount: 2, difficulty: 4 });
    for (const call of mockedGenerate.mock.calls) {
      expect(call[0].difficulty).toBe(4);
    }
  });
});
