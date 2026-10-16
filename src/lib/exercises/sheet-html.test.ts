import { describe, it, expect } from "vitest";
import type { GeneratedExercise } from "./types";
import {
  buildExerciseSheetHtml,
  buildSheetFilename,
  getSheetCorrectAnswer,
} from "./sheet-html";

function wrap(
  exercise: GeneratedExercise["exercise"],
  topic = "de_articles",
): GeneratedExercise {
  return {
    exercise,
    language: "de",
    category: "grammar",
    topic,
    difficulty: 2,
  };
}

const sampleSet: GeneratedExercise[] = [
  wrap({
    type: "multiple_choice",
    question: "Which article fits?",
    options: ["Der", "Die", "Das", "Den"],
    correctIndex: 0,
    explanation: "Hund is masculine.",
  }),
  wrap({
    type: "fill_in_the_blank",
    sentence: "Ich ___ zur Schule.",
    correctAnswer: "gehe",
    hint: "movement verb",
    explanation: "ich gehe",
  }),
  wrap({
    type: "true_false",
    statement: "All German nouns are capitalized.",
    isTrue: true,
    explanation: "Yes, nouns are capitalized.",
  }),
  wrap({
    type: "reorder",
    instruction: "Put the words in order.",
    scrambledItems: ["Schule", "gehe", "zur", "Ich"],
    correctOrder: ["Ich", "gehe", "zur", "Schule"],
    explanation: "Verb in second position.",
  }),
  wrap({
    type: "free_text",
    prompt: "Describe your pet in 2 sentences.",
    sampleAnswer: "I have a dog. He is friendly.",
    keyPoints: ["Names a pet", "Gives a detail"],
    explanation: "Mention a pet and a detail.",
  }),
];

describe("getSheetCorrectAnswer", () => {
  it("returns the correct option text for multiple choice", () => {
    expect(getSheetCorrectAnswer(sampleSet[0].exercise)).toBe("Der");
  });

  it("joins multi-blank fill answers", () => {
    expect(
      getSheetCorrectAnswer({
        type: "fill_in_the_blank",
        sentence: "___ Hund. Plural: die ___",
        correctAnswer: "der",
        blanks: [
          { correctAnswer: "der" },
          { correctAnswer: "Hunde" },
        ],
        explanation: "x",
      }),
    ).toBe("der | Hunde");
  });
});

describe("buildExerciseSheetHtml", () => {
  const html = buildExerciseSheetHtml(sampleSet, {
    title: "Daily Practice — German",
    language: "de",
    mode: "daily",
  });

  it("emits a standalone HTML document", () => {
    expect(html.startsWith("<!DOCTYPE html>")).toBe(true);
    expect(html).toContain("<title>Daily Practice — German</title>");
    expect(html).toContain("Answer Key");
  });

  it("includes worksheet stems for each exercise type", () => {
    expect(html).toContain("Which article fits?");
    expect(html).toContain("Ich ___ zur Schule.");
    expect(html).toContain("All German nouns are capitalized.");
    expect(html).toContain("Put the words in order.");
    expect(html).toContain("Describe your pet in 2 sentences.");
  });

  it("does not print hints under worksheet questions", () => {
    const worksheet = html.split("Answer Key")[0];
    expect(worksheet).not.toContain("Hint:");
    expect(worksheet).not.toContain("movement verb");
    expect(html).not.toMatch(/class="hint"/);
  });

  it("lists MC options on the worksheet without marking the correct one", () => {
    const worksheet = html.split("Answer Key")[0];
    expect(worksheet).toContain("Der");
    expect(worksheet).toContain("Die");
    // Must not reveal correctness on the worksheet
    expect(worksheet).not.toMatch(/correct(?:Index| answer)/i);
    expect(worksheet).not.toContain("Hund is masculine.");
  });

  it("puts answers and explanations only in the Answer Key section", () => {
    const key = html.split("Answer Key")[1];
    expect(key).toContain("Der");
    expect(key).toContain("gehe");
    expect(key).toContain("True");
    expect(key).toContain("Ich gehe zur Schule");
    expect(key).toContain("I have a dog. He is friendly.");
    expect(key).toContain("Hund is masculine.");
  });

  it("escapes HTML in user-facing strings", () => {
    const dangerous = buildExerciseSheetHtml(
      [
        wrap({
          type: "true_false",
          statement: '<script>alert("x")</script>',
          isTrue: false,
          explanation: "a < b",
        }),
      ],
      { title: "Test", language: "en" },
    );
    expect(dangerous).not.toContain("<script>");
    expect(dangerous).toContain("&lt;script&gt;");
    expect(dangerous).toContain("a &lt; b");
  });
});

describe("buildSheetFilename", () => {
  it("builds a dated filename", () => {
    const name = buildSheetFilename("drills", "de", new Date("2026-08-01T12:00:00Z"));
    expect(name).toBe("marc-drills-de-2026-08-01.html");
  });
});
