import { describe, it, expect, beforeEach } from "vitest";
import { getCached, setCache, clearCache } from "./cache";
import type { ExerciseBatch } from "./types";

const mockBatch: ExerciseBatch = {
  exercises: [
    {
      exercise: {
        type: "true_false",
        statement: "Test statement",
        isTrue: true,
        explanation: "Test",
      },
      language: "de",
      category: "grammar",
      topic: "de_articles",
      difficulty: 2,
    },
  ],
  language: "de",
  topic: "de_articles",
  generatedAt: new Date().toISOString(),
  source: "ai",
};

describe("exercise cache", () => {
  beforeEach(() => {
    clearCache();
  });

  it("returns null for uncached key", () => {
    expect(getCached("nonexistent")).toBeNull();
  });

  it("stores and retrieves a batch", () => {
    setCache("test-key", mockBatch);
    const result = getCached("test-key");
    expect(result).toEqual(mockBatch);
  });

  it("clearCache removes all entries", () => {
    setCache("key1", mockBatch);
    setCache("key2", mockBatch);
    clearCache();
    expect(getCached("key1")).toBeNull();
    expect(getCached("key2")).toBeNull();
  });
});
