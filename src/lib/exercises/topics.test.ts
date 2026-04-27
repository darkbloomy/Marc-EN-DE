import { describe, it, expect } from "vitest";
import {
  ALL_TOPICS,
  getTopic,
  getTopicsByLanguage,
  getTopicsByCategory,
} from "./topics";

describe("topic registry", () => {
  it("has topics for both languages", () => {
    const de = getTopicsByLanguage("de");
    const en = getTopicsByLanguage("en");
    expect(de.length).toBeGreaterThan(0);
    expect(en.length).toBeGreaterThan(0);
  });

  it("all topics have required fields", () => {
    for (const topic of ALL_TOPICS) {
      expect(topic.id).toBeTruthy();
      expect(topic.labelDE).toBeTruthy();
      expect(topic.labelEN).toBeTruthy();
      expect(topic.category).toBeTruthy();
      expect(topic.language).toMatch(/^(de|en)$/);
      expect(topic.difficulty).toBeGreaterThanOrEqual(1);
      expect(topic.difficulty).toBeLessThanOrEqual(5);
      expect(topic.description).toBeTruthy();
    }
  });

  it("all topic IDs are unique", () => {
    const ids = ALL_TOPICS.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("getTopic returns correct topic by ID", () => {
    const topic = getTopic("de_noun_cases");
    expect(topic).toBeDefined();
    expect(topic?.language).toBe("de");
    expect(topic?.category).toBe("grammar");
  });

  it("getTopic returns undefined for unknown ID", () => {
    expect(getTopic("nonexistent")).toBeUndefined();
  });

  it("getTopicsByCategory filters correctly", () => {
    const deGrammar = getTopicsByCategory("de", "grammar");
    expect(deGrammar.length).toBeGreaterThan(0);
    expect(deGrammar.every((t) => t.language === "de" && t.category === "grammar")).toBe(true);
  });

  it("topic IDs are prefixed with language code", () => {
    for (const topic of ALL_TOPICS) {
      expect(topic.id.startsWith(topic.language + "_")).toBe(true);
    }
  });
});
