import { describe, it, expect } from "vitest";
import type { ReactElement } from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { SessionSummary } from "./SessionSummary";
import { ProfileProvider } from "@/contexts/ProfileContext";
import type { GeneratedExercise } from "@/lib/exercises/types";

const profile = { id: "prof_1", name: "Marc", avatarId: "fox" };

function wrap(ui: ReactElement) {
  return <ProfileProvider profile={profile}>{ui}</ProfileProvider>;
}

const exercises: GeneratedExercise[] = [
  {
    exercise: {
      type: "fill_in_the_blank",
      sentence: "Ich bleibe, ___ es regnet.",
      correctAnswer: "weil",
      explanation: "weil gives the reason.",
      explanationCN: "weil 表示原因。",
    },
    language: "de",
    category: "grammar",
    topic: "de_drill_adverbial",
    difficulty: 2,
  },
  {
    exercise: {
      type: "multiple_choice",
      question: "Das ist der Junge, ___ ich kenne.",
      options: ["der", "den", "dem", "dessen"],
      correctIndex: 1,
      explanation: "Accusative: den.",
      explanationCN: "宾格用 den。",
    },
    language: "de",
    category: "grammar",
    topic: "de_drill_relative",
    difficulty: 2,
  },
];

describe("SessionSummary review", () => {
  it("shows question, user answer, and correct answer for missed items", () => {
    render(
      wrap(
        <SessionSummary
          results={[
            { isCorrect: false, userAnswer: "wenn", pointsEarned: 0 },
            { isCorrect: true, userAnswer: "den", pointsEarned: 10 },
          ]}
          exercises={exercises}
          onPracticeAgain={() => undefined}
        />,
      ),
    );

    expect(screen.getByText("Ich bleibe, ___ es regnet.")).toBeInTheDocument();
    expect(screen.getByText("wenn")).toBeInTheDocument();
    expect(screen.getByText("weil")).toBeInTheDocument();
    expect(screen.getByText("weil gives the reason.")).toBeInTheDocument();
    expect(screen.getByText("weil 表示原因。")).toBeInTheDocument();

    expect(
      screen.getByText("Das ist der Junge, ___ ich kenne."),
    ).toBeInTheDocument();
    expect(screen.getByText("den")).toBeInTheDocument();
  });

  it("filters to wrong items only", () => {
    render(
      wrap(
        <SessionSummary
          results={[
            { isCorrect: false, userAnswer: "wenn", pointsEarned: 0 },
            { isCorrect: true, userAnswer: "den", pointsEarned: 10 },
          ]}
          exercises={exercises}
          onPracticeAgain={() => undefined}
        />,
      ),
    );

    fireEvent.click(screen.getByRole("button", { name: /Wrong/ }));
    expect(screen.getByText("Ich bleibe, ___ es regnet.")).toBeInTheDocument();
    expect(
      screen.queryByText("Das ist der Junge, ___ ich kenne."),
    ).not.toBeInTheDocument();
  });
});
