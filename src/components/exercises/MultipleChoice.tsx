"use client";

import { useState } from "react";
import type { MultipleChoiceExercise } from "@/lib/exercises/types";

interface MultipleChoiceProps {
  exercise: MultipleChoiceExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

export function MultipleChoice({
  exercise,
  onAnswer,
  disabled = false,
}: MultipleChoiceProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);

  function handleSubmit() {
    if (selectedIndex === null) return;
    setAnswered(true);
    const isCorrect = selectedIndex === exercise.correctIndex;
    onAnswer(isCorrect, exercise.options[selectedIndex]);
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-4">
        {exercise.question}
      </h2>

      <div className="space-y-3">
        {exercise.options.map((option, index) => {
          let buttonStyle =
            "bg-gray-50 border-gray-200 text-gray-800 hover:bg-gray-100";

          if (answered) {
            if (index === exercise.correctIndex) {
              buttonStyle =
                "bg-green-100 border-green-400 text-green-800";
            } else if (
              index === selectedIndex &&
              index !== exercise.correctIndex
            ) {
              buttonStyle = "bg-red-100 border-red-400 text-red-800";
            } else {
              buttonStyle =
                "bg-gray-50 border-gray-200 text-gray-400";
            }
          } else if (index === selectedIndex) {
            buttonStyle =
              "bg-blue-100 border-blue-400 text-blue-800 ring-2 ring-blue-300";
          }

          return (
            <button
              key={index}
              onClick={() => !answered && !disabled && setSelectedIndex(index)}
              disabled={answered || disabled}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 transition-all min-h-[48px] ${buttonStyle}`}
            >
              <span className="font-medium mr-2">
                {String.fromCharCode(65 + index)}.
              </span>
              {option}
            </button>
          );
        })}
      </div>

      {!answered && (
        <button
          onClick={handleSubmit}
          disabled={selectedIndex === null || disabled}
          className="mt-4 w-full py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Check Answer
        </button>
      )}
    </div>
  );
}
