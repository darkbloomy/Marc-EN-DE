import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: {
      findMany: vi.fn(),
    },
    exerciseResult: {
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
}));

vi.mock("@/lib/ai", () => ({
  completeText: vi.fn(),
}));

import { generateExercises, parseExerciseResponse } from "./generate";
import { prisma } from "@/lib/prisma";
import { completeText } from "@/lib/ai";
import { clearCache } from "./cache";

const mockedFindMany = vi.mocked(prisma.exercise.findMany);
const mockedComplete = vi.mocked(completeText);

function aiText(text: string) {
  return { text, provider: "grok" as const, model: "test-model" };
}

function poolRow(payload: object, id = "pool_1") {
  return { id, payload: JSON.stringify(payload) };
}

const mcExercise = {
  type: "multiple_choice" as const,
  question: "Q?",
  options: ["A", "B", "C", "D"],
  correctIndex: 0,
  explanation: "Because.",
};

beforeEach(() => {
  mockedFindMany.mockReset();
  clearCache();

  // Default: make AI throw so that "pool" tests exercise the fallback paths and prisma mocks
  mockedComplete.mockReset();
  mockedComplete.mockRejectedValue(new Error("AI disabled for pool fallback test"));
});

describe("parseExerciseResponse", () => {
  it("parses a single exercise JSON object", () => {
    const json = JSON.stringify(mcExercise);
    const result = parseExerciseResponse(json, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("multiple_choice");
  });

  it("parses an array of exercises", () => {
    const json = JSON.stringify([
      { type: "true_false", statement: "S1", isTrue: true, explanation: "Yes." },
      { type: "true_false", statement: "S2", isTrue: false, explanation: "No." },
    ]);
    const result = parseExerciseResponse(json, 2);
    expect(result).toHaveLength(2);
  });

  it("strips markdown code fences", () => {
    const json =
      '```json\n{"type":"true_false","statement":"Test","isTrue":true,"explanation":"Yes."}\n```';
    const result = parseExerciseResponse(json, 1);
    expect(result).toHaveLength(1);
    expect(result[0].type).toBe("true_false");
  });

  it("throws on invalid JSON", () => {
    expect(() => parseExerciseResponse("not json", 1)).toThrow();
  });
});

describe("generateExercises (pool fallback when AI unavailable)", () => {
  it("returns exercises from the pool when exact difficulty matches", async () => {
    mockedFindMany.mockResolvedValueOnce(
      Array(5)
        .fill(null)
        .map((_, i) => poolRow(mcExercise, `pool_${i}`)) as never,
    );

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 3,
      difficulty: 2,
    });

    expect(batch.source).toBe("db");
    expect(batch.exercises).toHaveLength(3);
    expect(batch.exercises[0].exercise.type).toBe("multiple_choice");
    expect(batch.exercises[0].poolId).toBeTruthy();
    expect(batch.exercises[0].contentHash).toBeTruthy();
    expect(mockedFindMany).toHaveBeenCalledTimes(1);
    expect(mockedFindMany.mock.calls[0][0]?.where).toMatchObject({
      language: "de",
      topic: "de_articles",
      exerciseType: "multiple_choice",
      reviewStatus: "approved",
      difficulty: 2,
    });
  });

  it("prefers pool for drill topics even when AI would succeed", async () => {
    mockedComplete.mockResolvedValue(aiText(JSON.stringify(mcExercise)));

    mockedFindMany.mockResolvedValueOnce(
      Array(5)
        .fill(null)
        .map((_, i) =>
          poolRow(
            {
              type: "fill_in_the_blank",
              sentence: `Singular: ___ Hund. Plural: die ___`,
              correctAnswer: "der",
              blanks: [{ correctAnswer: "der" }, { correctAnswer: "Hunde" }],
              explanation: "e",
            },
            `drill_${i}`,
          ),
        ) as never,
    );

    const batch = await generateExercises({
      topicId: "de_drill_nouns",
      exerciseType: "fill_in_the_blank",
      count: 3,
      difficulty: 2,
      preferPool: true,
    });

    expect(batch.source).toBe("db");
    expect(mockedComplete).not.toHaveBeenCalled();
    expect(mockedFindMany.mock.calls[0][0]?.where).not.toHaveProperty(
      "difficulty",
    );
    expect(
      batch.exercises.every((e) => e.exercise.type === "fill_in_the_blank"),
    ).toBe(true);
    expect(batch.distractorBank?.length).toBeGreaterThan(0);
  });

  it("excludes recent pool ids from the query when provided", async () => {
    mockedFindMany.mockResolvedValueOnce(
      Array(4)
        .fill(null)
        .map((_, i) => poolRow(mcExercise, `ok_${i}`)) as never,
    );

    await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 2,
      difficulty: 2,
      excludePoolIds: ["seen_1", "seen_2"],
    });

    expect(mockedFindMany.mock.calls[0][0]?.where).toMatchObject({
      id: { notIn: ["seen_1", "seen_2"] },
    });
  });

  it("widens difficulty when the exact bucket has too few rows", async () => {
    mockedFindMany
      .mockResolvedValueOnce([poolRow(mcExercise)] as never) // exact: 1 row, need 3
      .mockResolvedValueOnce(
        Array(4).fill(null).map(() => poolRow(mcExercise)) as never,
      ); // widened: 4 rows

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 3,
      difficulty: 3,
    });

    expect(batch.source).toBe("db");
    expect(batch.exercises).toHaveLength(3);
    expect(mockedFindMany).toHaveBeenCalledTimes(2);
    const widenedCall = mockedFindMany.mock.calls[1][0]?.where as {
      difficulty: { in: number[] };
    };
    expect(widenedCall.difficulty.in.sort()).toEqual([2, 3, 4]);
  });

  it("drops difficulty filter entirely if widened still has too few rows", async () => {
    mockedFindMany
      .mockResolvedValueOnce([] as never) // exact: empty
      .mockResolvedValueOnce([] as never) // widened: empty
      .mockResolvedValueOnce(
        Array(3).fill(null).map(() => poolRow(mcExercise)) as never,
      ); // any: 3 rows

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 3,
      difficulty: 3,
    });

    expect(batch.source).toBe("db");
    expect(batch.exercises).toHaveLength(3);
    expect(mockedFindMany).toHaveBeenCalledTimes(3);
    expect(mockedFindMany.mock.calls[2][0]?.where).not.toHaveProperty("difficulty");
  });

  it("falls back to hardcoded exercises when the pool is completely empty", async () => {
    mockedFindMany.mockResolvedValue([] as never);

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 2,
      difficulty: 3,
    });

    expect(batch.source).toBe("fallback");
    expect(batch.exercises.length).toBeGreaterThan(0);
  });

  it("falls back when the DB query throws", async () => {
    mockedFindMany.mockRejectedValueOnce(new Error("db down"));

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 2,
    });

    expect(batch.source).toBe("fallback");
  });

  it("throws on unknown topic", async () => {
    await expect(
      generateExercises({
        topicId: "does_not_exist",
        exerciseType: "multiple_choice",
        count: 1,
      }),
    ).rejects.toThrow(/Unknown topic/);
  });

  it("clamps the widening window at the difficulty edges (target=1)", async () => {
    mockedFindMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce(
        Array(3).fill(null).map(() => poolRow(mcExercise)) as never,
      );

    await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 3,
      difficulty: 1,
    });

    const widenedWhere = mockedFindMany.mock.calls[1][0]?.where as {
      difficulty: { in: number[] };
    };
    expect(widenedWhere.difficulty.in.sort()).toEqual([1, 2]);
  });

  it("clamps the widening window at the difficulty edges (target=5)", async () => {
    mockedFindMany
      .mockResolvedValueOnce([] as never)
      .mockResolvedValueOnce(
        Array(3).fill(null).map(() => poolRow(mcExercise)) as never,
      );

    await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 3,
      difficulty: 5,
    });

    const widenedWhere = mockedFindMany.mock.calls[1][0]?.where as {
      difficulty: { in: number[] };
    };
    expect(widenedWhere.difficulty.in.sort()).toEqual([4, 5]);
  });
});

