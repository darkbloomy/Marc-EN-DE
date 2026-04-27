"use client";

import { useState } from "react";
import { RotateCcw } from "lucide-react";
import type { ReorderExercise } from "@/lib/exercises/types";

interface ReorderProps {
  exercise: ReorderExercise;
  onAnswer: (isCorrect: boolean, userAnswer: string) => void;
  disabled?: boolean;
}

export function Reorder({
  exercise,
  onAnswer,
  disabled = false,
}: ReorderProps) {
  const [placedIndices, setPlacedIndices] = useState<number[]>([]);
  const [answered, setAnswered] = useState(false);

  const remainingIndices = exercise.scrambledItems
    .map((_, i) => i)
    .filter((i) => !placedIndices.includes(i));

  function handleTapAvailable(index: number) {
    if (answered || disabled) return;
    setPlacedIndices([...placedIndices, index]);
  }

  function handleTapPlaced(position: number) {
    if (answered || disabled) return;
    setPlacedIndices(placedIndices.filter((_, i) => i !== position));
  }

  function handleReset() {
    if (answered || disabled) return;
    setPlacedIndices([]);
  }

  function handleSubmit() {
    if (placedIndices.length !== exercise.scrambledItems.length) return;
    setAnswered(true);
    const userOrder = placedIndices.map((i) => exercise.scrambledItems[i]);
    const isCorrect =
      JSON.stringify(userOrder) === JSON.stringify(exercise.correctOrder);
    onAnswer(isCorrect, userOrder.join(" "));
  }

  const currentOrder = placedIndices.map((i) => exercise.scrambledItems[i]);

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-800 mb-2">
        {exercise.instruction}
      </h2>

      {/* Answer area — placed items */}
      <div className="min-h-[56px] bg-blue-50 rounded-xl border-2 border-dashed border-blue-200 p-3 mb-4 flex flex-wrap gap-2">
        {placedIndices.length === 0 ? (
          <span className="text-blue-300 text-sm italic">
            Tap words below to build your answer...
          </span>
        ) : (
          currentOrder.map((item, position) => (
            <button
              key={position}
              onClick={() => handleTapPlaced(position)}
              disabled={answered || disabled}
              className={`px-3 py-2 rounded-lg font-medium min-h-[40px] transition-all ${
                answered
                  ? item === exercise.correctOrder[position]
                    ? "bg-green-200 text-green-800 border border-green-300"
                    : "bg-red-200 text-red-800 border border-red-300"
                  : "bg-blue-200 text-blue-800 hover:bg-blue-300 cursor-pointer"
              }`}
            >
              {item}
            </button>
          ))
        )}
      </div>

      {/* Available items */}
      <div className="flex flex-wrap gap-2 mb-4">
        {remainingIndices.map((idx) => (
          <button
            key={idx}
            onClick={() => handleTapAvailable(idx)}
            disabled={answered || disabled}
            className="px-3 py-2 bg-gray-100 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-all min-h-[40px]"
          >
            {exercise.scrambledItems[idx]}
          </button>
        ))}
      </div>

      {/* Controls */}
      {!answered && (
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            disabled={placedIndices.length === 0 || disabled}
            className="flex items-center gap-1 px-4 py-2 text-gray-500 hover:text-gray-700 disabled:opacity-30 transition-colors"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={handleSubmit}
            disabled={
              placedIndices.length !== exercise.scrambledItems.length ||
              disabled
            }
            className="flex-1 py-3 px-4 bg-blue-600 text-white font-semibold rounded-xl text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Check Answer
          </button>
        </div>
      )}
    </div>
  );
}
