import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    exercise: {
      findMany: vi.fn(),
    },
  },
}));

import { generateExercises, parseExerciseResponse } from "./generate";
import { prisma } from "@/lib/prisma";

const mockedFindMany = vi.mocked(prisma.exercise.findMany);

function poolRow(payload: object) {
  return { payload: JSON.stringify(payload) };
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

describe("generateExercises (DB pool)", () => {
  it("returns exercises from the pool when exact difficulty matches", async () => {
    mockedFindMany.mockResolvedValueOnce(
      Array(5).fill(null).map(() => poolRow(mcExercise)) as never,
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
    expect(mockedFindMany).toHaveBeenCalledTimes(1);
    expect(mockedFindMany.mock.calls[0][0]?.where).toMatchObject({
      language: "de",
      topic: "de_articles",
      exerciseType: "multiple_choice",
      reviewStatus: "approved",
      difficulty: 2,
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
