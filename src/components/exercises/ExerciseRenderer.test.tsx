import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MultipleChoice } from "./MultipleChoice";
import { FillInTheBlank } from "./FillInTheBlank";
import { TrueFalse } from "./TrueFalse";
import { FreeText } from "./FreeText";
import { Reorder } from "./Reorder";
import { ExerciseFeedback } from "./ExerciseFeedback";
import type {
  MultipleChoiceExercise,
  FillInTheBlankExercise,
  TrueFalseExercise,
  FreeTextExercise,
  ReorderExercise,
} from "@/lib/exercises/types";

describe("MultipleChoice", () => {
  const exercise: MultipleChoiceExercise = {
    type: "multiple_choice",
    question: "What is 2 + 2?",
    options: ["3", "4", "5", "6"],
    correctIndex: 1,
    explanation: "2 + 2 = 4",
  };

  it("renders question and all options", () => {
    render(<MultipleChoice exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText("What is 2 + 2?")).toBeInTheDocument();
    expect(screen.getByText(/^3$/)).toBeInTheDocument();
    expect(screen.getByText(/^4$/)).toBeInTheDocument();
    expect(screen.getByText(/^5$/)).toBeInTheDocument();
    expect(screen.getByText(/^6$/)).toBeInTheDocument();
  });

  it("calls onAnswer with correct=true when right option selected", () => {
    const onAnswer = vi.fn();
    render(<MultipleChoice exercise={exercise} onAnswer={onAnswer} />);
    // Click the correct answer "4"
    fireEvent.click(screen.getByText(/^4$/));
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(true, "4");
  });

  it("calls onAnswer with correct=false when wrong option selected", () => {
    const onAnswer = vi.fn();
    render(<MultipleChoice exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText(/^3$/));
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(false, "3");
  });

  it("disables submit button when no option selected", () => {
    render(<MultipleChoice exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText("Check Answer")).toBeDisabled();
  });
});

describe("FillInTheBlank", () => {
  const exercise: FillInTheBlankExercise = {
    type: "fill_in_the_blank",
    sentence: "The cat ___ on the mat.",
    correctAnswer: "sits",
    acceptableAnswers: ["sat"],
    hint: "A verb meaning to be seated",
    explanation: "Sits is the correct verb.",
  };

  it("renders sentence parts", () => {
    render(<FillInTheBlank exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText(/The cat/)).toBeInTheDocument();
    expect(screen.getByText(/on the mat/)).toBeInTheDocument();
  });

  it("calls onAnswer with correct=true for exact match", () => {
    const onAnswer = vi.fn();
    render(<FillInTheBlank exercise={exercise} onAnswer={onAnswer} />);
    const input = screen.getByPlaceholderText("...");
    fireEvent.change(input, { target: { value: "sits" } });
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(true, "sits");
  });

  it("calls onAnswer with correct=true for acceptable answer", () => {
    const onAnswer = vi.fn();
    render(<FillInTheBlank exercise={exercise} onAnswer={onAnswer} />);
    const input = screen.getByPlaceholderText("...");
    fireEvent.change(input, { target: { value: "sat" } });
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(true, "sat");
  });

  it("shows hint when hint button clicked", () => {
    render(<FillInTheBlank exercise={exercise} onAnswer={vi.fn()} />);
    fireEvent.click(screen.getByText("Show hint"));
    expect(screen.getByText("A verb meaning to be seated")).toBeInTheDocument();
  });
});

describe("TrueFalse", () => {
  const exercise: TrueFalseExercise = {
    type: "true_false",
    statement: "The sky is blue.",
    isTrue: true,
    explanation: "The sky appears blue due to light scattering.",
  };

  it("renders the statement", () => {
    render(<TrueFalse exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText(/The sky is blue/)).toBeInTheDocument();
  });

  it("calls onAnswer correctly for True", () => {
    const onAnswer = vi.fn();
    render(<TrueFalse exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("True"));
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(true, "true");
  });

  it("calls onAnswer correctly for False (wrong)", () => {
    const onAnswer = vi.fn();
    render(<TrueFalse exercise={exercise} onAnswer={onAnswer} />);
    fireEvent.click(screen.getByText("False"));
    fireEvent.click(screen.getByText("Check Answer"));
    expect(onAnswer).toHaveBeenCalledWith(false, "false");
  });
});

describe("FreeText", () => {
  const exercise: FreeTextExercise = {
    type: "free_text",
    prompt: "Describe your pet.",
    sampleAnswer: "I have a dog named Max.",
    keyPoints: ["Names a pet", "Uses complete sentence"],
    explanation: "Good answers name a pet.",
  };

  it("renders prompt", () => {
    render(<FreeText exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText("Describe your pet.")).toBeInTheDocument();
  });

  it("shows sample answer after submission", () => {
    const onAnswer = vi.fn();
    render(<FreeText exercise={exercise} onAnswer={onAnswer} />);
    const textarea = screen.getByPlaceholderText("Write your answer here...");
    fireEvent.change(textarea, { target: { value: "I have a cat." } });
    fireEvent.click(screen.getByText("Submit"));
    expect(onAnswer).toHaveBeenCalledWith(true, "I have a cat.");
    expect(screen.getByText("I have a dog named Max.")).toBeInTheDocument();
  });
});

describe("Reorder", () => {
  const exercise: ReorderExercise = {
    type: "reorder",
    instruction: "Put the words in order.",
    scrambledItems: ["cat", "the", "sat"],
    correctOrder: ["the", "cat", "sat"],
    explanation: "The cat sat.",
  };

  it("renders instruction and all scrambled items", () => {
    render(<Reorder exercise={exercise} onAnswer={vi.fn()} />);
    expect(screen.getByText("Put the words in order.")).toBeInTheDocument();
    expect(screen.getByText("cat")).toBeInTheDocument();
    expect(screen.getByText("the")).toBeInTheDocument();
    expect(screen.getByText("sat")).toBeInTheDocument();
  });
});

describe("ExerciseFeedback", () => {
  it("shows correct styling and points", () => {
    render(
      <ExerciseFeedback
        isCorrect={true}
        explanation="Well done!"
        pointsEarned={10}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByText("Correct!")).toBeInTheDocument();
    expect(screen.getByText("+10 pts")).toBeInTheDocument();
    expect(screen.getByText("Well done!")).toBeInTheDocument();
  });

  it("shows incorrect styling with correct answer", () => {
    render(
      <ExerciseFeedback
        isCorrect={false}
        explanation="Better luck next time."
        correctAnswer="42"
        pointsEarned={0}
        onNext={vi.fn()}
      />
    );
    expect(screen.getByText("Not quite!")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("calls onNext when Next button clicked", () => {
    const onNext = vi.fn();
    render(
      <ExerciseFeedback
        isCorrect={true}
        explanation="OK"
        pointsEarned={5}
        onNext={onNext}
      />
    );
    fireEvent.click(screen.getByText("Next"));
    expect(onNext).toHaveBeenCalled();
  });
});
