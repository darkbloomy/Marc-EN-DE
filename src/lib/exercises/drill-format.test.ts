import { describe, it, expect } from "vitest";
import type { FillInTheBlankExercise, GeneratedExercise } from "./types";
import {
  applyRandomDrillFormat,
  clampChoicePercent,
  fillToMultipleChoice,
} from "./drill-format";

const fill = (
  sentence: string,
  answer: string,
  extra?: Partial<FillInTheBlankExercise>,
): FillInTheBlankExercise => ({
  type: "fill_in_the_blank",
  sentence,
  correctAnswer: answer,
  explanation: "why",
  explanationCN: "原因",
  ...extra,
});

function wrap(ex: FillInTheBlankExercise, id: string): GeneratedExercise {
  return {
    exercise: ex,
    language: "de",
    category: "grammar",
    topic: "de_drill_adverbial",
    difficulty: 2,
    poolId: id,
    contentHash: `hash-${id}`,
    source: "db",
  };
}

describe("fillToMultipleChoice", () => {
  const bank = ["weil", "wenn", "als", "obwohl", "damit"];

  it("builds 4 shuffled options and a matching correctIndex", () => {
    const rng = (() => {
      const seq = [0.1, 0.9, 0.2, 0.8, 0.3, 0.7];
      let i = 0;
      return () => seq[i++ % seq.length];
    })();
    const mc = fillToMultipleChoice(
      fill("Ich bleibe, ___ es regnet.", "weil"),
      bank,
      rng,
    );
    expect(mc).not.toBeNull();
    expect(mc!.options).toHaveLength(4);
    expect(new Set(mc!.options).size).toBe(4);
    expect(mc!.options[mc!.correctIndex]).toBe("weil");
    expect(mc!.question).toBe("Ich bleibe, ___ es regnet.");
    expect(mc!.explanation).toBe("why");
    expect(mc!.explanationCN).toBe("原因");
  });

  it("returns null when fewer than 3 distinct distractors exist", () => {
    expect(
      fillToMultipleChoice(fill("___ es regnet.", "weil"), ["weil", "WENN"]),
    ).toBeNull();
  });

  it("does not use acceptableAnswers as distractors", () => {
    const mc = fillToMultipleChoice(
      fill("Es regnete, ___ wir nass wurden.", "sodass", {
        acceptableAnswers: ["so dass"],
      }),
      ["so dass", "SO DASS", "weil", "wenn", "als", "obwohl"],
    );
    expect(mc).not.toBeNull();
    expect(mc!.options.map((o) => o.toLowerCase())).not.toContain("so dass");
  });

  it("prefers conjunction distractors over verb-final answers", () => {
    const mc = fillToMultipleChoice(
      fill("Wir üben leise, ___ die Nachbarn schlafen können.", "damit"),
      ["waschen", "war", "fängt", "obwohl", "wenn", "bevor", "als"],
    );
    expect(mc).not.toBeNull();
    expect(mc!.options).toEqual(expect.arrayContaining(["damit"]));
    for (const opt of mc!.options) {
      expect(["waschen", "war", "fängt"]).not.toContain(opt);
    }
  });

  it("joins multi-blank answers into one option", () => {
    const mc = fillToMultipleChoice(
      fill("Singular: ___ Hund. Plural: die ___", "der", {
        blanks: [
          { correctAnswer: "der" },
          { correctAnswer: "Hunde" },
        ],
      }),
      ["die | Katzen", "das | Bücher", "der | Tische", "die | Frauen"],
    );
    expect(mc).not.toBeNull();
    expect(mc!.options[mc!.correctIndex]).toBe("der | Hunde");
  });
});

describe("clampChoicePercent", () => {
  it("clamps to 0–100 and rounds", () => {
    expect(clampChoicePercent(-10)).toBe(0);
    expect(clampChoicePercent(130)).toBe(100);
    expect(clampChoicePercent(30.4)).toBe(30);
    expect(clampChoicePercent(Number.NaN)).toBe(50);
  });
});

describe("applyRandomDrillFormat", () => {
  const bank = ["weil", "wenn", "als", "obwohl", "damit", "falls"];
  const items = [
    wrap(fill("A ___", "weil"), "1"),
    wrap(fill("B ___", "wenn"), "2"),
    wrap(fill("C ___", "als"), "3"),
    wrap(fill("D ___", "obwohl"), "4"),
    wrap(fill("E ___", "damit"), "5"),
    wrap(fill("F ___", "falls"), "6"),
    wrap(fill("G ___", "weil"), "7"),
    wrap(fill("H ___", "wenn"), "8"),
    wrap(fill("I ___", "als"), "9"),
    wrap(fill("J ___", "obwohl"), "10"),
  ];

  it("converts every fill-in at 100%", () => {
    const out = applyRandomDrillFormat(items.slice(0, 2), bank, () => 0, 100);
    expect(out.every((x) => x.exercise.type === "multiple_choice")).toBe(
      true,
    );
    expect(out[0].poolId).toBe("1");
    expect(out[0].contentHash).toBe("hash-1");
  });

  it("keeps every fill-in at 0%", () => {
    const out = applyRandomDrillFormat(items, bank, () => 0, 0);
    expect(out.every((x) => x.exercise.type === "fill_in_the_blank")).toBe(
      true,
    );
  });

  it("converts about 30% of a 10-item set", () => {
    const out = applyRandomDrillFormat(items, bank, () => 0, 30);
    const mc = out.filter((x) => x.exercise.type === "multiple_choice");
    const fill = out.filter((x) => x.exercise.type === "fill_in_the_blank");
    expect(mc).toHaveLength(3);
    expect(fill).toHaveLength(7);
  });

  it("converts half of a 10-item set at 50%", () => {
    const out = applyRandomDrillFormat(items, bank, () => 0, 50);
    expect(
      out.filter((x) => x.exercise.type === "multiple_choice"),
    ).toHaveLength(5);
  });
});
