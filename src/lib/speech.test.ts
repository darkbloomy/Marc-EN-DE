import { describe, it, expect } from "vitest";
import { isSpeechLang, mergeTranscript, speechErrorMessage } from "./speech";

describe("mergeTranscript", () => {
  it("uses the spoken text when nothing was typed", () => {
    expect(mergeTranscript("", " hello there ", "en-US")).toBe("hello there");
  });

  it("adds a space between typed and spoken text in German / English", () => {
    expect(mergeTranscript("Ich möchte", "Relativsätze üben", "de-DE")).toBe(
      "Ich möchte Relativsätze üben",
    );
    expect(mergeTranscript("Make ", "ten exercises", "en-US")).toBe("Make ten exercises");
  });

  it("joins Chinese without a space", () => {
    expect(mergeTranscript("我需要", "练习人称代词", "zh-CN")).toBe("我需要练习人称代词");
  });

  it("keeps a space between German text and following Chinese", () => {
    expect(mergeTranscript("Relativsätze", "是什么", "zh-CN")).toBe("Relativsätze 是什么");
  });

  it("keeps the typed text when nothing was recognised", () => {
    expect(mergeTranscript("typed", "  ", "en-US")).toBe("typed");
  });
});

describe("speechErrorMessage", () => {
  it("stays silent when the user stopped it", () => {
    expect(speechErrorMessage("aborted", "en-US")).toBeNull();
  });

  it("explains blocked permissions and unsupported languages", () => {
    expect(speechErrorMessage("not-allowed", "en-US")).toMatch(/blocked/);
    expect(speechErrorMessage("language-not-supported", "de-DE")).toMatch(/Deutsch/);
  });
});

describe("isSpeechLang", () => {
  it("accepts only the three supported codes", () => {
    expect(isSpeechLang("de-DE")).toBe(true);
    expect(isSpeechLang("fr-FR")).toBe(false);
    expect(isSpeechLang(null)).toBe(false);
  });
});
