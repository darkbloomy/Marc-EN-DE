import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/ai", () => ({ callTool: vi.fn() }));

import { callTool } from "@/lib/ai";
import {
  buildDictionaryPrompt,
  clearDictionaryCache,
  lookupWord,
  parseDictionaryEntry,
  targetLanguages,
} from "./dictionary";

const mockedCallTool = vi.mocked(callTool);

const hundRaw = {
  lemma: "Hund",
  partOfSpeech: "Noun",
  article: "der",
  plural: "die Hunde",
  senses: [
    { lang: "zh", translation: "狗", explanation: "一种常见的宠物。" },
    { lang: "en", translation: "dog", explanation: "A common pet that barks." },
  ],
  example: "Der Hund spielt im Garten.",
};

beforeEach(() => {
  mockedCallTool.mockReset();
  clearDictionaryCache();
});

describe("targetLanguages", () => {
  it("explains English words in German and Chinese", () => {
    expect(targetLanguages("en")).toEqual(["de", "zh"]);
  });
  it("explains German words in English and Chinese", () => {
    expect(targetLanguages("de")).toEqual(["en", "zh"]);
  });
});

describe("buildDictionaryPrompt", () => {
  it("includes the word, sentence and target languages", () => {
    const prompt = buildDictionaryPrompt({
      word: "bank",
      language: "en",
      context: "We sat on the bank of the river.",
    });
    expect(prompt).toContain('"bank"');
    expect(prompt).toContain("We sat on the bank of the river.");
    expect(prompt).toContain('German (lang "de")');
    expect(prompt).toContain('Simplified Chinese (lang "zh")');
    expect(prompt).toContain("example sentence must be in English");
  });

  it("omits the sentence line without context", () => {
    expect(buildDictionaryPrompt({ word: "Hund", language: "de" })).not.toContain("Sentence");
  });
});

describe("parseDictionaryEntry", () => {
  it("orders senses by target language and keeps German noun info", () => {
    const entry = parseDictionaryEntry(hundRaw, "Hunde", "de");
    expect(entry.word).toBe("Hunde");
    expect(entry.partOfSpeech).toBe("noun");
    expect(entry.article).toBe("der");
    expect(entry.plural).toBe("die Hunde");
    expect(entry.senses.map((s) => s.lang)).toEqual(["en", "zh"]);
  });

  it("drops article/plural for English words and tolerates nulls", () => {
    const entry = parseDictionaryEntry(
      {
        lemma: "run",
        partOfSpeech: "verb",
        article: null,
        plural: null,
        example: null,
        senses: [
          { lang: "de", translation: "rennen", explanation: "Sich schnell bewegen." },
          { lang: "zh", translation: "跑", explanation: "快速地移动。" },
        ],
      },
      "ran",
      "en",
    );
    expect(entry).not.toHaveProperty("article");
    expect(entry).not.toHaveProperty("plural");
    expect(entry).not.toHaveProperty("example");
  });

  it("throws when a target language is missing", () => {
    expect(() =>
      parseDictionaryEntry({ ...hundRaw, senses: [hundRaw.senses[0], hundRaw.senses[0]] }, "Hund", "de"),
    ).toThrow(/English/);
  });
});

describe("lookupWord", () => {
  it("calls the AI once and serves repeats from cache", async () => {
    mockedCallTool.mockImplementation(async (opts) => ({
      input: opts.parse!(hundRaw),
      provider: "grok",
      model: "grok-x",
    }));

    const first = await lookupWord({ word: "Hund", language: "de", context: "Der Hund bellt." });
    expect(first.cached).toBe(false);
    expect(first.provider).toBe("grok");
    expect(first.entry.senses[0].translation).toBe("dog");

    const second = await lookupWord({ word: "Hund", language: "de", context: "Der Hund bellt." });
    expect(second.cached).toBe(true);
    expect(mockedCallTool).toHaveBeenCalledTimes(1);
    expect(mockedCallTool.mock.calls[0][0].prefer).toEqual(["qwen"]);
  });

  it("treats a different sentence as a separate lookup", async () => {
    mockedCallTool.mockImplementation(async (opts) => ({
      input: opts.parse!(hundRaw),
      provider: "grok",
      model: "grok-x",
    }));
    await lookupWord({ word: "Hund", language: "de", context: "A" });
    await lookupWord({ word: "Hund", language: "de", context: "B" });
    expect(mockedCallTool).toHaveBeenCalledTimes(2);
  });

  it("propagates AI failures", async () => {
    mockedCallTool.mockRejectedValueOnce(new Error("All AI providers failed"));
    await expect(lookupWord({ word: "Hund", language: "de" })).rejects.toThrow("All AI providers failed");
  });
});
