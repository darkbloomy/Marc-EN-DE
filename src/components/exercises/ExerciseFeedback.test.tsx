import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExerciseFeedback } from "./ExerciseFeedback";

describe("ExerciseFeedback", () => {
  it("shows Chinese explanation only when incorrect", () => {
    render(
      <ExerciseFeedback
        isCorrect={false}
        explanation="English rule here."
        explanationCN="中文规则说明。"
        correctAnswer="cats"
        pointsEarned={0}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("English rule here.")).toBeInTheDocument();
    expect(screen.getByText("中文规则说明。")).toBeInTheDocument();
    expect(screen.getByText(/Correct answer/)).toBeInTheDocument();
  });

  it("hides Chinese explanation when correct", () => {
    render(
      <ExerciseFeedback
        isCorrect={true}
        explanation="English rule here."
        explanationCN="中文规则说明。"
        pointsEarned={15}
        onNext={vi.fn()}
      />,
    );
    expect(screen.getByText("English rule here.")).toBeInTheDocument();
    expect(screen.queryByText("中文规则说明。")).not.toBeInTheDocument();
  });
});
