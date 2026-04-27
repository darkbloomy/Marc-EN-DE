"use client";

import { useState } from "react";
import type { Exercise, GeneratedExercise } from "@/lib/exercises/types";
import { POINTS_PER_TYPE } from "@/lib/exercises/types";
import { ExerciseShell } from "./ExerciseShell";
import { ExerciseFeedback } from "./ExerciseFeedback";
import { MultipleChoice } from "./MultipleChoice";
import { FillInTheBlank } from "./FillInTheBlank";
import { TrueFalse } from "./TrueFalse";
import { Reorder } from "./Reorder";
import { FreeText } from "./FreeText";

interface ExerciseResult {
  isCorrect: boolean;
  userAnswer: string;
  pointsEarned: number;
}

interface ExerciseRendererProps {
  exercises: GeneratedExercise[];
  onComplete: (results: ExerciseResult[]) => void;
}

export function ExerciseRenderer({
  exercises,
  onComplete,
}: ExerciseRendererProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [results, setResults] = useState<ExerciseResult[]>([]);
  const [currentResult, setCurrentResult] = useState<ExerciseResult | null>(
    null
  );

  const current = exercises[currentIndex];
  if (!current) return null;

  function handleAnswer(isCorrect: boolean, userAnswer: string) {
    const pointsEarned = isCorrect
      ? POINTS_PER_TYPE[current.exercise.type]
      : 0;
    setCurrentResult({ isCorrect, userAnswer, pointsEarned });
  }

  function handleNext() {
    if (!currentResult) return;

    const newResults = [...results, currentResult];
    setResults(newResults);
    setCurrentResult(null);

    if (currentIndex + 1 >= exercises.length) {
      onComplete(newResults);
    } else {
      setCurrentIndex(currentIndex + 1);
    }
  }

  function getCorrectAnswer(exercise: Exercise): string | undefined {
    switch (exercise.type) {
      case "multiple_choice":
        return exercise.options[exercise.correctIndex];
      case "fill_in_the_blank":
        return exercise.correctAnswer;
      case "true_false":
        return exercise.isTrue ? "True" : "False";
      case "reorder":
        return exercise.correctOrder.join(" ");
      case "free_text":
        return undefined; // No single correct answer
    }
  }

  return (
    <ExerciseShell
      currentIndex={currentIndex}
      totalCount={exercises.length}
    >
      <ExerciseContent
        exercise={current.exercise}
        onAnswer={handleAnswer}
        disabled={currentResult !== null}
      />

      {currentResult && (
        <ExerciseFeedback
          isCorrect={currentResult.isCorrect}
          explanation={current.exercise.explanation}
          correctAnswer={
            !currentResult.isCorrect
              ? getCorrectAnswer(current.exercise)
              : undefined
          }
          pointsEarned={currentResult.pointsEarned}
          onNext={handleNext}
        />
      )}
    </ExerciseShell>
  );
}

function ExerciseContent({
  exercise,
  onAnswer,
  disabled,
}: {
  exercise: Exercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled: boolean;
}) {
  switch (exercise.type) {
    case "multiple_choice":
      return (
        <MultipleChoice
          exercise={exercise}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case "fill_in_the_blank":
      return (
        <FillInTheBlank
          exercise={exercise}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case "true_false":
      return (
        <TrueFalse
          exercise={exercise}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case "reorder":
      return (
        <Reorder
          exercise={exercise}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
    case "free_text":
      return (
        <FreeText
          exercise={exercise}
          onAnswer={onAnswer}
          disabled={disabled}
        />
      );
  }
}
