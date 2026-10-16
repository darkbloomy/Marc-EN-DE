import { describe, it, expect } from "vitest";
import {
  sentenceShape,
  answerKeyFromPayload,
  pickDiverseFromPool,
} from "./pool-pick";

function row(
  id: string,
  sentence: string,
  answer: string,
  difficulty: number,
) {
  return {
    id,
    difficulty,
    payload: JSON.stringify({
      type: "fill_in_the_blank",
      sentence,
      correctAnswer: answer,
      explanation: "e",
    }),
  };
}

describe("sentenceShape", () => {
  it("treats Das ist der/die/das frames as the same skeleton", () => {
    const a = sentenceShape("Das ist der Junge, ___ neben mir sitzt.");
    const b = sentenceShape("Das ist die Frau, ___ uns hilft.");
    expect(a).toBe(b);
  });

  it("distinguishes a fronted clause from a mid-clause blank", () => {
    const fronted = sentenceShape("___ du willst, können wir gehen.");
    const mid = sentenceShape("Ich rufe dich an, ___ ich zu Hause bin.");
    expect(fronted).not.toBe(mid);
    expect(fronted.startsWith("s:")).toBe(true);
    expect(mid.startsWith("m:")).toBe(true);
  });
});

describe("pickDiverseFromPool", () => {
  it("avoids repeating the same answer when alternatives exist", () => {
    const rows = [
      row("1", "We stay inside ___ it rains.", "if", 3),
      row("2", "Take a jacket ___ it gets cold.", "if", 3),
      row("3", "Call me ___ you arrive.", "when", 3),
      row("4", "I stayed home ___ I was tired.", "because", 3),
    ];
    const picked = pickDiverseFromPool(rows, 3, 3);
    const answers = picked.map((r) => answerKeyFromPayload(r.payload));
    expect(picked).toHaveLength(3);
    expect(new Set(answers).size).toBe(3);
  });

  it("prefers the target difficulty before filling from neighbours", () => {
    const rows = [
      row("d1", "Wait here ___ I come back.", "until", 1),
      row("d5", "He talks ___ he knew everything.", "as if", 5),
      row("d3a", "She left ___ she was tired.", "because", 3),
      row("d3b", "Read quietly ___ others work.", "while", 3),
    ];
    const picked = pickDiverseFromPool(rows, 2, 3);
    expect(picked.map((r) => r.id).sort()).toEqual(["d3a", "d3b"]);
  });

  it("still fills the count when answers must repeat", () => {
    const rows = [
      row("1", "Take a jacket ___ it gets cold.", "if", 2),
      row("2", "Cancel the picnic ___ it rains.", "if", 2),
      row("3", "Stay home ___ you feel ill.", "if", 2),
    ];
    const picked = pickDiverseFromPool(rows, 3, 2);
    expect(picked).toHaveLength(3);
  });
});
