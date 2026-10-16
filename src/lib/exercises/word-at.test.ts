import { describe, it, expect } from "vitest";
import { extractWordAt } from "./word-at";

describe("extractWordAt", () => {
  const s = "Die Mädchen spielen Fußball.";

  it("finds the word around the offset", () => {
    expect(extractWordAt(s, 0)).toBe("Die");
    expect(extractWordAt(s, 6)).toBe("Mädchen");
    expect(extractWordAt(s, 22)).toBe("Fußball");
  });

  it("uses the previous word when the caret sits right after it", () => {
    expect(extractWordAt(s, 3)).toBe("Die");
    expect(extractWordAt(s, s.length - 1)).toBe("Fußball");
  });

  it("returns null on spaces between words and on punctuation runs", () => {
    expect(extractWordAt("a  b", 2)).toBeNull();
    expect(extractWordAt("Hi ... there", 5)).toBeNull();
  });

  it("keeps apostrophes and hyphens inside words but trims them at the edges", () => {
    expect(extractWordAt("I don't know", 4)).toBe("don't");
    expect(extractWordAt("a well-known fact", 4)).toBe("well-known");
    expect(extractWordAt("'quoted'", 3)).toBe("quoted");
  });

  it("ignores the ___ blank and number tokens", () => {
    expect(extractWordAt("Ich ___ nach Hause.", 5)).toBeNull();
    expect(extractWordAt("It costs 25 euros", 10)).toBeNull();
  });

  it("ignores Chinese text", () => {
    expect(extractWordAt("这是狗", 1)).toBeNull();
  });

  it("handles empty text and out-of-range offsets", () => {
    expect(extractWordAt("", 0)).toBeNull();
    expect(extractWordAt("Hund", 99)).toBe("Hund");
    expect(extractWordAt("Hund", -5)).toBe("Hund");
  });
});