describe("generateExercises (live AI primary)", () => {
  it("uses AI and returns source 'ai' when generation succeeds", async () => {
    mockedComplete.mockResolvedValueOnce(aiText(JSON.stringify(mcExercise)));

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 1,
    });

    expect(batch.source).toBe("ai");
    expect(batch.exercises).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((batch.exercises[0].exercise as any).question).toBe("Q?");
    expect(mockedComplete).toHaveBeenCalledTimes(1);
  });

  it("caches AI result and does not call AI again within TTL for same key", async () => {
    mockedComplete.mockResolvedValue(aiText(JSON.stringify(mcExercise)));

    await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 1,
      difficulty: 3,
    });
    expect(mockedComplete).toHaveBeenCalledTimes(1);

    // second call hits cache, no AI
    const batch2 = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 1,
      difficulty: 3,
    });
    expect(mockedComplete).toHaveBeenCalledTimes(1);
    expect(batch2.source).toBe("ai");
  });

  it("falls back to pool (and calls prisma) when AI generation throws", async () => {
    mockedComplete.mockRejectedValue(new Error("All AI providers failed"));

    mockedFindMany.mockResolvedValueOnce(
      Array(4).fill(null).map(() => poolRow(mcExercise)) as never,
    );

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 2,
    });

    expect(batch.source).toBe("db");
    expect(batch.exercises).toHaveLength(2);
    expect(mockedFindMany).toHaveBeenCalled();
  });

  it("falls back to hardcoded when both AI and pool fail", async () => {
    mockedComplete.mockRejectedValue(new Error("AI boom"));

    mockedFindMany.mockRejectedValueOnce(new Error("db also down"));

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 2,
    });

    expect(batch.source).toBe("fallback");
    expect(batch.exercises.length).toBeGreaterThan(0);
  });

  it("splits large requests into parallel chunks of at most 6", async () => {
    let n = 0;
    mockedComplete.mockImplementation(async (opts) => {
      const asked = Number(/Generate (\d+)/.exec(opts.messages[0].content)?.[1] ?? 1);
      const items = Array.from({ length: asked }, () => ({
        type: "true_false",
        statement: `S${n++}`,
        isTrue: true,
        explanation: "x",
      }));
      return aiText(JSON.stringify(asked === 1 ? items[0] : items));
    });

    const batch = await generateExercises({
      topicId: "en_pronouns",
      exerciseType: "true_false",
      count: 20,
    });

    expect(batch.source).toBe("ai");
    expect(batch.exercises).toHaveLength(20);
    expect(mockedComplete).toHaveBeenCalledTimes(4);
  });

  it("falls back to the pool when every AI fill-in is malformed", async () => {
    mockedComplete.mockResolvedValue(
      aiText(
        JSON.stringify({
          type: "fill_in_the_blank",
          sentence: "___ gave ___ the book.",
          correctAnswer: "She",
          explanation: "x",
        }),
      ),
    );
    mockedFindMany.mockResolvedValueOnce(
      Array(4).fill(null).map(() => poolRow(mcExercise)) as never,
    );

    const batch = await generateExercises({
      topicId: "de_articles",
      exerciseType: "multiple_choice",
      count: 1,
    });

    expect(batch.source).toBe("db");
  });
});
